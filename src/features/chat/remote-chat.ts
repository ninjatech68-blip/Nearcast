/**
 * Chat data layer, backend mode. A chat is a conversation opened by a
 * match; keyed by conversation id, private to its two parties (RLS,
 * which Realtime also honours).
 *
 * Free tier only: Auth + PostgreSQL + Realtime. No Storage — emojis
 * are text and a shared location is two rounded numbers plus a label.
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
  created_at: string;
};

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
