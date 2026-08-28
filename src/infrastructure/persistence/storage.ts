/**
 * Durable key-value storage for the session stores.
 *
 * Backed by `expo-sqlite/kv-store`, which gives us SYNCHRONOUS reads
 * (getItemSync). That matters: every store hydrates at module load,
 * before the first render, so the app never flashes empty state and
 * then pops into the persisted one.
 *
 * Degrades to an in-memory Map when the native module isn't there —
 * jest, vitest, and any non-device runtime. Tests then behave exactly
 * as they did when the stores were purely in-memory.
 *
 * Every record is namespaced and versioned. Bumping SCHEMA_VERSION
 * invalidates everything previously written, which is the escape
 * hatch when a store's shape changes in a way old data can't satisfy.
 * That is far safer than trying to migrate fixture-era rows.
 */

/**
 * Bump this when a persisted store's shape changes incompatibly.
 * Old records are then ignored and the store falls back to its seed.
 */
const SCHEMA_VERSION = 1;
const NAMESPACE = `nearcast.v${SCHEMA_VERSION}`;

type SyncKeyValue = {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): boolean;
};

function memoryBackend(): SyncKeyValue {
  const map = new Map<string, string>();
  return {
    getItemSync: (key) => map.get(key) ?? null,
    setItemSync: (key, value) => {
      map.set(key, value);
    },
    removeItemSync: (key) => map.delete(key),
  };
}

function resolveBackend(): { backend: SyncKeyValue; durable: boolean } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-sqlite/kv-store');
    const store = (mod?.default ?? mod?.Storage) as SyncKeyValue | undefined;
    if (store && typeof store.getItemSync === 'function') {
      return { backend: store, durable: true };
    }
  } catch {
    // not on a device (jest/vitest/node) — fall through to memory
  }
  return { backend: memoryBackend(), durable: false };
}

const { backend, durable } = resolveBackend();

/** true when writes actually survive an app restart. */
export function isDurable(): boolean {
  return durable;
}

function fullKey(key: string): string {
  return `${NAMESPACE}.${key}`;
}

/**
 * JSON revival for Date fields. JSON.stringify turns a Date into an
 * ISO string; without this the attendance store would come back with
 * strings where it expects Dates and every comparison would break.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}

/**
 * Read a persisted value. Returns `fallback` when nothing is stored,
 * or when the stored record can't be parsed (corrupt write, shape
 * change under the same schema version). Never throws.
 */
export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = backend.getItemSync(fullKey(key));
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw, reviveDates) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Write a value. Fire-and-forget: a failed write must never break a
 * user action, so errors are swallowed. Writes are debounced per key
 * because stores emit on every mutation and several can land in one
 * tick (accept a join → slot fills → activity rows recompute).
 */
type PendingWrite = { handle: ReturnType<typeof setTimeout>; value: unknown };

const pending = new Map<string, PendingWrite>();
const WRITE_DEBOUNCE_MS = 120;

function writeNow(key: string, value: unknown): void {
  try {
    backend.setItemSync(fullKey(key), JSON.stringify(value));
  } catch {
    // storage full or unavailable — the in-memory store is still
    // correct for this session, so keep going.
  }
}

export function saveState(key: string, value: unknown): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.handle);
  const handle = setTimeout(() => {
    pending.delete(key);
    writeNow(key, value);
  }, WRITE_DEBOUNCE_MS);
  // keep the value with the timer so flushWrites() can actually
  // write it rather than just dropping it.
  pending.set(key, { handle, value });
}

/** Drop one persisted record (used by sign-out and test resets). */
export function clearState(key: string): void {
  const queued = pending.get(key);
  if (queued) {
    clearTimeout(queued.handle);
    pending.delete(key);
  }
  try {
    backend.removeItemSync(fullKey(key));
  } catch {
    // nothing to do
  }
}

/**
 * Write every debounced value immediately. Call this when the app is
 * about to lose the foreground — without it, a change made inside the
 * debounce window is lost if the user force-quits right after.
 */
export function flushWrites(): void {
  for (const [key, { handle, value }] of pending) {
    clearTimeout(handle);
    writeNow(key, value);
  }
  pending.clear();
}

/** Drop debounced writes WITHOUT writing them. Used before a wipe. */
export function cancelPendingWrites(): void {
  for (const { handle } of pending.values()) clearTimeout(handle);
  pending.clear();
}

/** The keys each store owns. Central so sign-out can clear them all. */
export const STORAGE_KEYS = {
  me: 'me',
  casts: 'casts',
  chat: 'chat',
  attendance: 'attendance',
  circles: 'circles',
} as const;

/**
 * Stores register a reset here so sign-out can wipe in-memory state
 * too, not just the persisted record. Doing it through a registry
 * rather than direct imports keeps the stores from importing each
 * other (me-store ← casts-store ← me-store would be a cycle).
 */
type ResetFn = () => void;
const resetters = new Set<ResetFn>();

export function registerStoreReset(reset: ResetFn): void {
  resetters.add(reset);
}

/**
 * Wipe every persisted record AND every registered store's in-memory
 * state. Called on sign-out: a signed-out device must not still hold
 * the last person's casts, chats, receipts, or circles.
 */
export function clearAllState(): void {
  // cancel, don't flush — a queued write from before sign-out must
  // not land after the wipe.
  cancelPendingWrites();
  for (const key of Object.values(STORAGE_KEYS)) clearState(key);
  for (const reset of resetters) {
    try {
      reset();
    } catch {
      // one store failing to reset must not block the others
    }
  }
}
