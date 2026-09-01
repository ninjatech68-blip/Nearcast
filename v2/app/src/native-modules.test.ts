import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every file a local native module needs must be TRACKED, not merely
 * present on this machine.
 *
 * `scripts/check-native-modules.mjs` already asserts the declared Swift
 * class exists on disk. That passed on the machine that wrote the files
 * and failed on the machine that cloned them, because a `.gitignore`
 * line reading `ios/` -- no leading slash -- matches a directory of that
 * name at ANY depth, and quietly swallowed
 * `modules/nearcast-places/ios/NearcastPlacesModule.swift` along with
 * its podspec.
 *
 * That is the worst shape this failure can take. The module's config
 * committed, so autolinking still finds the module; only the
 * implementation is missing. `expo prebuild` succeeds, the build
 * succeeds, and the app falls back to its optional-module JS path with
 * no error at any point.
 *
 * Existence is therefore the wrong question. This asks git.
 */

const MODULES_DIR = join(process.cwd(), 'modules');

function tracked(path: string): boolean {
  const out = execFileSync('git', ['ls-files', '--error-unmatch', path], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return out.trim().length > 0;
}

function localModules(): { dir: string; config: { ios?: { modules?: string[] } } }[] {
  if (!existsSync(MODULES_DIR)) return [];
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(MODULES_DIR, e.name, 'expo-module.config.json')))
    .map((e) => ({
      dir: e.name,
      config: JSON.parse(readFileSync(join(MODULES_DIR, e.name, 'expo-module.config.json'), 'utf8')),
    }));
}

describe('local native modules', () => {
  const modules = localModules();

  it('there is at least one, and it is the places module', () => {
    expect(modules.map((m) => m.dir)).toContain('nearcast-places');
  });

  for (const { dir, config } of modules) {
    for (const className of config.ios?.modules ?? []) {
      it(`${dir}: ${className}.swift is committed, not just present`, () => {
        const path = join('modules', dir, 'ios', `${className}.swift`);
        expect(existsSync(join(process.cwd(), path))).toBe(true);
        expect(() => tracked(path)).not.toThrow();
      });
    }

    it(`${dir}: every file under ios/ is committed`, () => {
      const iosDir = join(MODULES_DIR, dir, 'ios');
      if (!existsSync(iosDir)) return;
      for (const file of readdirSync(iosDir)) {
        const path = join('modules', dir, 'ios', file);
        // the podspec went the same way as the Swift and would have
        // broken CocoaPods integration outright, so this is every file
        // rather than only the declared classes.
        expect(() => tracked(path), `${path} is not tracked by git`).not.toThrow();
      }
    });
  }
});
