// ===============================================================
// send-push — drain the notification outbox and deliver branded pings.
// ===============================================================
//
// Deploy:  supabase functions deploy send-push
// Secrets: the function uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,
//          which Supabase injects automatically. If your Expo push
//          project needs an access token, set EXPO_ACCESS_TOKEN too:
//            supabase secrets set EXPO_ACCESS_TOKEN=...
// Schedule: invoke it on a schedule (Supabase cron / pg_cron calling this
//          function URL) so the outbox drains every minute or two.
//
// Privacy: the outbox holds only a kind + ids. The human-readable copy
// lives HERE and, by product law, never contains intent text, messages,
// coordinates, contact details, or private-group names — just a branded,
// generic line that gets the person to open the app.
// ===============================================================

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// The copy, in the app's own voice: lowercase, plain, content-free.
//
// Two rules it has to hold at once.
//
// It must name the REAL state change — a notification that says
// "something happened, open the app" wastes the one glance a person
// gives a lock screen, and is the same sentence for every product on
// earth. So each line says what actually changed and what is now true.
//
// And it must give away nothing. No note, no plan, no name, no place.
// "they left you a line" tells you there is something to read without
// telling the room you are standing in what it says — which is the
// point of a notification you can act on and a lock screen you can
// leave face-up.
//
// No "open Nearcast to…" tail. Tapping it opens the app; saying so is
// filler in the space where the useful half of the sentence goes.
const COPY: Record<string, { title: string; body: string }> = {
  join_request: {
    title: 'someone wants in',
    body: 'they left you a line. yours to say yes or no.',
  },
  join_accepted: {
    title: "you're in",
    body: "the chat's open. sort out where and when.",
  },
};

type OutboxRow = {
  id: string;
  recipient_id: string;
  kind: string;
  intent_id: string | null;
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN'); // optional
  const admin = createClient(supabaseUrl, serviceKey);

  // pull a batch of unsent notifications, oldest first
  const { data: rows, error } = await admin
    .from('notification_outbox')
    .select('id, recipient_id, kind, intent_id')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return json({ ok: false, error: error.message }, 500);
  const outbox = (rows ?? []) as OutboxRow[];
  if (outbox.length === 0) return json({ ok: true, sent: 0 });

  // gather the device tokens for every recipient in the batch
  const recipientIds = [...new Set(outbox.map((r) => r.recipient_id))];
  const { data: tokenRows } = await admin
    .from('device_push_tokens')
    .select('user_id, token')
    .in('user_id', recipientIds);

  const tokensByUser = new Map<string, string[]>();
  for (const t of (tokenRows ?? []) as { user_id: string; token: string }[]) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t.token);
    tokensByUser.set(t.user_id, list);
  }

  // build Expo push messages
  const messages: any[] = [];
  const handled: string[] = [];
  for (const row of outbox) {
    const copy = COPY[row.kind];
    const tokens = tokensByUser.get(row.recipient_id) ?? [];
    // no copy or no device: still mark handled so it does not pile up
    handled.push(row.id);
    if (!copy || tokens.length === 0) continue;
    for (const to of tokens) {
      messages.push({
        to,
        title: copy.title,
        body: copy.body,
        sound: 'default',
        // ids only — the app resolves this to the right screen on open
        data: { kind: row.kind, intentId: row.intent_id },
      });
    }
  }

  if (messages.length > 0) {
    // Expo accepts up to 100 messages per request
    for (let i = 0; i < messages.length; i += 100) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
        },
        body: JSON.stringify(messages.slice(i, i + 100)),
      });
    }
  }

  if (handled.length > 0) {
    await admin
      .from('notification_outbox')
      .update({ sent_at: new Date().toISOString() })
      .in('id', handled);
  }

  return json({ ok: true, sent: messages.length, drained: handled.length });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
