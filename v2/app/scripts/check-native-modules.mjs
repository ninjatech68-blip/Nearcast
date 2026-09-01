#!/usr/bin/env node
/**
 * Preflight: confirm the local Expo modules under `modules/` are
 * discoverable by expo-modules-autolinking BEFORE running a prebuild.
 *
 * Local modules are NOT npm packages — they are found by a directory
 * scan for expo-module.config.json. If this script reports a module
 * missing, `npx expo prebuild` will not link it and the app will
 * silently fall back to whatever JS-side fallback exists.
 *
 * Usage: npm run check:native
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MODULES_DIR = 'modules';

function localModules() {
  if (!existsSync(MODULES_DIR)) return [];
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(join(MODULES_DIR, entry.name, 'expo-module.config.json')))
    .map((entry) => {
      const configPath = join(MODULES_DIR, entry.name, 'expo-module.config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      return { dir: entry.name, config };
    });
}

function discovered(platform) {
  const raw = execFileSync(
    'npx',
    ['expo-modules-autolinking', 'search', '--platform', platform, '--json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  return Object.keys(JSON.parse(raw));
}

const locals = localModules();
if (locals.length === 0) {
  console.log('no local modules under ./modules — nothing to check.');
  process.exit(0);
}

let failed = false;

for (const platform of ['ios', 'android']) {
  let found;
  try {
    found = discovered(platform);
  } catch {
    console.log(`! could not run autolinking search for ${platform} — skipping`);
    continue;
  }

  for (const { dir, config } of locals) {
    const platforms = config.platforms ?? [];
    if (!platforms.includes(platform)) continue;
    const linked = found.includes(dir);
    const mark = linked ? 'ok  ' : 'FAIL';
    console.log(`[${mark}] ${platform.padEnd(7)} ${dir}`);
    if (!linked) failed = true;
  }
}

// The native class names declared in each config must exist in source.
for (const { dir, config } of locals) {
  for (const className of config.ios?.modules ?? []) {
    const swiftPath = join(MODULES_DIR, dir, 'ios', `${className}.swift`);
    const present = existsSync(swiftPath);
    console.log(`[${present ? 'ok  ' : 'FAIL'}] swift   ${dir}/${className}.swift`);
    if (!present) failed = true;
  }
}

if (failed) {
  console.error('\none or more local modules will NOT link. fix before prebuild.');
  process.exit(1);
}

console.log('\nall local modules discoverable. safe to prebuild.');
