/**
 * Thin re-export of the local `nearcast-places` native module, with a
 * safe stub when the module hasn't been linked yet (e.g. before the
 * next prebuild+rebuild round). Keeps typecheck + jest green without
 * requiring the JS bundle to physically resolve the module.
 */

type NativeSuggestion = { id: string; primary: string; secondary: string };
type NativeCoord = { latitude: number; longitude: number; formatted: string };

type NativeApi = {
  isAvailable(): boolean;
  search(query: string, bias?: { latitude: number; longitude: number; span?: number }): Promise<readonly NativeSuggestion[]>;
  resolve(id: string): Promise<NativeCoord | null>;
};

const stub: NativeApi = {
  isAvailable: () => false,
  search: async () => [],
  resolve: async () => null,
};

/**
 * The wrapper — `nearcast-places` — is a locally-linked Expo module.
 * On a dev tree that hasn't run prebuild yet the require will fail
 * and we stay on the stub, so JS tests + typecheck still work.
 */

// Metro resolves this at runtime after `npm install` links the local
// module. Wrapping in try/catch means an unbuilt dev tree still runs.
let api: NativeApi = stub;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('nearcast-places') as NativeApi;
  if (mod && typeof mod.isAvailable === 'function') {
    api = mod;
  }
} catch {
  // module not linked yet — stay on stub.
}

export const isAvailable = () => api.isAvailable();
export const search = (query: string, bias?: { latitude: number; longitude: number; span?: number }) =>
  api.search(query, bias);
export const resolve = (id: string) => api.resolve(id);
export type { NativeSuggestion, NativeCoord };
