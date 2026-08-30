// ===============================================================
// send-push — drain the notification outbox and deliver branded pings.
// ===============================================================
//
// This sender does three jobs:
//
// 1. read pending outbox rows and submit visible notifications to Expo
// 2. store Expo ticket ids per DEVICE so delivery can be reconciled later
// 3. poll Expo receipts and invalidate dead tokens like
//    DeviceNotRegistered so they stop being retried forever
//
// Privacy: the outbox holds only a kind + ids. The human-readable copy
// lives here and never includes the note, plan, person, or place.
// ===============================================================

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered']);

const COPY: Record<string, { title: string; body: string }> = {
  join_request: {
    title: 'someone wants in',
    body: 'they left you a line. yours to say yes or no.',
  },
  join_accepted: {
    title: "you're in",
    body: "the chat's open. sort out where and when.",
  },
  // Says there is something to read without saying a word of it. The
  // message text never leaves the database, so a lock screen face-up on
  // a table gives away nothing — which is the whole point of a
  // notification you can act on.
  chat_message: {
    title: 'a new message',
    body: 'they wrote back. yours to read.',
  },
};

type OutboxRow = {
  id: string;
  recipient_id: string;
  kind: string;
  intent_id: string | null;
  conversation_id: string | null;
  attempt_count: number;
};

type TokenRow = {
  user_id: string;
  token: string;
};

type DeliveryInsert = {
  id: string;
  outbox_id: string;
  token: string;
  ticket_status: 'pending' | 'ok' | 'error';
  expo_ticket_id: string | null;
  receipt_status: 'ok' | 'error' | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  submitted_at: string | null;
  receipt_checked_at: string | null;
  resolved_at: string | null;
};

type DeliveryRecord = {
  id: string;
  outbox_id: string;
  token: string;
  ticket_status: 'pending' | 'ok' | 'error';
  receipt_status: 'ok' | 'error' | null;
  error_code: string | null;
  error_message: string | null;
  expo_ticket_id: string | null;
};

