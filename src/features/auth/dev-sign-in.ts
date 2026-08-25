import { getPublicEnv } from '@/infrastructure/config/env';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Development-only password sign-in against the seeded local personas.
 *
 * Google and Apple remain the only authentication methods in production
 * (MUST-001). This path exists so testing and review are never blocked on the
 * OAuth credentials that are still a human action (H-1, H-2). It is gated out
 * of production twice: here, and by never enabling the email provider on the
 * production Supabase project.
 */
export function devSignInAvailable(): boolean {
  try {
    return getPublicEnv().appEnv !== 'production';
  } catch {
    return false;
  }
}

export type DevSignInResult = { ok: true } | { ok: false; message: string };

export async function signInWithDevPassword(
  email: string,
  password: string,
): Promise<DevSignInResult> {
  if (!devSignInAvailable()) {
    return { ok: false, message: 'Development sign-in is not available in production.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  return error
    ? { ok: false, message: 'That local persona could not sign in. Check supabase/seed.sql.' }
    : { ok: true };
}
