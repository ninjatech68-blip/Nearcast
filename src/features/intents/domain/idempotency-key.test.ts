import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIdempotencyKey } from './idempotency-key';

const originalCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: originalCrypto,
    configurable: true,
    writable: true,
  });
  vi.restoreAllMocks();
});

describe('createIdempotencyKey', () => {
  it('uses randomUUID when the runtime provides it', () => {
    const randomUUID = vi.fn(() => 'uuid-123');
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID },
      configurable: true,
      writable: true,
    });

    expect(createIdempotencyKey()).toBe('uuid-123');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generated key when crypto.randomUUID is missing', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.spyOn(Date, 'now').mockReturnValue(1_726_739_200_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(createIdempotencyKey()).toBe('nearcast-m193xpts-4fzzzxjylr');
  });
});
