/**
 * Idempotency key for a publish attempt.
 *
 * The column is a Postgres uuid, so the fallback has to produce a well-formed
 * 8-4-4-4-12 value rather than an arbitrary unique string.
 */
export function newRequestKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid !== undefined) return uuid;

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    const digit = character === 'x' ? value : (value % 4) + 8;

    return digit.toString(16);
  });
}
