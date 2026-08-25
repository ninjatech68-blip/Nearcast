// expo-sqlite's localStorage shim opens a real database at import time, which
// the Jest environment cannot provide. Supply an in-memory store instead.
const store = new Map();

globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
  key: (index) => Array.from(store.keys())[index] ?? null,
  get length() {
    return store.size;
  },
};
