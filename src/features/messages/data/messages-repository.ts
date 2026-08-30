import type { RealtimeChannel } from '@supabase/supabase-js';

import type {
  RoomMessageRecord,
  RoomParticipant,
} from '@/features/messages/domain/message';
import type { RoomLifetime } from '@/features/messages/domain/room';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Match room persistence.
 *
 * Plan 04 Task 4 requires a message to be persisted before it is broadcast.
 * Sending inserts directly under RLS, which gives that ordering by construction:
 * `postgres_changes` only emits after the row commits, so nothing reaches a
 * client that PostgreSQL has not already accepted. `messages_insert_parties`
 * enforces membership, an open and unexpired room, the absence of a block, and
 * that a party cannot forge a system row.
 *
 * Idempotency comes from a client-generated primary key: replaying a send after
 * a dropped connection collides with the existing row rather than duplicating
 * it. Plan 04 names a `send-message` Edge Function for this path; moving it
 * server-side later (for rate limiting) will not change this module's contract.
 *
 * Realtime accelerates delivery; PostgreSQL stays the source of truth, so a
 * reconnect refetches rather than replaying channel state.
 */

export const MESSAGE_PAGE_SIZE = 40;

type MessageRow = {
  id: string;
  sender_id: string | null;
  body: string;
  is_system: boolean;
  created_at: string;
  reply_to_id: string | null;
};

function toRecord(row: MessageRow): RoomMessageRecord {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    isSystem: row.is_system,
    createdAt: new Date(row.created_at),
    replyToId: row.reply_to_id,
    delivery: 'sent',
  };
}

export type RoomSnapshot = {
  room: RoomLifetime;
  participants: RoomParticipant[];
  messages: RoomMessageRecord[];
  hasEarlier: boolean;
};

export async function fetchRoom(conversationId: string): Promise<RoomSnapshot> {
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select(
      'expires_at, closed_at, matches!inner(broadcaster_id, participant_id)',
    )
    .eq('id', conversationId)
    .single();

  if (conversationError !== null) throw conversationError;

  const match = conversation.matches;
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_path')
    .in('id', [match.broadcaster_id, match.participant_id]);

  if (profilesError !== null) throw profilesError;

  const page = await fetchMessagePage(conversationId);

  return {
    room: {
      expiresAt: new Date(conversation.expires_at),
      closedAt:
        conversation.closed_at === null ? null : new Date(conversation.closed_at),
    },
    participants: profiles.map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_path,
    })),
    messages: page.messages,
    hasEarlier: page.hasEarlier,
  };
}

export async function fetchMessagePage(
  conversationId: string,
  before?: Date,
): Promise<{ messages: RoomMessageRecord[]; hasEarlier: boolean }> {
  let query = supabase
    .from('messages')
    .select('id, sender_id, body, is_system, created_at, reply_to_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (before !== undefined) query = query.lt('created_at', before.toISOString());

  const { data, error } = await query;
  if (error !== null) throw error;

  const hasEarlier = data.length > MESSAGE_PAGE_SIZE;

  return {
    messages: data.slice(0, MESSAGE_PAGE_SIZE).map(toRecord),
    hasEarlier,
  };
}

/** Postgres error code raised when a replayed send hits the existing row. */
const UNIQUE_VIOLATION = '23505';

export async function sendMessage(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
  body: string;
  replyToId: string | null;
}): Promise<RoomMessageRecord> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id: input.messageId,
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.body,
      reply_to_id: input.replyToId,
    })
    .select('id, sender_id, body, is_system, created_at, reply_to_id')
    .single();

  if (error === null) return toRecord(data);

  // A retry of a send that actually landed resolves to the stored row.
  if (error.code === UNIQUE_VIOLATION) {
    const { data: existing, error: fetchError } = await supabase
      .from('messages')
      .select('id, sender_id, body, is_system, created_at, reply_to_id')
      .eq('id', input.messageId)
      .single();

    if (fetchError !== null) throw fetchError;
    return toRecord(existing);
  }

  throw error;
}

/**
 * Subscribe to the room's private channel. The callback receives persisted rows
 * only; nothing is rendered from channel state that PostgreSQL has not accepted.
 */
export function subscribeToRoom(
  conversationId: string,
  onMessage: (message: RoomMessageRecord) => void,
): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`, { config: { private: true } })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(toRecord(payload.new as MessageRow)),
    )
    .subscribe();
}
