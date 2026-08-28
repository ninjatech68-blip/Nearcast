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