type ExpoSendItem = {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoSendResponse = {
  data?: ExpoSendItem[];
  errors?: Array<{ message?: string }>;
};

type ExpoReceipt = {
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

type ExpoReceiptResponse = {
  data?: Record<string, ExpoReceipt>;
  errors?: Array<{ message?: string }>;
};

type DerivedOutboxStatus = {
  delivery_status: 'submitted' | 'delivered' | 'partial' | 'failed';
  last_error: string | null;
  resolved_at: string | null;
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const admin = createClient(supabaseUrl, serviceKey);

  const receipts = await reconcileReceipts(admin, expoToken);
  const sends = await sendPending(admin, expoToken);

  return json({
    ok: receipts.ok && sends.ok,
    receipts: {
      checked: receipts.checked,
      resolved: receipts.resolved,
      invalidatedTokens: receipts.invalidatedTokens,
    },
    sends: {
      attempted: sends.attempted,
      submitted: sends.submitted,
      noDevices: sends.noDevices,
      failed: sends.failed,
    },
  }, receipts.ok && sends.ok ? 200 : 500);
});

async function reconcileReceipts(
  admin: ReturnType<typeof createClient>,
  expoToken: string | undefined,
): Promise<{ ok: boolean; checked: number; resolved: number; invalidatedTokens: number }> {
  const { data, error } = await admin
    .from('notification_deliveries')
    .select('id, outbox_id, token, expo_ticket_id')
    .is('receipt_status', null)
    .not('expo_ticket_id', 'is', null)
    .order('submitted_at', { ascending: true })
    .limit(300);

  if (error) return { ok: false, checked: 0, resolved: 0, invalidatedTokens: 0 };
  const pending = (data ?? []) as Array<{
    id: string;
    outbox_id: string;
    token: string;
    expo_ticket_id: string;
  }>;
  if (pending.length === 0) return { ok: true, checked: 0, resolved: 0, invalidatedTokens: 0 };

  const invalidTokens = new Set<string>();
  const touchedOutboxIds = new Set<string>();
  let checked = 0;
  let resolved = 0;
  let ok = true;

  for (let i = 0; i < pending.length; i += 100) {
    const chunk = pending.slice(i, i + 100);
    const ids = chunk.map((row) => row.expo_ticket_id);
    const result = await fetchExpoJson<ExpoReceiptResponse>(EXPO_RECEIPTS_URL, { ids }, expoToken);
    const checkedAt = isoNow();

    if (!result.ok || !result.body?.data) {
      ok = false;
      continue;
    }

    for (const row of chunk) {
      const receipt = result.body.data[row.expo_ticket_id];
      if (!receipt?.status) continue;
      checked += 1;
      touchedOutboxIds.add(row.outbox_id);
      const errorCode = receipt.details?.error ?? null;
      const errorMessage = receipt.message ?? null;
      if (receipt.status === 'error' && errorCode && INVALID_TOKEN_ERRORS.has(errorCode)) {
        invalidTokens.add(row.token);
      }
      const update = {
        receipt_status: receipt.status,
        receipt_checked_at: checkedAt,
        resolved_at: checkedAt,
        error_code: errorCode,
        error_message: errorMessage,
      };
      const { error: updateError } = await admin
        .from('notification_deliveries')
        .update(update)
        .eq('id', row.id);
      if (updateError) {
        ok = false;
      } else {
        resolved += 1;
      }
    }
  }

  if (invalidTokens.size > 0) {
    const { error: invalidateError } = await admin
      .from('device_push_tokens')
      .update({ invalidated_at: isoNow(), last_error: 'DeviceNotRegistered' })
      .in('token', [...invalidTokens]);
    if (invalidateError) ok = false;
  }

  await refreshOutboxStatuses(admin, [...touchedOutboxIds]);
  return {
    ok,
    checked,
    resolved,
    invalidatedTokens: invalidTokens.size,
  };
}

async function sendPending(
  admin: ReturnType<typeof createClient>,
  expoToken: string | undefined,
): Promise<{ ok: boolean; attempted: number; submitted: number; noDevices: number; failed: number }> {
  // CLAIM the batch rather than reading it. Selecting pending rows and
  // marking them only after Expo has answered leaves them looking
  // pending for the whole submit, so an overlapping run — the drain is
  // scheduled every minute, a batch can take longer than that — sends
  // every one of them a second time. The claim moves them to 'sending'
  // in a single statement, so exactly one run owns them; a run that
  // dies leaves them claimed and the next one takes them back once the
  // claim goes stale.
  const { data, error } = await admin.rpc('claim_notification_batch', { batch_size: 200 });

  if (error) return { ok: false, attempted: 0, submitted: 0, noDevices: 0, failed: 0 };
  const outbox = (data ?? []) as OutboxRow[];
  if (outbox.length === 0) return { ok: true, attempted: 0, submitted: 0, noDevices: 0, failed: 0 };

  const recipientIds = [...new Set(outbox.map((row) => row.recipient_id))];
  const { data: tokenData } = await admin
    .from('device_push_tokens')
    .select('user_id, token')
    .in('user_id', recipientIds)
    .is('invalidated_at', null);
  if (!tokenData && recipientIds.length > 0) {
    return { ok: false, attempted: outbox.length, submitted: 0, noDevices: 0, failed: 0 };
  }

  const tokensByUser = new Map<string, string[]>();
  for (const row of (tokenData ?? []) as TokenRow[]) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  const createdAt = isoNow();
  const deliveryRows: DeliveryInsert[] = [];
  const attemptedAtByOutbox = new Map<string, string>();
  const touchedOutboxIds = new Set<string>();
  let noDevices = 0;
  let failed = 0;

  const messages: Array<{
    deliveryId: string;
    outboxId: string;
    token: string;
    message: Record<string, unknown>;
  }> = [];

  for (const row of outbox) {
    const attemptedAt = isoNow();
    attemptedAtByOutbox.set(row.id, attemptedAt);
    const copy = COPY[row.kind];
    if (!copy) {
      await markOutbox(admin, row.id, {
        delivery_status: 'failed',
        last_error: `unknown_kind:${row.kind}`,
        last_attempt_at: attemptedAt,
        attempt_count: row.attempt_count,
        resolved_at: attemptedAt,
      });
      failed += 1;
      continue;
    }

    const tokens = tokensByUser.get(row.recipient_id) ?? [];
    if (tokens.length === 0) {
      await markOutbox(admin, row.id, {
        delivery_status: 'no_devices',
        last_error: 'no_active_tokens',
        last_attempt_at: attemptedAt,
        attempt_count: row.attempt_count,
        resolved_at: attemptedAt,
      });
      noDevices += 1;
      continue;
    }

    touchedOutboxIds.add(row.id);
    for (const token of tokens) {
      const deliveryId = crypto.randomUUID();
      deliveryRows.push({
        id: deliveryId,
        outbox_id: row.id,
        token,
        ticket_status: 'pending',
        expo_ticket_id: null,
        receipt_status: null,
        error_code: null,
        error_message: null,
        created_at: createdAt,
        submitted_at: null,
        receipt_checked_at: null,
        resolved_at: null,
      });
      messages.push({
        deliveryId,
        outboxId: row.id,
        token,
        message: {
          to: token,
          title: copy.title,
          body: copy.body,
          sound: 'default',
          // ids only — the app resolves them to the right screen on open
          data: {
            kind: row.kind,
            intentId: row.intent_id,
            conversationId: row.conversation_id,
          },
        },
      });
    }
  }

  if (messages.length === 0) {
    return {
      ok: true,
      attempted: outbox.length,
      submitted: 0,
      noDevices,
      failed,
    };
  }

  const byId = new Map(deliveryRows.map((row) => [row.id, row]));
  const invalidTokens = new Set<string>();

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const submittedAt = isoNow();
    const result = await fetchExpoJson<ExpoSendResponse>(
      EXPO_PUSH_URL,
      chunk.map((entry) => entry.message),
      expoToken,
    );

    if (!result.ok || !Array.isArray(result.body?.data)) {
      for (const entry of chunk) {
        const row = byId.get(entry.deliveryId)!;
        row.ticket_status = 'error';
        row.error_code = `http_${result.status}`;
        row.error_message = result.errorMessage ?? 'expo_send_failed';
        row.resolved_at = submittedAt;
      }
      continue;
    }

    const data = result.body.data;
    for (let index = 0; index < chunk.length; index += 1) {
      const entry = chunk[index];
      const ticket = data[index];
      const row = byId.get(entry.deliveryId)!;
      if (ticket?.status === 'ok' && ticket.id) {
        row.ticket_status = 'ok';
        row.expo_ticket_id = ticket.id;
        row.submitted_at = submittedAt;
        continue;
      }

      const errorCode = ticket?.details?.error ?? 'ticket_error';
      row.ticket_status = 'error';
      row.submitted_at = submittedAt;
      row.error_code = errorCode;
      row.error_message = ticket?.message ?? firstExpoError(result.body?.errors) ?? 'expo_ticket_error';
      row.resolved_at = submittedAt;
      if (INVALID_TOKEN_ERRORS.has(errorCode)) invalidTokens.add(entry.token);
    }
  }

  const { error: deliveryError } = await admin.from('notification_deliveries').insert(deliveryRows);
  if (deliveryError) return { ok: false, attempted: outbox.length, submitted: 0, noDevices, failed };

  if (invalidTokens.size > 0) {
    await admin
      .from('device_push_tokens')
      .update({ invalidated_at: isoNow(), last_error: 'DeviceNotRegistered' })
      .in('token', [...invalidTokens]);
  }

  let submitted = 0;
  for (const row of outbox) {
    if (!touchedOutboxIds.has(row.id)) continue;
    const deliveries = deliveryRows.filter((delivery) => delivery.outbox_id === row.id);
    const anySubmitted = deliveries.some((delivery) => delivery.ticket_status === 'ok');
    const terminalErrors = deliveries.filter((delivery) => delivery.ticket_status === 'error').length;

    if (anySubmitted) {
      submitted += 1;
      await markOutbox(admin, row.id, {
        delivery_status: 'submitted',
        sent_at: attemptedAtByOutbox.get(row.id) ?? isoNow(),
        last_error: terminalErrors > 0 ? 'partial_submit_error' : null,
        last_attempt_at: attemptedAtByOutbox.get(row.id) ?? isoNow(),
        attempt_count: row.attempt_count,
        resolved_at: null,
      });
    } else {
      failed += 1;
      const firstError = deliveries.find((delivery) => delivery.error_code || delivery.error_message);
      await markOutbox(admin, row.id, {
        delivery_status: 'failed',
        last_error: firstError?.error_code ?? firstError?.error_message ?? 'expo_submit_failed',
        last_attempt_at: attemptedAtByOutbox.get(row.id) ?? isoNow(),
        attempt_count: row.attempt_count,
        resolved_at: attemptedAtByOutbox.get(row.id) ?? isoNow(),
      });
    }
  }

  return {
    ok: true,
    attempted: outbox.length,
    submitted,
    noDevices,
    failed,
  };
}

