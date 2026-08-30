import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabase = vi.fn();
const manipulateAsync = vi.fn();
const tusFindPreviousUploads = vi.fn();
const tusResumeFromPreviousUpload = vi.fn();
const tusStart = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: unknown[]) => manipulateAsync(...args),
  SaveFormat: { JPEG: 'jpeg' },
}));
vi.mock('tus-js-client', () => ({
  Upload: class {
    constructor(_file: unknown, private readonly options: { onSuccess: () => void }) {}
    findPreviousUploads() {
      return tusFindPreviousUploads();
    }
    resumeFromPreviousUpload(upload: unknown) {
      tusResumeFromPreviousUpload(upload);
    }
    start() {
      tusStart();
      this.options.onSuccess();
    }
  },
}));

const {
  fetchMessages,
  fetchMessagesAfter,
  fetchMessagesPage,
  markConversationDelivered,
  sendMediaMessage,
  sendText,
  sendTextWithClientId,
  sendLocationShare,
  markRead,
  setMode,
  subscribeToConversation,
  touchConversationPresence,
  clearConversationPresence,
} =
  await import('./remote-chat');

function withRpc(impl: (name: string, args: unknown) => { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (name: string, args: unknown) => impl(name, args));
  mockGetSupabase.mockReturnValue({ rpc });
  return rpc;
}

beforeEach(() => mockGetSupabase.mockReset());
beforeEach(() => manipulateAsync.mockReset());
beforeEach(() => tusFindPreviousUploads.mockReset());
beforeEach(() => tusResumeFromPreviousUpload.mockReset());
beforeEach(() => tusStart.mockReset());

describe('reads', () => {
  it('returns [] with no backend rather than throwing', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(await fetchMessages('c1')).toEqual([]);
  });

  it('throws when the read fails so empty and broken stay distinct', async () => {
    withRpc(() => ({ data: null, error: { message: 'boom' } }));
    await expect(fetchMessages('c1')).rejects.toThrow(/boom/);
  });

  it('fetches one recent page and exposes whether older rows exist', async () => {
    withRpc((name) =>
      name === 'conversation_messages_page'
        ? {
            data: Array.from({ length: 41 }, (_, i) => ({
              id: `${i + 1}`,
              created_at: `2026-08-30T00:00:${String(i).padStart(2, '0')}Z`,
            })),
            error: null,
          }
        : { data: null, error: null },
    );
    const page = await fetchMessagesPage('c1');
    expect(page.messages).toHaveLength(40);
    expect(page.hasOlder).toBe(true);
  });

  it('fetches only rows after a cursor for incremental sync', async () => {
    const rpc = withRpc(() => ({ data: [], error: null }));
    await fetchMessagesAfter('c1', { id: 'm3', createdAt: '2026-08-30T00:00:03Z' });
    expect(rpc).toHaveBeenCalledWith('conversation_messages_after', {
      target_conversation_id: 'c1',
      after_created_at: '2026-08-30T00:00:03Z',
      after_id: 'm3',
      page_size: 100,
    });
  });
});

