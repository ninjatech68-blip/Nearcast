/**
 * Chat data layer, backend mode. A chat is a conversation opened by a
 * match; keyed by conversation id, private to its two parties (RLS,
 * which Realtime also honours).
 *
 * Auth + PostgreSQL + Realtime, plus one PRIVATE Storage bucket for
 * the photos and GIFs people send each other. Emojis are text; a
 * shared location is two rounded numbers plus a label; media is an
 * object path under the conversation's own folder, never a URL — the
 * app asks for a short-lived signed URL when it comes to render one.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from '@/infrastructure/supabase/client';

export type RemoteConversation = {
  conversation_id: string;
  intent_id: string;
  cast_title: string;
  other_id: string;
  other_first_name: string | null;
  mode: 'day' | 'week' | 'always' | 'ended';
  expires_at: string | null;
  last_message: string | null;
  last_at: string;
  unread_count: number;
  other_last_read_at: string | null;
  /** an open request for a LONGER window, waiting on the other side */
  proposed_mode: 'week' | 'always' | null;
  proposed_by_me: boolean | null;
};

export type RemoteMessage = {
  id: string;
  sender_id: string | null;
  body: string;
  is_system: boolean;
  is_mine: boolean;
  latitude: number | null;
  longitude: number | null;
  place_label: string | null;
  media_path: string | null;
  media_kind: string | null;
  media_width: number | null;
  media_height: number | null;
  created_at: string;
};

/** what the picker handed us, before it becomes a message. */
export type LocalMedia = {
  uri: string;
  kind: 'image' | 'gif';
  width?: number;
  height?: number;
  mimeType?: string;
};

export const CHAT_MEDIA_BUCKET = 'chat-media';

export function chatEnabled(): boolean {
  return getSupabase() !== null;
}

export async function fetchConversations(): Promise<readonly RemoteConversation[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('my_conversations');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteConversation[];
}

export async function fetchConversation(conversationId: string): Promise<RemoteConversation | null> {
  const all = await fetchConversations();
  return all.find((row) => row.conversation_id === conversationId) ?? null;
}

export async function fetchMessages(conversationId: string): Promise<readonly RemoteMessage[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('conversation_messages', {
    target_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteMessage[];
}

export async function sendText(conversationId: string, body: string): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('send_message', {
    target_conversation_id: conversationId,
    message_body: body,
  });
  if (error) throw new Error(error.message);
}

export async function sendLocationShare(
  conversationId: string,
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('send_location', {
    target_conversation_id: conversationId,
    share_latitude: latitude,
    share_longitude: longitude,
    ...(label ? { label } : {}),
  });
  if (error) throw new Error(error.message);
}

/**
 * Upload a picked photo or GIF, then record it as a message.
 *
 * Order matters: the object lands first, so a message row never points
 * at something that is not there. The path is `<conversation>/<id>.<ext>`
 * because the storage policies key on that first folder — only the two
 * people in the room may read or write inside it.
 *
 * The bytes come from `fetch(uri)`: the picker hands back a local file
 * URI, and this is the one path that works for both a camera capture
 * and a library asset without pulling in a filesystem module.
 */
export async function sendMediaMessage(
  conversationId: string,
  media: LocalMedia,
  caption?: string,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');

  const extension = extensionFor(media);
  const path = `${conversationId}/${cryptoId()}.${extension}`;
  const response = await fetch(media.uri);
  const bytes = await response.arrayBuffer();

  const { error: uploadError } = await c.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: media.mimeType ?? mimeFor(extension), upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await c.rpc('send_media', {
    target_conversation_id: conversationId,
    path,
    kind: media.kind,
    ...(media.width ? { width: Math.round(media.width) } : {}),
    ...(media.height ? { height: Math.round(media.height) } : {}),
    ...(caption && caption.trim() ? { caption: caption.trim() } : {}),
  });
  if (error) throw new Error(error.message);
}

/**
 * A short-lived URL for one stored object.
 *
 * The bucket is private, so there is no permanent URL to cache and
 * nothing to leak if a message row is ever seen by someone who should
 * not have it. An hour is long enough to look at a photo and short
 * enough that a copied link stops working.
 */
export async function signedMediaUrl(path: string): Promise<string | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function extensionFor(media: LocalMedia): string {
  if (media.kind === 'gif') return 'gif';
  const fromUri = media.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUri && /^(jpg|jpeg|png|heic|webp)$/.test(fromUri)) return fromUri;
  return 'jpg';
}

function mimeFor(extension: string): string {
  switch (extension) {
    case 'gif':
      return 'image/gif';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/** a random object name. never derived from the file's own name. */
function cryptoId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Answer an open request for a longer window.
 *
 * `accept` from the other party is what actually changes it; `accept:
 * false` from either party clears it — from the proposer that is a
 * withdrawal, from the other side a decline.
 */
export async function respondToModeProposal(conversationId: string, accept: boolean): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('respond_to_mode_proposal', {
    target_conversation_id: conversationId,
    accept,
  });
  if (error) throw new Error(error.message);
}

export async function markRead(conversationId: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  const { error } = await c.rpc('mark_conversation_read', {
    target_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

export async function setMode(
  conversationId: string,
  mode: 'day' | 'week' | 'always' | 'ended',
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('set_conversation_mode', {
    target_conversation_id: conversationId,
    next_mode: mode,
  });
  if (error) throw new Error(error.message);
}

/**
 * Subscribe to new messages in one conversation. Realtime is the
 * accelerant, not the source of truth: `onInsert` fires for rows added
 * anywhere, and the handler re-reads through the RPC so what renders is
 * always what the database actually holds (and what RLS actually
 * permits this viewer to see). Returns an unsubscribe.
 */
export function subscribeToConversation(
  conversationId: string,
  onInsert: () => void,
): () => void {
  const c = getSupabase();
  if (!c) return () => undefined;
  const channel: RealtimeChannel = c
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      () => onInsert(),
    )
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}
