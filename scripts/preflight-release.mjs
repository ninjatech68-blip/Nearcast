/**
 * Release build preflight.
 *
 * Nothing in this project runs locally: the database is hosted, builds happen
 * in the cloud, and the app talks to the internet. A release build inlines
 * EXPO_PUBLIC_* values at bundle time, so a wrong one is baked into the binary
 * and surfaces only as an unexplained failure on the phone. These checks turn
 * that into a clear error before the build.
 */
import { readFileSync, existsSync } from 'node:fs';

const problems = [];

const LOCAL_HOST = /(127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0|\.local(?::|\/|$))/;
const PRIVATE_LAN =
  /(^|\/\/)(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function readEnvFile(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');

        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const env = existsSync('.env') ? readEnvFile('.env') : process.env;

if (!existsSync('.env') && process.env.EXPO_PUBLIC_SUPABASE_URL === undefined) {
  problems.push(
    'No .env and no EXPO_PUBLIC_* in the environment. Copy .env.example and\n' +
      '   point it at the hosted Supabase project.',
  );
}

const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';

if (url === '') {
  problems.push('EXPO_PUBLIC_SUPABASE_URL is not set.');
} else {
  if (!url.startsWith('https://')) {
    problems.push(
      `EXPO_PUBLIC_SUPABASE_URL is ${url}. It must be https. A release build\n` +
        '   enforces App Transport Security, and plain http is refused.',
    );
  }

  if (LOCAL_HOST.test(url)) {
    problems.push(
      `EXPO_PUBLIC_SUPABASE_URL is ${url}, which is this machine. Nothing in\n` +
        '   this project runs locally; point it at the hosted Supabase project.',
    );
  }

  if (PRIVATE_LAN.test(url)) {
    problems.push(
      `EXPO_PUBLIC_SUPABASE_URL is ${url}, a private network address. A build\n` +
        '   that depends on one machine being reachable is not shippable; use the\n' +
        '   hosted Supabase URL.',
    );
  }
}

const appEnv = env.EXPO_PUBLIC_APP_ENV ?? '';

if (appEnv === '') {
  problems.push(
    'EXPO_PUBLIC_APP_ENV is not set. A release build refuses to start without\n' +
      '   it: one of local, staging, production.',
  );
} else if (!['local', 'staging', 'production'].includes(appEnv)) {
  problems.push(
    `EXPO_PUBLIC_APP_ENV is "${appEnv}", which is not one of local, staging,\n` +
      '   production. The app shows a "build is misconfigured" screen rather than\n' +
      '   running, so catch it here instead of after a cloud build.',
  );
} else if (appEnv === 'local') {
  problems.push(
    'EXPO_PUBLIC_APP_ENV is "local". An internal build against the hosted\n' +
      '   project is "staging"; "local" belongs to the fixture build, which a\n' +
      '   release build refuses to run.',
  );
}

if ((env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').includes('replace-with')) {
  problems.push(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is still the placeholder. Take it\n' +
      '   from the hosted project: Settings, API, publishable/anon key.',
  );
}

if (problems.length > 0) {
  console.error('\nRelease build preflight failed:\n');
  for (const problem of problems) console.error(` • ${problem}\n`);
  process.exit(1);
}

console.log('Release build preflight passed.');
