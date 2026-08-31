/**
 * expo-sqlite/kv-store, for the web mockup export only.
 *
 * expo-sqlite's web worker imports ./wa-sqlite/wa-sqlite.wasm, which the
 * published package does not ship, so any web bundle that touches storage
 * fails to resolve. The app only uses this as a synchronous key-value
 * store, so an in-memory Map is behaviourally identical for a render that
 * never outlives the page.
 *
 * Reached only when NEARCAST_WEB_MOCKUP=1 (see metro.config.js). Nothing
 * in a native build resolves through here.
 */
// Backed by localStorage rather than a Map: the capture navigates by URL,
// which is a full page load, and an in-memory store would drop the session
// on every hop and bounce the shell gate back to /signin.
const mem = {
  get: (k) => { try { return globalThis.localStorage?.getItem('nc:' + k); } catch { return null; } },
  set: (k, v) => { try { globalThis.localStorage?.setItem('nc:' + k, v); } catch {} },
  del: (k) => { try { globalThis.localStorage?.removeItem('nc:' + k); } catch {} },
  keys: () => { try { return Object.keys(globalThis.localStorage ?? {}).filter((k) => k.startsWith('nc:')).map((k) => k.slice(3)); } catch { return []; } },
  clear: () => { try { for (const k of mem.keys()) mem.del(k); } catch {} },
  has: (k) => mem.get(k) !== null,
};
const Storage = {
  getItemSync: (k) => mem.get(k),
  setItemSync: (k, v) => mem.set(k, String(v)),
  removeItemSync: (k) => mem.del(k),
  getItem: async (k) => mem.get(k),
  setItem: async (k, v) => mem.set(k, String(v)),
  removeItem: async (k) => mem.del(k),
  clear: async () => mem.clear(),
  getAllKeys: async () => mem.keys(),
};
module.exports = Storage;
module.exports.default = Storage;
module.exports.Storage = Storage;
