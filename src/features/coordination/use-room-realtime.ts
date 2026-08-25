import { useEffect } from 'react';

import { supabase } from '@/infrastructure/supabase/client';

/**
 * Subscribes to new messages in one coordination room over a private Realtime
 * channel. Realtime only accelerates delivery: every message is persisted by
 * send_message before broadcast, RLS scopes what this subscriber may see, and
 * the caller refetches from PostgreSQL — the source of truth — on every event
 * and on reconnect, so a dropped socket loses nothing. The channel is removed
 * on unmount and when the room closes.
 */
export function useRoomRealtime(
  conversationId: string | null,
  onChange: () => void,
): void {
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`room-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => onChange(),
      )
      .subscribe((status) => {
        // A reconnect may have missed rows; the refetch closes the gap.
        if (status === 'SUBSCRIBED') onChange();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, onChange]);
}
