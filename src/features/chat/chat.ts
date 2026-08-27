import { useSyncExternalStore } from 'react';

/**
 * chat opens only after a match, and carries the earlier messages so a
 * conversation has context. session store for the frontend; supabase
 * realtime messages replace it, same shape. push/analytics never carry
 * message text (product law) — only ids.
 */

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export type Message = {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  time: string;
  /** only meaningful for from: 'me'. system messages carry it as 'sent'. */
  status?: MessageStatus;
};

/**
 * chats expire by default so they don't linger past their reason.
 *  - 'day'    (24h from now) — the default when the plan window is short
 *  - 'week'   (7 days)       — when the pair wants to plan the next one
 *  - 'always' (no expiry)    — both sides opted to keep it open forever
 *  - 'ended'                 — closed by one side; read-only, no new
 *                              messages, no reopen. this is a hard stop.
 *
 * "always" and "ended" are TWO-SIDED transitions in production: one
 * side proposes, the other accepts. session store here mocks the shape
 * without the second confirmation.
 */
export type ExpiryMode = 'day' | 'week' | 'always' | 'ended';

export type Thread = {
  id: string;
  withName: string;
  withId: string;
  castTitle: string;
  messages: readonly Message[];
  mode: ExpiryMode;
  /** display label for the current expiry — kept as a string so the store stays deterministic without a clock */
  expiresLabel: string;
};

type State = { threads: Record<string, Thread> };

let state: State = {
  threads: {
    'badminton-after-work': {
      id: 'badminton-after-work',
      withName: 'Riya',
      withId: 'riya',
      castTitle: 'badminton after work',
      mode: 'day' as const,
      expiresLabel: 'expires in 22h',
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
        { id: 'm2', from: 'me', text: 'nice. court’s booked 7–8', time: '5:04 pm', status: 'read' },
        { id: 'm3', from: 'them', text: 'can do 7:00 pm', time: '5:05 pm' },
        { id: 'm4', from: 'me', text: 'perfect, bring water. it’s ₹80 split', time: '5:06 pm', status: 'read' },
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
  // ended chats are read-only. drop silently rather than raise —
  // the composer is disabled in the UI so this should not fire.
  if (thread.mode === 'ended') return;
  const id = `m${thread.messages.length + 1}-${text.length}`;
  const message: Message = {
    id,
    from: 'me',
    text: text.trim(),
    // fixed label: fixtures never call Date.now (keeps the build deterministic)
    time: 'now',
    status: 'pending',
  };
  state = {
    threads: { ...state.threads, [threadId]: { ...thread, messages: [...thread.messages, message] } },
  };
  emit();
  // fixture proxy for network → server ack → other-side read.
  // production wires these to supabase realtime events and rr callbacks.
  setTimeout(() => promoteStatus(threadId, id, 'sent'), 200);
  setTimeout(() => promoteStatus(threadId, id, 'delivered'), 800);
  setTimeout(() => promoteStatus(threadId, id, 'read'), 2600);
}

function promoteStatus(threadId: string, messageId: string, status: MessageStatus): void {
  const thread = state.threads[threadId];
  if (!thread) return;
  state = {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        messages: thread.messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
      },
    },
  };
  emit();
}

/**
 * extend the chat's window. in production, "always" needs both sides
 * to opt in; here we mock the shape by flipping the mode immediately
 * and appending a system message describing the transition.
 */
export function extendChat(threadId: string, mode: 'day' | 'week' | 'always'): void {
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const labels: Record<'day' | 'week' | 'always', string> = {
    day: 'expires in 24h',
    week: 'expires in 7 days',
    always: 'no expiry · you both agreed to keep it open',
  };
  const noteText: Record<'day' | 'week' | 'always', string> = {
    day: 'chat window reset to 24h.',
    week: 'chat window reset to 7 days.',
    always: 'both of you agreed to keep this chat open. no expiry now.',
  };
  const note: Message = {
    id: `sys-extend-${thread.messages.length + 1}`,
    from: 'system',
    text: noteText[mode],
    time: 'now',
  };
  state = {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        mode,
        expiresLabel: labels[mode],
        messages: [...thread.messages, note],
      },
    },
  };
  emit();
}

/**
 * end the chat immediately. either side can do this at any time; the
 * thread becomes read-only, no reopen. one-way and one-tap is the
 * point — there is no "block the block".
 */
export function endChat(threadId: string): void {
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const note: Message = {
    id: `sys-end-${thread.messages.length + 1}`,
    from: 'system',
    text: 'this chat is ended. no new messages.',
    time: 'now',
  };
  state = {
    threads: {
      ...state.threads,
      [threadId]: {
        ...thread,
        mode: 'ended',
        expiresLabel: 'ended',
        messages: [...thread.messages, note],
      },
    },
  };
  emit();
}

export function resetChat(): void {
  emit();
}
