import { supabase } from '@/infrastructure/supabase/client';
import type { Database } from '@/infrastructure/supabase/database.types';

type IntentPrimitive = Database['public']['Enums']['intent_primitive'];
type ReachLevel = Database['public']['Enums']['reach_level'];

/**
 * Privacy-safe view models. Screens receive these, never a raw database row,
 * so a schema change cannot silently widen what a screen renders.
 */
export type FeedCard = {
  id: string;
  primitiveLabel: string;
  statement: string;
  approximatePlace: string | null;
  expiresAt: string;
  reasonText: string;
  responseAction: string;
  confirmationCount: number;
};

export type IntentDetail = FeedCard & {
  startsAt: string | null;
  deadlineAt: string | null;
  broadcasterFirstName: string | null;
  isOwn: boolean;
  /** Present only for the broadcaster and the accepted participant. */
  matchId: string | null;
  /** For the owner: all responses. For a respondent: only their own. */
  responseCount: number;
};

export const PRIMITIVE_LABELS: Record<IntentPrimitive, string> = {
  request: 'I need',
  offer: 'I offer',
  plan: 'I want to',
};

export type QueryResult<T> =
  | { state: 'ok'; data: T }
  | { state: 'error'; message: string };

const READ_ERROR = 'We could not load this right now. Check your connection and try again.';

/**
 * The For You feed. Finite by construction: it returns only intents already
 * delivered to this user, each with the stored human-readable reason, and it
 * is capped rather than paged endlessly.
 */
export async function fetchFeed(limit = 25): Promise<QueryResult<FeedCard[]>> {
  const { data, error } = await supabase
    .from('intent_deliveries')
    .select(
      `reason_text,
       intents!inner (
         id, primitive, statement, expires_at, response_action, status,
         intent_context ( approximate_place ),
         intent_confirmations ( intent_id )
       )`,
    )
    .is('hidden_at', null)
    .eq('intents.status', 'live')
    .gt('intents.expires_at', new Date().toISOString())
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error) return { state: 'error', message: READ_ERROR };

  const cards = (data ?? []).flatMap((row): FeedCard[] => {
    const intent = row.intents;
    if (!intent) return [];
    const context = Array.isArray(intent.intent_context)
      ? intent.intent_context[0]
      : intent.intent_context;
    return [
      {
        id: intent.id,
        primitiveLabel: PRIMITIVE_LABELS[intent.primitive],
        statement: intent.statement,
        approximatePlace: context?.approximate_place ?? null,
        expiresAt: intent.expires_at,
        reasonText: row.reason_text,
        responseAction: intent.response_action,
        confirmationCount: intent.intent_confirmations?.length ?? 0,
      },
    ];
  });

  return { state: 'ok', data: cards };
}

export async function fetchIntentDetail(
  intentId: string,
  viewerId: string | null,
): Promise<QueryResult<IntentDetail | null>> {
  const { data, error } = await supabase
    .from('intents')
    .select(
      `id, primitive, statement, expires_at, response_action, broadcaster_id,
       intent_context ( approximate_place, starts_at, deadline_at ),
       intent_confirmations ( intent_id ),
       intent_deliveries ( reason_text ),
       matches ( id ),
       responses ( id ),
       profiles ( display_name )`,
    )
    .eq('id', intentId)
    .maybeSingle();

  if (error) return { state: 'error', message: READ_ERROR };
  if (!data) return { state: 'ok', data: null };

  const context = Array.isArray(data.intent_context)
    ? data.intent_context[0]
    : data.intent_context;
  const delivery = data.intent_deliveries?.[0];
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  return {
    state: 'ok',
    data: {
      id: data.id,
      primitiveLabel: PRIMITIVE_LABELS[data.primitive],
      statement: data.statement,
      approximatePlace: context?.approximate_place ?? null,
      startsAt: context?.starts_at ?? null,
      deadlineAt: context?.deadline_at ?? null,
      expiresAt: data.expires_at,
      reasonText: delivery?.reason_text ?? '',
      responseAction: data.response_action,
      confirmationCount: data.intent_confirmations?.length ?? 0,
      broadcasterFirstName: profile?.display_name?.split(' ')[0] ?? null,
      isOwn: data.broadcaster_id === viewerId,
      matchId: data.matches?.id ?? null,
      responseCount: data.responses?.length ?? 0,
    },
  };
}

export type PublishInput = {
  primitive: IntentPrimitive;
  statement: string;
  responseAction: string;
  expiresAt: string;
  approximatePlace: string | null;
  reach: ReachLevel;
  publicLinkEnabled: boolean;
  showFirstName: boolean;
  idempotencyKey: string;
};

export type PublishResult =
  | { state: 'ok'; intentId: string; shareSlug: string }
  | { state: 'error'; message: string };

/**
 * Creates the draft and publishes it through the server transaction. The draft
 * rows are written client-side because policy permits it only while the intent
 * is a draft; every transition after that is server-owned.
 */
export async function publishIntent(input: PublishInput): Promise<PublishResult> {
  const draft = await supabase
    .from('intents')
    .insert({
      primitive: input.primitive,
      statement: input.statement.trim(),
      response_action: input.responseAction,
      expires_at: input.expiresAt,
      broadcaster_id: (await supabase.auth.getUser()).data.user?.id ?? '',
    })
    .select('id')
    .single();

  if (draft.error || !draft.data) {
    return { state: 'error', message: 'Your intent was not published. Try again.' };
  }

  if (input.approximatePlace) {
    const context = await supabase
      .from('intent_context')
      .upsert({ intent_id: draft.data.id, approximate_place: input.approximatePlace });
    if (context.error) {
      return { state: 'error', message: 'Your intent was not published. Try again.' };
    }
  }

  const published = await supabase.rpc('publish_intent', {
    draft_intent_id: draft.data.id,
    expected_version: 1,
    target_reach: input.reach,
    enable_public_link: input.publicLinkEnabled,
    show_first_name: input.showFirstName,
    idempotency_key: input.idempotencyKey,
  });

  if (published.error || !published.data) {
    return { state: 'error', message: 'Your intent was not published. Try again.' };
  }

  // Origin-only intents travel through the share link alone. Any wider reach
  // was explicitly chosen on the review screen, so delivery generation here is
  // an informed user action, never an automatic expansion. A generation
  // failure must not fail the publish: the intent is live either way, and the
  // owner can retry from the dashboard.
  if (input.reach !== 'origin_only') {
    await supabase.rpc('generate_deliveries', { target_intent_id: published.data.id });
  }

  return {
    state: 'ok',
    intentId: published.data.id,
    shareSlug: published.data.share_slug,
  };
}

export async function fetchPublicIntent(shareSlug: string) {
  const { data, error } = await supabase.rpc('get_public_intent', {
    requested_share_slug: shareSlug,
  });
  if (error) return { state: 'error' as const, message: READ_ERROR };
  return { state: 'ok' as const, data: data?.[0] ?? null };
}
