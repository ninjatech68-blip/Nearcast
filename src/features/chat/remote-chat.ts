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
import * as ImageManipulator from 'expo-image-manipulator';
import * as tus from 'tus-js-client';

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
  /** how many plans this one chat now spans (a pair can match on several) */
  plan_count: number | null;
};

export type RemoteMessage = {
  id: string;
  client_message_id: string | null;
  sender_id: string | null;
  body: string;
  is_system: boolean;
  is_mine: boolean;
  latitude: number | null;
  longitude: number | null;
  place_label: string | null;
  media_path: string | null;
  media_thumb_path: string | null;
  media_kind: string | null;
  media_width: number | null;
  media_height: number | null;
  created_at: string;
  remote_status: 'sent' | 'delivered' | 'read' | null;
};

/** what the picker handed us, before it becomes a message. */
export type LocalMedia = {
  uri: string;
  kind: 'image' | 'gif';
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
};

export type MessageCursor = {
  id: string;
  createdAt: string;
};

export type MessagePage = {
  messages: readonly RemoteMessage[];
  hasOlder: boolean;
};

export type SignedMediaVariant =
  | { kind: 'image'; width: number; height?: number }
  | { kind: 'gif' }
  | { kind: 'original' };

export const CHAT_MEDIA_BUCKET = 'chat-media';
const MESSAGE_PAGE_SIZE = 40;
const MESSAGE_PAGE_FETCH = MESSAGE_PAGE_SIZE + 1;
const MESSAGE_INCREMENTAL_FETCH = 100;
const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.72;
const PHOTO_THUMB_MAX_DIMENSION = 480;
const PHOTO_THUMB_JPEG_QUALITY = 0.58;
const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 6 * 1024 * 1024;
const RESUMABLE_UPLOAD_CHUNK_SIZE = 6 * 1024 * 1024;

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

export async function fetchMessagesPage(
  conversationId: string,
  before?: MessageCursor,
): Promise<MessagePage> {
  const c = getSupabase();
  if (!c) return { messages: [], hasOlder: false };
  const { data, error } = await c.rpc('conversation_messages_page', {
    target_conversation_id: conversationId,
    page_size: MESSAGE_PAGE_FETCH,
    ...(before
      ? {
          before_created_at: before.createdAt,
          before_id: before.id,
        }
      : {}),
  });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as unknown as RemoteMessage[]);
  return {
    messages: rows.length > MESSAGE_PAGE_SIZE ? rows.slice(rows.length - MESSAGE_PAGE_SIZE) : rows,
    hasOlder: rows.length > MESSAGE_PAGE_SIZE,
  };
}

