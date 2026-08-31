import { describe, expect, it } from 'vitest';

import { initialsFor } from './initials';

describe('initialsFor', () => {
  it('takes two letters from a single name', () => {
    expect(initialsFor('Piyush')).toBe('PI');
  });

  it('takes the first and last initial from a full name', () => {
    expect(initialsFor('Piyush Sharma')).toBe('PS');
    expect(initialsFor('ada b lovelace')).toBe('AL');
  });

  it('shows a question mark rather than someone else’s initials', () => {
    expect(initialsFor('')).toBe('?');
    expect(initialsFor('   ')).toBe('?');
  });

  it('survives stray whitespace', () => {
    expect(initialsFor('  Riya   Menon ')).toBe('RM');
  });

  it('handles a one-letter name without inventing a second', () => {
    expect(initialsFor('A')).toBe('A');
  });
});