async function refreshOutboxStatuses(
  admin: ReturnType<typeof createClient>,
  outboxIds: string[],
): Promise<boolean> {
  if (outboxIds.length === 0) return true;
  const uniqueIds = [...new Set(outboxIds)];
  const { data, error } = await admin
    .from('notification_deliveries')
    .select('id, outbox_id, token, ticket_status, receipt_status, error_code, error_message, expo_ticket_id')
    .in('outbox_id', uniqueIds);

  if (error) return false;
  const grouped = new Map<string, DeliveryRecord[]>();
  for (const row of (data ?? []) as DeliveryRecord[]) {
    const list = grouped.get(row.outbox_id) ?? [];
    list.push(row);
    grouped.set(row.outbox_id, list);
  }

  let ok = true;
  for (const outboxId of uniqueIds) {
    const deliveries = grouped.get(outboxId) ?? [];
    const derived = deriveOutboxStatus(deliveries);
    if (!derived) continue;
    const marked = await markOutbox(admin, outboxId, derived);
    if (!marked) ok = false;
  }
  return ok;
}

function deriveOutboxStatus(deliveries: DeliveryRecord[]): DerivedOutboxStatus | null {
  if (deliveries.length === 0) return null;
  const hasPendingReceipt = deliveries.some(
    (delivery) => delivery.ticket_status === 'ok' && delivery.receipt_status === null,
  );
  if (hasPendingReceipt) {
    const error = deliveries.find((delivery) => delivery.ticket_status === 'error');
    return {
      delivery_status: 'submitted',
      last_error: error?.error_code ?? error?.error_message ?? null,
      resolved_at: null,
    };
  }

  const receiptOk = deliveries.filter((delivery) => delivery.receipt_status === 'ok').length;
  const anyError = deliveries.some(
    (delivery) => delivery.ticket_status === 'error' || delivery.receipt_status === 'error',
  );
  const latestResolvedAt = isoNow();
  if (receiptOk > 0 && !anyError) {
    return { delivery_status: 'delivered', last_error: null, resolved_at: latestResolvedAt };
  }
  if (receiptOk > 0 && anyError) {
    const error = deliveries.find((delivery) => delivery.error_code || delivery.error_message);
    return {
      delivery_status: 'partial',
      last_error: error?.error_code ?? error?.error_message ?? null,
      resolved_at: latestResolvedAt,
    };
  }
  const error = deliveries.find((delivery) => delivery.error_code || delivery.error_message);
  return {
    delivery_status: 'failed',
    last_error: error?.error_code ?? error?.error_message ?? 'delivery_failed',
    resolved_at: latestResolvedAt,
  };
}

async function markOutbox(
  admin: ReturnType<typeof createClient>,
  outboxId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await admin.from('notification_outbox').update(patch).eq('id', outboxId);
  return !error;
}

async function fetchExpoJson<T>(
  url: string,
  body: unknown,
  expoToken: string | undefined,
): Promise<{ ok: boolean; status: number; body?: T; errorMessage?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as T) : undefined;
    return {
      ok: response.ok,
      status: response.status,
      body: parsed,
      errorMessage: response.ok ? undefined : text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorMessage: error instanceof Error ? error.message : 'network_error',
    };
  }
}

function firstExpoError(errors: Array<{ message?: string }> | undefined): string | null {
  const first = errors?.find((entry) => entry.message)?.message;
  return first ?? null;
}

function isoNow(): string {
  return new Date().toISOString();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
