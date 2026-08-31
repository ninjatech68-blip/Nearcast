import { z } from 'zod';

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appEnv: 'local' | 'staging' | 'production';
};

export function parsePublicEnv(source: Record<string, unknown>): PublicEnv {
  const parsed = publicEnvSchema.parse(source);

  return {
    supabaseUrl: parsed.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: parsed.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    appEnv: parsed.EXPO_PUBLIC_APP_ENV,
  };
}

/**
 * Absent, invalid, or configured — three states, not two.
 *
 * `parsePublicEnv` throws on anything malformed, and the Supabase client
 * used to read every throw as "no backend is configured" and fall through
 * to fixtures. That conflated two very different situations. Nothing
 * supplied is a deliberate fixture build. A misspelled `EXPO_PUBLIC_APP_ENV`
 * beside a perfectly good project URL is a mistake, and answering it with
 * fabricated data that a tester cannot distinguish from real activity is
 * the worst available response: it breaks the first product rule, and it
 * breaks it invisibly.
 *
 * So absence and invalidity are separated here, and every problem is
 * reported at once so one rebuild fixes all of them.
 *
 * Pure: no React Native, no Supabase.
 */

export type EnvClassification =
  | { kind: 'absent' }
  | { kind: 'invalid'; problems: string[] }
  | { kind: 'configured'; env: PublicEnv };

const ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_APP_ENV',
] as const;

function supplied(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export function classifyPublicEnv(source: Record<string, unknown>): EnvClassification {
  // `EXPO_PUBLIC_APP_ENV` alone is not configuration: `.env.example` ships
  // it set to `local` with the other two blank, which is the fixture build.
  const hasBackend =
    supplied(source.EXPO_PUBLIC_SUPABASE_URL) ||
    supplied(source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!hasBackend) return { kind: 'absent' };

  const trimmed: Record<string, unknown> = {};
  for (const key of ENV_KEYS) {
    const value = source[key];
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  }

  const parsed = publicEnvSchema.safeParse(trimmed);

  if (parsed.success) {
    return {
      kind: 'configured',
      env: {
        supabaseUrl: parsed.data.EXPO_PUBLIC_SUPABASE_URL,
        supabasePublishableKey: parsed.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        appEnv: parsed.data.EXPO_PUBLIC_APP_ENV,
      },
    };
  }

  // One line per variable, naming the variable, because the person reading
  // this is looking at a build log or a blocked screen, not a stack trace.
  const problems = parsed.error.issues.map((issue) => {
    const key = issue.path[0];
    const name = typeof key === 'string' ? key : 'config';

    if (name === 'EXPO_PUBLIC_APP_ENV') {
      return `${name} must be one of local, staging, production`;
    }
    if (name === 'EXPO_PUBLIC_SUPABASE_URL') {
      return `${name} must be a full URL, such as https://your-ref.supabase.co`;
    }
    if (name === 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
      return `${name} is missing`;
    }
    return `${name}: ${issue.message}`;
  });

  return { kind: 'invalid', problems };
}

/** How the app is running, as far as data is concerned. */
export type BackendMode = 'live' | 'fixtures' | 'misconfigured';

/**
 * Whether this build must refuse to run, and what to say.
 *
 * A release build on fixtures shows a person activity that did not happen,
 * and unlike a developer they have no way to tell. The rule against
 * fabricating activity does not carve out an exception for "we forgot the
 * environment file", so the build is stopped rather than logged about.
 *
 * Fixtures stay legitimate outside a release build: that is how the test
 * suites run and how a screen can be worked on offline. A misconfiguration
 * is blocked in both, because nobody ever means it.
 */
export function releaseBlock(input: {
  isRelease: boolean;
  mode: BackendMode;
  reason: string;
}): { title: string; detail: string } | null {
  if (input.mode === 'misconfigured') {
    return {
      title: 'This build is misconfigured',
      detail: input.reason,
    };
  }

  if (input.mode === 'fixtures' && input.isRelease) {
    return {
      title: 'This build has no backend',
      detail:
        'Nothing here would be real. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the hosted project and ' +
        'build again.',
    };
  }

  return null;
}

/**
 * True in a release build. `__DEV__` is absent under the test runners, and
 * "not a release build" is the safe reading there: a test asserting the
 * blocked screen passes its own flag explicitly.
 */
export function isReleaseBuild(): boolean {
  return typeof __DEV__ === 'boolean' ? !__DEV__ : false;
}

/**
 * A Supabase URL that only resolves on a home / office network:
 * loopback, a .local mDNS name, or an RFC-1918 private LAN IP. A build
 * pointed at one of these works next to the machine running Supabase
 * and nowhere else — the classic "works on my Wi-Fi, dead outside"
 * failure. Callers surface this loudly rather than failing silently.
 */
export function isLocalNetworkUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
  if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = /^172\.(\d{1,3})\./.exec(host);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  });
}
