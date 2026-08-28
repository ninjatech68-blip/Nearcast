import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSupabase = vi.fn();
vi.mock('@/infrastructure/supabase/client', () => ({
  getSupabase: () => mockGetSupabase(),
}));

const { fetchMessages, sendText, sendLocationShare, markRead, setMode, subscribeToConversation } =
  await import('./remote-chat');

function withRpc(impl: (name: string, args: unknown) => { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async (name: string, args: unknown) => impl(name, args));
  mockGetSupabase.mockReturnValue({ rpc });
  return rpc;
}

beforeEach(() => mockGetSupabase.mockReset());

describe('reads', () => {
  it('returns [] with no backend rather than throwing', async () => {
    mockGetSupabase.mockReturnValue(null);
    expect(await fetchMessages('c1')).toEqual([]);
  });

  it('throws when the read fails so empty and broken stay distinct', async () => {
    withRpc(() => ({ data: null, error: { message: 'boom' } }));
    await expect(fetchMessages('c1')).rejects.toThrow(/boom/);
  });
});

describe('sends', () => {
  it('sends text with the conversation id', async () => {
    const rpc = withRpc(() => ({ error: null }));
    await sendText('c1', 'hi');
    expect(rpc).toHaveBeenCalledWith('send_message', { target_conversation_id: 'c1', message_body: 'hi' });
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