export async function fetchMessagesAfter(
  conversationId: string,
  after: MessageCursor,
): Promise<readonly RemoteMessage[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.rpc('conversation_messages_after', {
    target_conversation_id: conversationId,
    after_created_at: after.createdAt,
    after_id: after.id,
    page_size: MESSAGE_INCREMENTAL_FETCH,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RemoteMessage[];
}

export async function sendText(conversationId: string, body: string): Promise<void> {
  await sendTextWithClientId(conversationId, body, null);
}

export async function sendTextWithClientId(
  conversationId: string,
  body: string,
  clientMessageId: string | null,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('send_message', {
    target_conversation_id: conversationId,
    message_body: body,
    ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
  });
  if (error) throw new Error(error.message);
}

export async function sendLocationShare(
  conversationId: string,
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> {
  await sendLocationShareWithClientId(conversationId, latitude, longitude, label, null);
}

export async function sendLocationShareWithClientId(
  conversationId: string,
  latitude: number,
  longitude: number,
  label: string | null | undefined,
  clientMessageId: string | null,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');
  const { error } = await c.rpc('send_location', {
    target_conversation_id: conversationId,
    share_latitude: latitude,
    share_longitude: longitude,
    ...(label?.trim() ? { label: label.trim() } : {}),
    ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
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
  clientMessageId?: string | null,
): Promise<void> {
  const c = getSupabase();
  if (!c) throw new Error('no backend configured');

  const prepared = await prepareMediaForUpload(media);
  const extension = extensionFor(prepared);
  const assetId = cryptoId();
  const path = `${conversationId}/${assetId}.${extension}`;
  const thumb = await thumbnailFor(prepared);
  const thumbPath = thumb ? `${conversationId}/thumb-${assetId}.jpg` : null;
  await uploadMediaObject(c, path, prepared, extension);
  if (thumb && thumbPath) await uploadMediaObject(c, thumbPath, thumb, 'jpg');

  const { error } = await c.rpc('send_media', {
    target_conversation_id: conversationId,
    path,
    kind: prepared.kind,
    ...(thumbPath ? { thumb_path: thumbPath } : {}),
    ...(prepared.width ? { width: Math.round(prepared.width) } : {}),
    ...(prepared.height ? { height: Math.round(prepared.height) } : {}),
    ...(caption?.trim() ? { caption: caption.trim() } : {}),
    ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
  });
  if (!error) return;

  await c.storage.from(CHAT_MEDIA_BUCKET).remove(thumbPath ? [path, thumbPath] : [path]);
  throw new Error(error.message);
}

/**
 * A short-lived URL for one stored object.
 *
 * The bucket is private, so there is no permanent URL to cache and
 * nothing to leak if a message row is ever seen by someone who should
 * not have it. An hour is long enough to look at a photo and short
 * enough that a copied link stops working.
 */
export async function signedMediaUrl(
  path: string,
  variant: SignedMediaVariant = { kind: 'original' },
): Promise<string | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(path, 3600, {
    ...(variant.kind === 'image'
      ? {
          transform: {
            width: variant.width,
            ...(variant.height ? { height: variant.height } : {}),
            resize: 'contain',
          },
        }
      : {}),
  });
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function markConversationDelivered(conversationId: string): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  const { error } = await c.rpc('mark_conversation_delivered', {
    target_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message);
}

function extensionFor(media: LocalMedia): string {
  if (media.kind === 'gif') return 'gif';
  if (media.mimeType === 'image/jpeg') return 'jpg';
  const fromUri = media.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (fromUri && /^(jpg|jpeg|png|heic|webp)$/.test(fromUri)) return fromUri;
  return 'jpg';
}

async function prepareMediaForUpload(media: LocalMedia): Promise<LocalMedia> {
  if (media.kind === 'gif') return media;
  const resize = resizeWithin(media.width, media.height, PHOTO_MAX_DIMENSION);
  const manipulated = await ImageManipulator.manipulateAsync(
    media.uri,
    resize ? [{ resize }] : [],
    { compress: PHOTO_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    uri: manipulated.uri,
    kind: 'image',
    width: manipulated.width,
    height: manipulated.height,
    mimeType: 'image/jpeg',
    fileSize: media.fileSize,
  };
}

async function thumbnailFor(media: LocalMedia): Promise<LocalMedia | null> {
  if (media.kind !== 'image') return null;
  const resize = resizeWithin(media.width, media.height, PHOTO_THUMB_MAX_DIMENSION);
  const manipulated = await ImageManipulator.manipulateAsync(
    media.uri,
    resize ? [{ resize }] : [],
    { compress: PHOTO_THUMB_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    uri: manipulated.uri,
    kind: 'image',
    width: manipulated.width,
    height: manipulated.height,
    mimeType: 'image/jpeg',
  };
}

function resizeWithin(
  width: number | undefined,
  height: number | undefined,
  maxDimension: number,
): { width?: number; height?: number } | null {
  if (!width || !height) return null;
  const largest = Math.max(width, height);
  if (largest <= maxDimension) return null;
  const scale = maxDimension / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function uploadMediaObject(
  client: NonNullable<ReturnType<typeof getSupabase>>,
  path: string,
  media: LocalMedia,
  extension: string,
): Promise<void> {
  if (shouldUseResumableUpload(media)) {
    await uploadMediaResumable(client, path, media, extension);
    return;
  }

  const response = await fetch(media.uri);
  const bytes = await response.arrayBuffer();
  const { error } = await client.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: media.mimeType ?? mimeFor(extension), upsert: false });
  if (error) throw new Error(error.message);
}

function shouldUseResumableUpload(media: LocalMedia): boolean {
  return (media.fileSize ?? 0) > RESUMABLE_UPLOAD_THRESHOLD_BYTES;
}

async function uploadMediaResumable(
  client: NonNullable<ReturnType<typeof getSupabase>>,
  path: string,
  media: LocalMedia,
  extension: string,
): Promise<void> {
  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('no active session');

  const file = {
    uri: media.uri,
    name: path.split('/').pop() ?? `upload.${extension}`,
    type: media.mimeType ?? mimeFor(extension),
  };

  await new Promise<void>((resolve, reject) => {
    // tus-js-client supports React Native uri objects at runtime, but
    // its published TS types still describe browser/file inputs only.
    const upload = new tus.Upload(file as unknown as Blob, {
      endpoint: resumableUploadEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: CHAT_MEDIA_BUCKET,
        objectName: path,
        contentType: media.mimeType ?? mimeFor(extension),
        cacheControl: '3600',
      },
      chunkSize: RESUMABLE_UPLOAD_CHUNK_SIZE,
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });
}

function resumableUploadEndpoint(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('missing EXPO_PUBLIC_SUPABASE_URL');
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
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
/**
 * Wake on activity that changes what is waiting for you, app-wide:
 * a new response on any cast (a request, an accept), and any new
 * message. RLS scopes both, so you only ever wake for your own. The
 * handler just says "something changed"; the caller re-reads through the
 * RPCs, keeping the database the source of truth and Realtime the nudge.
 *
 * Returns an unsubscribe, and a no-op one with no backend.
 */
export function subscribeToMyActivity(onChange: () => void): () => void {
  const c = getSupabase();
  if (!c) return () => undefined;
  const channel: RealtimeChannel = c
    .channel('my-activity')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, () => onChange())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => onChange())
    .subscribe();
  return () => {
    void c.removeChannel(channel);
  };
}

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