describe('sends', () => {
  it('sends text with the conversation id', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await sendText('c1', 'hi');
    expect(rpc).toHaveBeenCalledWith('send_message', { target_conversation_id: 'c1', message_body: 'hi' });
  });

  it('includes a stable client message id when provided', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await sendTextWithClientId('c1', 'hi', 'msg-123');
    expect(rpc).toHaveBeenCalledWith('send_message', {
      target_conversation_id: 'c1',
      message_body: 'hi',
      client_message_id: 'msg-123',
    });
  });

  it('surfaces an ended conversation as an error', async () => {
    withRpc(() => ({ error: { message: 'conversation_ended' } }));
    await expect(sendText('c1', 'hi')).rejects.toThrow(/ended/);
  });

  it('shares a location, omitting a null label', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await sendLocationShare('c1', 12.34, 56.78);
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.share_latitude).toBe(12.34);
    expect(args).not.toHaveProperty('label');
  });

  it('includes a label when given', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await sendLocationShare('c1', 1, 2, 'the gate');
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.label).toBe('the gate');
  });

  it('compresses photos before upload and records the message', async () => {
    manipulateAsync.mockResolvedValue({
      uri: 'file:///tmp/compressed.jpg',
      width: 1200,
      height: 900,
    });
    global.fetch = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue({
      rpc,
      storage: { from: () => ({ upload, remove }) },
    });

    await sendMediaMessage('c1', { uri: 'file:///tmp/original.heic', kind: 'image', width: 2400, height: 1800 });

    expect(manipulateAsync).toHaveBeenCalled();
    expect(upload).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      'send_media',
      expect.objectContaining({
        target_conversation_id: 'c1',
        kind: 'image',
        width: 1200,
        height: 900,
        thumb_path: expect.stringContaining('c1/thumb-'),
      }),
    );
  });

  it('cleans up the uploaded object when the message write fails', async () => {
    manipulateAsync.mockResolvedValue({
      uri: 'file:///tmp/compressed.jpg',
      width: 800,
      height: 600,
    });
    global.fetch = vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as unknown as typeof fetch;
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue({
      rpc: vi.fn(async () => ({ error: { message: 'write failed' } })),
      storage: { from: () => ({ upload, remove }) },
    });

    await expect(sendMediaMessage('c1', { uri: 'file:///tmp/original.jpg', kind: 'image' })).rejects.toThrow(/write failed/);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('uses resumable upload for large media files', async () => {
    manipulateAsync.mockResolvedValue({
      uri: 'file:///tmp/compressed.jpg',
      width: 1200,
      height: 900,
    });
    tusFindPreviousUploads.mockResolvedValue([{ id: 'prev' }]);
    const rpc = vi.fn(async () => ({ error: null }));
    const upload = vi.fn(async () => ({ error: null }));
    mockGetSupabase.mockReturnValue({
      rpc,
      auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'token' } } })) },
      storage: { from: () => ({ upload, remove: vi.fn(async () => ({ error: null })) }) },
    });
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://iichoutwafrmrwdyeqsi.supabase.co';

    await sendMediaMessage(
      'c1',
      { uri: 'file:///tmp/original.heic', kind: 'image', width: 2400, height: 1800, fileSize: 7 * 1024 * 1024 },
      'caption',
      'msg-456',
    );

    expect(tusFindPreviousUploads).toHaveBeenCalled();
    expect(tusResumeFromPreviousUpload).toHaveBeenCalledWith({ id: 'prev' });
    expect(tusStart).toHaveBeenCalled();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      'send_media',
      expect.objectContaining({
        client_message_id: 'msg-456',
        target_conversation_id: 'c1',
        thumb_path: expect.stringContaining('c1/thumb-'),
      }),
    );
  });
});

describe('mark read', () => {
  it('is a no-op without a backend', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(markRead('c1')).resolves.toBeUndefined();
  });
  it('targets the conversation', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await markRead('c1');
    expect(rpc).toHaveBeenCalledWith('mark_conversation_read', { target_conversation_id: 'c1' });
  });
  it('can mark a conversation delivered without reading it yet', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await markConversationDelivered('c1');
    expect(rpc).toHaveBeenCalledWith('mark_conversation_delivered', { target_conversation_id: 'c1' });
  });
});

describe('set mode', () => {
  it('passes the next mode through', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await setMode('c1', 'ended');
    expect(rpc).toHaveBeenCalledWith('set_conversation_mode', {
      target_conversation_id: 'c1',
      next_mode: 'ended',
    });
  });
});

describe('realtime subscription', () => {
  it('does nothing and returns a noop unsubscribe with no backend', () => {
    mockGetSupabase.mockReturnValue(null);
    const unsub = subscribeToConversation('c1', () => undefined);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('subscribes to inserts on the conversation and re-reads on wake', () => {
    const handlers: (() => void)[] = [];
    const channel = {
      on: (_evt: string, _filter: unknown, cb: () => void) => {
        handlers.push(cb);
        return channel;
      },
      subscribe: () => channel,
    };
    const removeChannel = vi.fn();
    mockGetSupabase.mockReturnValue({ channel: () => channel, removeChannel });
    const onInsert = vi.fn();
    const unsub = subscribeToConversation('c1', onInsert);
    handlers[0]();
    expect(onInsert).toHaveBeenCalled();
    unsub();
    expect(removeChannel).toHaveBeenCalled();
  });
});

describe('presence', () => {
  it('claims the open chat so the server suppresses a redundant push', async () => {
    const rpc = withRpc(() => ({ data: null, error: null }));
    await touchConversationPresence('c1');
    expect(rpc).toHaveBeenCalledWith('touch_conversation_presence', {
      target_conversation_id: 'c1',
    });
  });

  it('releases the chat on the way out', async () => {
    const rpc = withRpc(() => ({ data: null, error: null }));
    await clearConversationPresence('c1');
    expect(rpc).toHaveBeenCalledWith('clear_conversation_presence', {
      target_conversation_id: 'c1',
    });
  });

  it('does not throw when presence fails — a redundant push beats a crash', async () => {
    withRpc(() => ({ data: null, error: { message: 'offline' } }));
    await expect(touchConversationPresence('c1')).resolves.toBeUndefined();
    await expect(clearConversationPresence('c1')).resolves.toBeUndefined();
  });

  it('is a no-op with no backend', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(touchConversationPresence('c1')).resolves.toBeUndefined();
    await expect(clearConversationPresence('c1')).resolves.toBeUndefined();
  });
});
