import { describe, expect, it } from 'vitest';

import { errorCopy, SERVER_ERROR_CODES, toErrorCode } from './errors';

describe('server error copy (05 §8 → 06 §9.8)', () => {
  it('has copy for every server error code', () => {
    for (const code of SERVER_ERROR_CODES) {
      expect(errorCopy(code).length).toBeGreaterThan(0);
    }
  });

  it('reads the code from a Postgres error message', () => {
    expect(toErrorCode({ message: 'plan_full' })).toBe('plan_full');
    expect(toErrorCode({ message: 'something unexpected' })).toBe('unknown');
    expect(toErrorCode(null)).toBe('unknown');
  });

  it('never reveals a block: "blocked" reads exactly like "not available"', () => {
    expect(errorCopy('blocked')).toBe(errorCopy('not_available'));
  });

  it('uses the canonical wording', () => {
    expect(errorCopy('not_available')).toBe("This isn't available. It may have ended or isn't shared with you.");
    expect(errorCopy('restricted')).toBe('Your account is limited right now. Contact support.');
    expect(errorCopy('underage')).toBe('You need to be 18 or older to use TrueGoing.');
    expect(errorCopy('unknown')).toBe('Something went wrong. Try again.');
  });
});
