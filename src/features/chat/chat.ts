import { useSyncExternalStore } from 'react';

/**
 * chat opens only after a match, and carries the earlier messages so a
 * conversation has context. session store for the frontend; supabase
 * realtime messages replace it, same shape. push/analytics never carry
 * message text (product law) — only ids.
 */

export type Message = {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  time: string;
};

export type Thread = {
  id: string;
  withName: string;
  withId: string;
  castTitle: string;
  messages: readonly Message[];
};

type State = { threads: Record<string, Thread> };

let state: State = {
  threads: {
    'badminton-after-work': {
      id: 'badminton-after-work',
      withName: 'Riya',
      withId: 'riya',
      castTitle: 'badminton after work',
      messages: [
        // system message: the exact meeting spot is revealed the
        // moment the caster accepts the join. before this, the poster
        // showed only the area name — never the exact place.
        {
          id: 'm0',
          from: 'system',
          text: 'meeting spot: KSLTA Court 3 · gate 2, indiranagar. shared now that you’re both in.',
          time: '5:01 pm',
        },
        { id: 'm1', from: 'them', text: 'saw your cast — i’m in', time: '5:02 pm' },
        { id: 'm2', from: 'me', text: 'nice. court’s booked 7–8', time: '5:04 pm' },
        { id: 'm3', from: 'them', text: 'can do 7:00 pm', time: '5:05 pm' },
        { id: 'm4', from: 'me', text: 'perfect, bring water. it’s ₹80 split', time: '5:06 pm' },
        { id: 'm5', from: 'them', text: 'done. see you at the gate', time: '5:07 pm' },
      ],
    },
  },
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useThread(id: string): Thread | undefined {
  return useSyncExternalStore(subscribe, () => state.threads[id]);
}

export function sendMessage(threadId: string, text: string): void {
  const thread = state.threads[threadId];
  if (!thread || !text.trim()) return;
  const message: Message = {
    id: `m${thread.messages.length + 1}-${text.length}`,
    from: 'me',
    text: text.trim(),
    // fixed label: fixtures never call Date.now (keeps the build deterministic)
    time: 'now',
  };
  state = {
    threads: { ...state.threads, [threadId]: { ...thread, messages: [...thread.messages, message] } },
  };
  emit();
}

export function resetChat(): void {
  emit();
}
