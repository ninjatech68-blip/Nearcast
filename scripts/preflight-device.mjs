/**
 * Device release-build preflight.
 *
 * A release build inlines EXPO_PUBLIC_* values at bundle time, so a wrong one
 * is baked into the binary and only shows up as an unexplained failure on the
 * phone. These checks turn that into a clear error before a fifteen-minute
 * build rather than after it.
 */
import { readFileSync, existsSync } from 'node:fs';

const problems = [];

if (!existsSync('.env')) {
  problems.push('.env is missing. Copy .env.example and fill it in.');
} else {
  const env = Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');

        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );

  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';

  // A phone's loopback is the phone, not this Mac.
  if (/(127\.0\.0\.1|localhost|\[::1\])/.test(url)) {
    problems.push(
      `EXPO_PUBLIC_SUPABASE_URL is ${url}. On a real device that address is the\n` +
        '   phone itself, so every request fails. Use this Mac\'s LAN address, e.g.\n' +
        '   http://192.168.1.20:54321 — find it with: ipconfig getifaddr en0',
    );
  }

  if ((env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').includes('replace-with')) {
    problems.push(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is still the placeholder.\n' +
        '   Get the real one with: npx supabase status',
    );
  }

  if (url === '') problems.push('EXPO_PUBLIC_SUPABASE_URL is not set.');
}

if (problems.length > 0) {
  console.error('\nDevice build preflight failed:\n');
  for (const problem of problems) console.error(` • ${problem}\n`);
  process.exit(1);
}

console.log('Device build preflight passed.');
