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

export function getPublicEnv(): PublicEnv {
  return parsePublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  });
}
