import { z } from 'zod';

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_APP_ENV: z.enum(['local', 'staging', 'production']),
  // Optional until the share domain exists (human action H-4). When unset,
  // share links fall back to the app scheme so testing is never blocked.
  EXPO_PUBLIC_SHARE_BASE_URL: z.url().optional(),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appEnv: 'local' | 'staging' | 'production';
  shareBaseUrl: string | null;
};

export function parsePublicEnv(source: Record<string, unknown>): PublicEnv {
  const parsed = publicEnvSchema.parse(source);

  return {
    supabaseUrl: parsed.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: parsed.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    appEnv: parsed.EXPO_PUBLIC_APP_ENV,
    shareBaseUrl: parsed.EXPO_PUBLIC_SHARE_BASE_URL ?? null,
  };
}

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_SHARE_BASE_URL: process.env.EXPO_PUBLIC_SHARE_BASE_URL,
  });
}
