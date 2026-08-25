import { describe, expect, it } from 'vitest';

import { describeReliability } from './reliability';

describe('describeReliability', () => {
  it('reports counted evidence rather than a score', () => {
    expect(describeReliability({ context: 'I need', completed: 8, confirmed: 9 })).toBe(
      '8 of 9 confirmed interactions were completed',
    );
  });

  it('says plainly when there is nothing to report instead of implying a rating', () => {
    expect(describeReliability({ context: 'I offer', completed: 0, confirmed: 0 })).toBe(
      'No confirmed interactions yet',
    );
  });

  it('never produces a numeric score, percentage, or rating', () => {
    const rendered = describeReliability({ context: 'I need', completed: 3, confirmed: 4 });
    expect(rendered).not.toMatch(/%/);
    expect(rendered).not.toMatch(/\b\d+\.\d+\b/);
    expect(rendered).not.toMatch(/Trust \d/);
  });
});
