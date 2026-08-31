/**
 * The casts data layer, when a backend is configured.
 *
 * Same two-mode contract as `features/auth/auth.ts`: the screens never
 * learn which mode they are in. With no `EXPO_PUBLIC_SUPABASE_URL` the
 * store keeps its fixture behaviour and none of this runs; with one,
 * every function here is the real path.
 *
 * Two rules shape this file:
 *
 *  - The delivery reason is READ, never computed. The device is not
 *    allowed to invent why a cast reached it — `my_feed()` generated
 *    that sentence from the signals that actually fired and stored it
 *    on the delivery row, and this only renders what came back. A
 *    reason computed here would be a reason nobody could audit.
 *
 *  - Nothing writes `intents` directly. Publishing sets a status the
 *    RLS policy deliberately forbids the owner from setting by hand,
 *    so it goes through `publish_cast`.
 */

import type { PosterData } from '@/design-system/components/poster';
import { category as categoryTokens, type Category } from '@/design-system/tokens';
import { getSupabase } from '@/infrastructure/supabase/client';
import type { CastDetail } from './fixtures';
import { DEFAULT_RADIUS_KM } from './domain/geo';
import { distanceLabel } from './domain/distance';

export type RemoteFeedRow = {
  intent_id: string;
  category: string;
  statement: string;
  area: string | null;
  starts_at: string | null;
  expires_at: string;
  caster_id: string;
  caster_first_name: string | null;
  reason_text: string | null;
  signals: string[] | null;
  score: number | null;
  /** metres from the viewer's nearest approved area, rounded to 50 m server-side */
  distance_m: number | null;
};

export type PublishInput = {
  category: Category;
  text: string;
  area: string;
  /** the area's approximate centre. null when the picker could not place it. */
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  /** when the plan starts, or null for "whenever" */
  startsAt: Date | null;
  /** local expiry already decided by the compose screen */
  expiresAt: Date;
};

/** true when the app is talking to a real backend. */
export function remoteEnabled(): boolean {
  return getSupabase() !== null;
}

/**
 * The coarse window a delivery signal can match, derived from the
 * LOCAL start time. Computed on the device on purpose: the server has
 * no idea what timezone the plan is in, and guessing one would put a
 * weekday evening in the middle of someone's night.
 */
export function coarseWindow(startsAt: Date | null): string | null {
  if (!startsAt) return null;
  const day = startsAt.getDay();
  const kind = day === 0 || day === 6 ? 'weekend' : 'weekday';
  const hour = startsAt.getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
  return `${kind}-${part}`;
}

/** how "gone 10pm" style copy is rebuilt from a stored timestamp. */
export function expiryLabel(expiresAt: string): string {
  const when = new Date(expiresAt);
  const hours = Math.round((when.getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return 'gone';
  if (hours < 24) return `gone in ${hours}h`;
  const days = Math.round(hours / 24);
  return `gone in ${days}d`;
}

function isCategory(value: string): value is Category {
  return Object.prototype.hasOwnProperty.call(categoryTokens, value);
}

/**
 * A delivered row becomes the same `CastDetail` the fixture path
 * produces, so every screen below this is unchanged.
 *
 * `why` and `signals` come straight off the row. When the server sent
 * no reason we show none — an empty string, never a filler sentence.
 */
export function toCastDetail(row: RemoteFeedRow): CastDetail | null {
  if (!isCategory(row.category)) return null;
  const area = row.area ?? 'nearby';
  const poster: PosterData = {
    id: row.intent_id,
    category: row.category,
    text: row.statement,
    area,
    vouches: '',
    expiry: expiryLabel(row.expires_at),
    why: row.reason_text ?? '',
    distance: distanceLabel(row.distance_m) ?? undefined,
  };
  return {
    ...poster,
    by: row.caster_first_name ?? 'someone',
    byId: row.caster_id,
    byLine: `${area} · ${row.caster_first_name ?? 'someone'}`,
    receipts: { lit: 0, line: '' },
    body: row.statement,
    signals: row.signals ?? [],
    delivery: {
      casterId: row.caster_id,
      area,
      category: row.category,
      categoryLabel: categoryTokens[row.category].label,
      window: null,
      radiusKm: DEFAULT_RADIUS_KM,
      casterCircleIds: [],
    },
    matched: [],
    pendingJoins: [],
  };
}

/**
 * Publish. Throws on failure rather than returning a tagged result:
 * every caller already runs inside `submit`, which turns a throw into
 * the failure branch the screen has built.
 */
export async function publishCast(input: PublishInput): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('no backend configured');

  // the optional arguments are omitted rather than sent as null: an
  // area the picker could not place, or a plan with no start time, is
  // an absent value, not a null one.
  const placed = input.latitude !== null && input.longitude !== null;
  const window = coarseWindow(input.startsAt);
  const { data, error } = await client.rpc('publish_cast', {
    cast_category: input.category,
    cast_statement: input.text,
    area_name: input.area,
    cast_radius_km: input.radiusKm,
    cast_expires_at: input.expiresAt.toISOString(),
    ...(placed ? { area_latitude: input.latitude!, area_longitude: input.longitude! } : {}),
    ...(input.startsAt ? { cast_starts_at: input.startsAt.toISOString() } : {}),
    ...(window ? { cast_coarse_window: window } : {}),
  });

  if (error) throw new Error(error.message);
  const published = data as { id?: string } | null;
  if (!published?.id) throw new Error('publish returned no cast');
  return published.id;
}

/** the delivered feed, newest and strongest first. */
export async function fetchFeed(): Promise<readonly CastDetail[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client.rpc('my_feed');
  if (error) throw new Error(error.message);

  // postgres-meta cannot express nullability of a function's output
  // columns, so the generated type says every one is non-null. The
  // SQL says otherwise; `RemoteFeedRow` is the honest shape.
  const rows = (data ?? []) as unknown as RemoteFeedRow[];
  const casts: CastDetail[] = [];
  for (const row of rows) {
    const cast = toCastDetail(row);
    // a row whose category we do not know is dropped rather than
    // rendered as something it is not.
    if (cast) casts.push(cast);
  }
  return casts;
}

/** swipe it away. `notRelevant` records the stronger signal. */
export async function hideCast(intentId: string, notRelevant = false): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.rpc('hide_cast', {
    target_intent_id: intentId,
    not_relevant: notRelevant,
  });
  if (error) throw new Error(error.message);
}
