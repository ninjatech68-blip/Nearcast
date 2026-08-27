export function createIdempotencyKey(): string {
  const maybeUuid = globalThis.crypto?.randomUUID;
  if (typeof maybeUuid === 'function') {
    return maybeUuid.call(globalThis.crypto);
  }

  return `nearcast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
