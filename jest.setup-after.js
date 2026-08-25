// Component tests must never reach the network. Screens receive a fake client
// whose responses individual tests can override.
const emptyResult = { data: [], error: null };

function queryBuilder(result) {
  const builder = {};
  const chain = ['select', 'eq', 'gt', 'is', 'order', 'limit', 'insert', 'upsert', 'update'];
  chain.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
  builder.single = jest.fn(async () => ({ data: null, error: null }));
  builder.then = (resolve) => Promise.resolve(result).then(resolve);
  return builder;
}

const mockSupabase = {
  from: jest.fn(() => queryBuilder(emptyResult)),
  rpc: jest.fn(async () => ({ data: null, error: null })),
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithOAuth: jest.fn(async () => ({ data: null, error: new Error('not configured') })),
    signOut: jest.fn(async () => ({ error: null })),
  },
};

jest.mock('@/infrastructure/supabase/client', () => ({ supabase: mockSupabase }));

globalThis.__nearcastSupabaseMock = mockSupabase;
