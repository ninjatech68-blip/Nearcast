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
  respondToModeProposal,
  setMode,
  subscribeToConversation,
  subscribeToMyActivity,
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
  /** display label for the current expiry — a frozen fallback for the list row */
  expiresLabel: string;
  /** plans this chat spans; >1 means more than one shared plan */
  planCount: number;
  /**
   * the raw expiry, so the chat header can count down live rather than
   * showing a number frozen at load. null for an open or not-yet-set
   * window. ISO string.
   */
  expiresAt: string | null;
  /**
   * an open request for a LONGER window. A longer window is more
   * exposure for both people, so one side asks and the other agrees;
   * `mine` says which side of that this viewer is on.
   */
  pending?: { mode: 'week' | 'always'; mine: boolean };
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
  /** plans this chat spans; >1 means the pair matched on more than one */
  planCount: number;
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
      expiresAt: new Date(Date.now() + 22 * 3_600_000).toISOString(),
      planCount: 1,
      messages: [
        { id: 'm1', from: 'them', text: 'saw your cast, i’m in', time: '5:02 pm' },
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
    ...(meta.proposed_mode
      ? { pending: { mode: meta.proposed_mode, mine: meta.proposed_by_me === true } }
      : {}),
    id: meta.conversation_id,
    withName: meta.other_first_name ?? 'someone',
    withId: meta.other_id,
    castTitle: meta.cast_title,
    mode: meta.mode,
    expiresLabel: expiresLabelFor(meta.mode, meta.expires_at),
    expiresAt: meta.mode === 'always' ? null : meta.expires_at,
    planCount: meta.plan_count ?? 1,
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

/**
 * Live in-app updates: when a request or a message lands anywhere that
 * concerns you, pull the interaction state and the chat list so the
 * alerts page and the dock counts move on their own, without a manual
 * refresh. Mounted once in the shell; a no-op with no backend.
 */
export function subscribeToActivity(onRefresh: () => void): () => void {
  return subscribeToMyActivity(() => {
    void refreshConversations();
    onRefresh();
  });
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
      planCount: row.plan_count ?? 1,
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

/**
 * Zero a conversation's unread in the LIST immediately.
 *
 * The dock's chats count and the chats page both read the
 * conversation summaries, not the open thread. markRead updates the
 * server and the thread, but the summary's unread lingered until the
 * next full list refresh — so the badge stayed up after you had plainly
 * read the chat. This clears it on the spot; the next refresh confirms
 * the same thing from the server.
 */
function clearListUnread(conversationId: string): void {
  let changed = false;
  const list = state.list.map((c) => {
    if (c.conversationId === conversationId && c.unread > 0) {
      changed = true;
      return { ...c, unread: 0 };
    }
    return c;
  });
  if (changed) {
    state = { ...state, list };
    emit();
  }
}

export function openConversation(conversationId: string): () => void {
  if (!chatEnabled()) return () => undefined;
  const read = () => {
    clearListUnread(conversationId);
    void markRead(conversationId);
  };
  void loadConversation(conversationId).then(read);
  const unsubscribe = subscribeToConversation(conversationId, () => {
    void loadConversation(conversationId).then(read);
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
  clearListUnread(conversationId);
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
 * Change the chat's window.
 *
 * A LONGER window is more exposure for both people, so it is asked for,
 * not taken: this records the request and the other side has to agree.
 * The same or shorter applies at once — pulling your own exposure in
 * never needs someone else's permission.
 *
 * The fixture build models the same two steps rather than flipping the
 * mode outright. It used to write "both of you agreed to keep this chat
 * open" after one person tapped it, which was the app claiming a
 * consent nobody had given.
 */
const MODE_RANK: Record<'ended' | 'day' | 'week' | 'always', number> = {
  ended: 0,
  day: 1,
  week: 2,
  always: 3,
};

export async function extendChat(threadId: string, mode: 'day' | 'week' | 'always'): Promise<void> {
  if (chatEnabled()) {
    await setMode(threadId, mode);
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread || thread.mode === 'ended') return;

  const longer = MODE_RANK[mode] > MODE_RANK[thread.mode];
  if (longer && (mode === 'week' || mode === 'always')) {
    const ask: Message = {
      id: `sys-ask-${thread.messages.length + 1}`,
      from: 'system',
      text:
        mode === 'always'
          ? 'this could stay open with no expiry. it takes you both.'
          : 'this could run 7 days. it takes you both.',
      time: 'now',
    };
    putThread({
      ...thread,
      pending: { mode, mine: true },
      messages: [...thread.messages, ask],
    });
    return;
  }

  const labels: Record<'day' | 'week' | 'always', string> = {
    day: '24h left',
    week: '7d left',
    always: 'open',
  };
  const noteText: Record<'day' | 'week' | 'always', string> = {
    day: 'the window is 24h now.',
    week: 'the window is 7 days now.',
    always: 'you both said yes. this one stays open.',
  };
  const note: Message = {
    id: `sys-extend-${thread.messages.length + 1}`,
    from: 'system',
    text: noteText[mode],
    time: 'now',
  };
  const expiresAt: Record<'day' | 'week' | 'always', string | null> = {
    day: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    week: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
    always: null,
  };
  const { pending: _dropped, ...rest } = thread;
  putThread({
    ...rest,
    mode,
    expiresLabel: labels[mode],
    expiresAt: expiresAt[mode],
    messages: [...thread.messages, note],
  });
}

/**
 * Answer an open request for a longer window.
 *
 * Accepting is the OTHER side's move — that is what makes "you both
 * agreed" true. Either side may clear it with `accept: false`: from the
 * person who asked that is a withdrawal, from the other a decline.
 */
export async function answerWindowRequest(threadId: string, accept: boolean): Promise<void> {
  if (chatEnabled()) {
    await respondToModeProposal(threadId, accept);
    await loadConversation(threadId);
    return;
  }
  const thread = state.threads[threadId];
  if (!thread?.pending) return;
  const wanted = thread.pending.mode;
  const { pending: _cleared, ...rest } = thread;
  const note: Message = {
    id: `sys-answer-${thread.messages.length + 1}`,
    from: 'system',
    text: accept
      ? wanted === 'always'
        ? 'you both said yes. this one stays open.'
        : 'you both said yes. 7 days.'
      : 'the window stays as it is.',
    time: 'now',
  };
  putThread({
    ...rest,
    ...(accept
      ? {
          mode: wanted,
          expiresLabel: wanted === 'always' ? 'open' : '7d left',
          expiresAt: wanted === 'always' ? null : new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
        }
      : {}),
    messages: [...thread.messages, note],
  });
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
    text: 'this chat is closed. nothing more comes through.',
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
        expiresAt: null,
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
