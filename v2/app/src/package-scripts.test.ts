import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every script that names a local file must name one that exists.
 *
 * This has now cost two build attempts. `ios:build` and `check:native`
 * pointed at scripts the copy left behind, and `db:local*` pointed at a
 * runner that belongs to the database side of the repo rather than the
 * client. In both cases package.json read as complete and the failure
 * arrived on the machine trying to build.
 *
 * A script that cannot run is not a script, and the cheapest place to
 * find that out is here.
 */

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

/** every ./path or bare scripts/x.y a command line mentions */
function localPaths(command: string): string[] {
  const found = command.match(/(?:\.\/|(?<=\s|^))(?:scripts|ci_scripts)\/[\w.-]+/g) ?? [];
  return found.map((p) => p.replace(/^\.\//, ''));
}

describe('package scripts', () => {
  const entries = Object.entries(pkg.scripts);

  it('has scripts to check', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  for (const [name, command] of entries) {
    const paths = localPaths(command);
    if (paths.length === 0) continue;
    it(`${name} points at files that exist`, () => {
      for (const path of paths) {
        expect(existsSync(join(process.cwd(), path)), `${name} -> ${path}`).toBe(true);
      }
    });
  }
});
