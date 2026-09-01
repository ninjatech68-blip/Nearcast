import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No em dash in anything a person reads.
 *
 * It is a house rule, and it is the kind of rule that decays: one line
 * of copy at a time, written in a hurry, until half the app punctuates
 * one way and half the other. A comment may still use one — this only
 * guards what ships to a screen.
 *
 * Where a dash was doing real work, the fix was a full stop, a comma,
 * or the middle dot the rest of the app already separates with.
 */
const ROOTS = ['src/app', 'src/features', 'src/design-system', 'supabase/functions'];
const EM_DASH = '—';

/** the code on a line, with any trailing `//` comment removed. */
function codeOnly(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  // A root may not exist in every checkout -- the client tree carries no
  // supabase/functions. Skip it rather than fail: this test is about the
  // words in the files that are here, not about which roots exist.
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    found.push(path);
  }
  return found;
}

describe('copy', () => {
  it('never uses an em dash on a screen', () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of sourceFiles(root)) {
        let inBlockComment = false;
        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            const trimmed = line.trim();
            if (inBlockComment) {
              if (trimmed.includes('*/')) inBlockComment = false;
              return;
            }
            if (trimmed.startsWith('/*') || trimmed.startsWith('{/*')) {
              if (!trimmed.includes('*/')) inBlockComment = true;
              return;
            }
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
            if (codeOnly(line).includes(EM_DASH)) {
              offenders.push(`${file}:${index + 1}: ${trimmed}`);
            }
          });
      }
    }

    expect(offenders).toEqual([]);
  });
});
