// ===============================================================
// prune-chat-media — remove abandoned chat uploads through Storage API.
// ===============================================================
//
// The database identifies orphans conservatively: objects in the
// private chat-media bucket older than a threshold, with no message row
// pointing at either the original path or the persisted thumbnail path.
// This function performs the actual deletion through the Storage API,
// which is the safe path Supabase documents.
// ===============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Payload = {
  older_than?: string;
  max_objects?: number;
};

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const payload = await readPayload(request);
  const olderThan = payload.older_than ?? '1 day';
  const maxObjects = clamp(payload.max_objects ?? 200, 1, 1000);

  const { data, error } = await admin.rpc('list_chat_media_orphans', {
    older_than: olderThan,
    max_objects: maxObjects,
  });
  if (error) return json({ ok: false, stage: 'list', error: error.message }, 500);

  const paths = ((data ?? []) as Array<{ path: string | null }>)
    .map((row) => row.path)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return json({ ok: true, listed: 0, removed: 0 }, 200);

  const { error: removeError } = await admin.storage.from('chat-media').remove(paths);
  if (removeError) return json({ ok: false, stage: 'remove', error: removeError.message, listed: paths.length }, 500);

  return json({ ok: true, listed: paths.length, removed: paths.length }, 200);
});

async function readPayload(request: Request): Promise<Payload> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Payload;
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
