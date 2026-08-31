import { describe, expect, it } from 'vitest';

import {
  CHAT_POLL_LIVE_MS,
  CHAT_POLL_MS,
  SHELL_POLL_LIVE_MS,
  SHELL_POLL_MS,
  chatPollMs,
  shellPollMs,
} from './cadence';

describe('poll cadence', () => {
  it('polls fast when the socket is not carrying — polling IS delivery then', () => {
    expect(chatPollMs(false)).toBe(CHAT_POLL_MS);
    expect(shellPollMs(false)).toBe(SHELL_POLL_MS);
  });

  it('idles when realtime is live, because the tick would re-fetch what already arrived', () => {
    expect(chatPollMs(true)).toBe(CHAT_POLL_LIVE_MS);
    expect(shellPollMs(true)).toBe(SHELL_POLL_LIVE_MS);
  });

  it('never slows the open thread below a floor a person would notice', () => {
    // a socket that silently stops delivering must not freeze the screen
    // indefinitely; the live cadence is still a real safety net.
    expect(chatPollMs(true)).toBeLessThanOrEqual(15_000);
  });

  it('keeps the open thread at least as fresh as the shell in both states', () => {
    expect(chatPollMs(true)).toBeLessThanOrEqual(shellPollMs(true));
    expect(chatPollMs(false)).toBeLessThanOrEqual(shellPollMs(false));
  });

  it('is a real saving, not a rounding difference', () => {
    expect(chatPollMs(true) / chatPollMs(false)).toBeGreaterThanOrEqual(4);
    expect(shellPollMs(true) / shellPollMs(false)).toBeGreaterThanOrEqual(3);
  });
});
