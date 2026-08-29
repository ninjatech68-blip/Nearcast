import { useSyncExternalStore } from 'react';

import {
  clearState,
  loadState,
  registerStoreReset,
  saveState,
  STORAGE_KEYS,
} from '@/infrastructure/persistence/storage';
import { submit } from '@/infrastructure/net/submit';
import {
  chatEnabled,
  fetchConversation,
  fetchConversations,
  fetchMessages,
  markRead,
  sendLocationShare,
  sendMediaMessage,
  sendText,
  setMode,
  subscribeToConversation,
  type LocalMedia,
  type RemoteConversation,
  type RemoteMessage,
} from './remote-chat';

export { chatEnabled, signedMediaUrl, type LocalMedia } from './remote-chat';

/**
 * chat opens only after a match, and carries the earlier messages so a
 * conversation has context. session store for the frontend; supabase
 * realtime messages replace it, same shape. push/analytics never carry
 * message text (product law) — only ids.
 */

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = {
  id: string;
  from: 'me' | 'them' | 'system';
  text: string;
  time: string;
  /** only meaningful for from: 'me'. system messages carry it as 'sent'. */
  status?: MessageStatus;
  /** a location share carries an approximate pin and an optional label */
  latitude?: number;
  longitude?: number;
  placeLabel?: string;
  /**
   * a photo or GIF. In backend mode this is an object PATH in the
   * private chat-media bucket, resolved to a short-lived signed URL at
   * render time; on fixtures it is the local file uri the picker gave
   * us, which renders directly. Never a permanent public URL.
   */
  mediaPath?: string;
  mediaKind?: 'image' | 'gif';
  mediaWidth?: number;
  mediaHeight?: number;
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

export type ConversationSummary = {
  conversationId: string;
  castId: string;
  castTitle: string;
  withName: string;
  withId: string;
  lastMessage: string;
  unread: number;
  ended: boolean;
};

type State = { threads: Record<string, Thread>; list: readonly ConversationSummary[] };

const SEED_STATE: State = {
  threads: {
    'badminton-after-work': {
      id: 'badminton-after-work',
      withName: 'Riya',
      withId: 'riya',
      castTitle: 'badminton after work',
      mode: 'day' as const,
      expiresLabel: '22h left',
      messages: [
        { id: 'm1', from: 'them', text: 'saw your cast — i’m in', time: '5:02 pm' },
        { id: 'm2', from: 'me', text: 'nice. court’s booked 7–8', time: '5:04 pm', status: 'read' },
        { id: 'm3', from: 'them', text: 'can do 7:00 pm', time: '5:05 pm' },
        { id: 'm4', from: 'me', text: 'perfect, bring water. it’s ₹80 split', time: '5:06 pm', status: 'read' },
        { id: 'm5', from: 'them', text: 'done. see you at the gate', time: '5:07 pm' },
      ],
    },
  },
  list: [],
};

// threads persist in full — every message is user-authored content
// that must survive a restart. an ended chat stays ended.
let state: State = loadState<State>(STORAGE_KEYS.chat, SEED_STATE);

const listeners = new Set<() => void>();
const emit = () => {
  saveState(STORAGE_KEYS.chat, state);
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

registerStoreReset(() => {
  state = SEED_STATE;
  listeners.forEach((l) => l());
});

export function useThread(id: string): Thread | undefined {
  return useSyncExternalStore(subscribe, () => state.threads[id]);
}

function clockTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * The chat window, short enough to sit in a header pill.
 *
 * It used to read "expires in 24h", which at 14 characters pushed the
 * pill wide enough to sit on top of the other person's name. The
 * meaning is in the number, not in the word "expires" — the pill is
 * tappable and the menu behind it spells the whole thing out.
 */
function expiresLabelFor(mode: ExpiryMode, expiresAt: string | null): string {
  if (mode === 'ended') return 'ended';
  if (mode === 'always') return 'open';
  if (!expiresAt) return '24h left';
  const hours = Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return 'expired';
  if (hours < 24) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
}

/** a server message → the UI Message, with read state for my own. */
function toMessage(row: RemoteMessage, otherLastRead: string | null): Message {
  const from = row.is_system ? 'system' : row.is_mine ? 'me' : 'them';
  const status: MessageStatus | undefined =
    from === 'me'
      ? otherLastRead && new Date(row.created_at) <= new Date(otherLastRead)
        ? 'read'
        : 'sent'
      : undefined;
  return {
    id: row.id,
    from,
    text: row.body,
    time: clockTime(row.created_at),
    status,
    ...(row.latitude !== null && row.longitude !== null
      ? { latitude: row.latitude, longitude: row.longitude, placeLabel: row.place_label ?? undefined }
      : {}),
    ...(row.media_path
      ? {
          mediaPath: row.media_path,
          mediaKind: row.media_kind === 'gif' ? ('gif' as const) : ('image' as const),
          mediaWidth: row.media_width ?? undefined,
          mediaHeight: row.media_height ?? undefined,
        }
      : {}),
  };
}

function buildThread(meta: RemoteConversation, rows: readonly RemoteMessage[]): Thread {
  return {
    id: meta.conversation_id,
    withName: meta.other_first_name ?? 'someone',
    withId: meta.other_id,
    castTitle: meta.cast_title,
    mode: meta.mode,
    expiresLabel: expiresLabelFor(meta.mode, meta.expires_at),
    messages: rows.map((row) => toMessage(row, meta.other_last_read_at)),
  };
}

function putThread(thread: Thread): void {
  state = { ...state, threads: { ...state.threads, [thread.id]: thread } };
  emit();
}

async function loadConversation(conversationId: string): Promise<void> {
  const [meta, rows] = await Promise.all([
    fetchConversation(conversationId),
    fetchMessages(conversationId),
  ]);
  if (!meta) return;
  putThread(buildThread(meta, rows));
}

/**
 * Open a conversation: load it, mark it read, and subscribe to new
 * messages. Returns an unsubscribe for the screen's cleanup. In local
 * mode there is nothing to load or subscribe — the seed thread is
 * already in the cache — so it is a no-op.
 *
 * Realtime is the accelerant; every wake re-reads through the RPC, so
 * what renders is always what the database holds and RLS permits.
 */
export function useConversations(): readonly ConversationSummary[] {
  return useSyncExternalStore(subscribe, () => state.list);
}

/** pull my chat list (backend mode); drives the activity CHATS section. */
export async function refreshConversations(): Promise<void> {
  if (!chatEnabled()) return;
  try {
    const rows = await fetchConversations();
    const list: ConversationSummary[] = rows.map((row) => ({
      conversationId: row.conversation_id,
      castId: row.intent_id,
      castTitle: row.cast_title,
      withName: row.other_first_name ?? 'someone',
      withId: row.other_id,
      lastMessage: row.last_message ?? 'say hi',
      unread: row.unread_count,
      ended: row.mode === 'ended',
    }));
    state = { ...state, list };
    emit();
  } catch (error) {
    console.warn('refreshConversations failed', error);
  }
}

/** the conversation for a (cast, other person), if one exists yet. */
export async function conversationIdFor(castId: string, otherId: string): Promise<string | null> {
  if (!chatEnabled()) return castId;
  const rows = await fetchConversations();
  return rows.find((r) => r.intent_id === castId && r.other_id === otherId)?.conversation_id ?? null;
}

export function openConversation(conversationId: string): () => void {
  if (!chatEnabled()) return () => undefined;
  void loadConversation(conversationId).then(() => void markRead(conversationId));
  const unsubscribe = subscribeToConversation(conversationId, () => {
    void loadConversation(conversationId).then(() => void markRead(conversationId));
  });
  return unsubscribe;
}

/**
 * Re-read one thread on demand — what pull-to-refresh calls.
 *
 * Realtime is the accelerant, not the source of truth, so a thread that
 * missed a wake should not need closing and reopening to catch up. A
 * no-op on fixtures, where the seed thread is already the whole truth.
 */
export async function refreshConversationMessages(conversationId: string): Promise<void> {
  if (!chatEnabled()) return;
  await loadConversation(conversationId);
  await markRead(conversationId);
}

export async function sendMessage(threadId: string, text: string): Promise<void> {
  if (chatEnabled()) {
    if (!text.trim()) return;
    await sendText(threadId, text.trim());
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread || !text.trim()) return;
  // ended chats are read-only. drop silently rather than raise —
  // the composer is disabled in the UI so this should not fire.
  if (thread.mode === 'ended') return;
  const id = `m${thread.messages.length + 1}-${text.length}-${thread.messages.length}`;
  const message: Message = {
    id,
    from: 'me',
    text: text.trim(),
    // fixed label: fixtures never call Date.now (keeps the build deterministic)
    time: 'now',
    status: 'pending',
  };
  state = {
    ...state,
    threads: { ...state.threads, [threadId]: { ...thread, messages: [...thread.messages, message] } },
  };
  emit();
  void deliverMessage(threadId, id);
}

/**
 * share an approximate location into a chat. backend mode only —
 * fixtures have no map round-trip. the pin is rounded server-side.
 */
export async function sendLocationMessage(
  threadId: string,
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> {
  if (!chatEnabled()) return;
  await sendLocationShare(threadId, latitude, longitude, label);
  await loadConversation(threadId);
}

/**
 * send a photo or a GIF into a chat.
 *
 * Backend mode uploads to the private bucket and records the path;
 * the fixture build keeps the local file uri so the demo still shows
 * the picture, with no server to put it on.
 */
export async function sendMediaMessageToThread(
  threadId: string,
  media: LocalMedia,
  caption?: string,
): Promise<void> {
  if (chatEnabled()) {
    await sendMediaMessage(threadId, media, caption);
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const id = `m${thread.messages.length + 1}-media-${thread.messages.length}`;
  const message: Message = {
    id,
    from: 'me',
    text: caption?.trim() ?? '',
    time: 'now',
    status: 'pending',
    mediaPath: media.uri,
    mediaKind: media.kind,
    mediaWidth: media.width,
    mediaHeight: media.height,
  };
  state = {
    ...state,
    threads: { ...state.threads, [threadId]: { ...thread, messages: [...thread.messages, message] } },
  };
  emit();
  void deliverMessage(threadId, id);
}

/**
 * push one pending message through the write path. a failure leaves
 * the bubble in place marked 'failed' — the text is never lost, and
 * the user can tap it to try again.
 */
async function deliverMessage(threadId: string, messageId: string): Promise<void> {
  const result = await submit(() => true);
  if (!result.ok) {
    promoteStatus(threadId, messageId, 'failed');
    return;
  }
  // fixture proxy for server ack → other-side delivery → read.
  // production wires these to supabase realtime events.
  promoteStatus(threadId, messageId, 'sent');
  setTimeout(() => promoteStatus(threadId, messageId, 'delivered'), 600);
  setTimeout(() => promoteStatus(threadId, messageId, 'read'), 2400);
}

/** retry a message that failed to send. */
export function retryMessage(threadId: string, messageId: string): void {
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const message = thread.messages.find((m) => m.id === messageId);
  if (!message || message.status !== 'failed') return;
  promoteStatus(threadId, messageId, 'pending');
  void deliverMessage(threadId, messageId);
}

function promoteStatus(threadId: string, messageId: string, status: MessageStatus): void {
  const thread = state.threads[threadId];
  if (!thread) return;
  state = {
    ...state,
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
export async function extendChat(threadId: string, mode: 'day' | 'week' | 'always'): Promise<void> {
  if (chatEnabled()) {
    await setMode(threadId, mode);
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const labels: Record<'day' | 'week' | 'always', string> = {
    day: '24h left',
    week: '7d left',
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
    ...state,
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
export async function endChat(threadId: string): Promise<void> {
  if (chatEnabled()) {
    await setMode(threadId, 'ended');
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;
  const note: Message = {
    id: `sys-end-${thread.messages.length + 1}`,
    from: 'system',
    text: 'this chat is ended. no new messages.',
    time: 'now',
  };
  state = {
    ...state,
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

/** test-only reset. clears the persisted record too. */
export function resetChat(): void {
  clearState(STORAGE_KEYS.chat);
  state = SEED_STATE;
  listeners.forEach((l) => l());
}
