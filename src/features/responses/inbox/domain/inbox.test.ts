import { describe, expect, it } from 'vitest';

import { availableDecisions, describeResponseStatus, listClaims } from './inbox';
import { RESPONSE_STATUSES } from './status';

describe('inbox decisions', () => {
  it('offers accept and decline on a pending response to a matchable intent', () => {
    expect(availableDecisions('pending', true)).toEqual(['accept', 'decline']);
  });

  it('drops accept once the intent can no longer be matched', () => {
    expect(availableDecisions('pending', false)).toEqual(['decline']);
  });

  it('offers nothing on a response already decided', () => {
    for (const status of ['accepted', 'declined', 'withdrawn'] as const) {
      expect(availableDecisions(status, true)).toEqual([]);
    }
  });
});

describe('status copy', () => {
  it('has an answer for every status the database can hold', () => {
    for (const status of RESPONSE_STATUSES) {
      expect(describeResponseStatus(status).length).toBeGreaterThan(0);
    }
  });

  it('reports a decline without a reason or a judgement', () => {
    expect(describeResponseStatus('declined')).toBe('Declined');
  });

  it('never ranks or scores a respondent', () => {
    for (const status of RESPONSE_STATUSES) {
      expect(describeResponseStatus(status)).not.toMatch(/best|top|rank|score|match %/i);
    }
  });
});

describe('qualification claims', () => {
  const labels = { has_transport: 'Has transport', can_travel: 'Can travel' };

  it('lists only what the respondent claimed', () => {
    expect(listClaims({ has_transport: true }, labels)).toEqual(['Has transport']);
  });

  it('never renders an absent claim as a negative one', () => {
    expect(listClaims({}, labels)).toEqual([]);
    expect(listClaims({ can_travel: false }, labels)).toEqual([]);
  });

  it('ignores a key it has no label for rather than showing a raw field name', () => {
    expect(listClaims({ mystery_flag: true }, labels)).toEqual([]);
  });
});
