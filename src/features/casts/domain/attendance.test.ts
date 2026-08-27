import { describe, expect, it } from 'vitest';

import { outcomeFor, receiptWeight, type PlanRecord } from './attendance';

const start = new Date('2026-08-27T19:00:00Z');
const afterWindow = new Date('2026-08-28T20:00:00Z'); // start + 25h
const beforeWindow = new Date('2026-08-27T21:00:00Z');

function plan(overrides: Partial<PlanRecord['participants'][number]>): PlanRecord {
  return {
    startsAt: start,
    participants: [
      { userId: 'me', reportedBy: [], ...overrides },
      { userId: 'aarav', reportedBy: [] },
    ],
  };
}

describe('attendance outcomes', () => {
  it('mutual confirmation is a receipt', () => {
    const record = plan({ reportedBy: [{ reporterId: 'aarav', report: 'showed' }] });
    expect(outcomeFor(record, 'me', beforeWindow)).toBe('receipt');
  });

  it('cancelling before the 2h cutoff is withdrawal, never a flake', () => {
    const record = plan({
      cancelledAt: new Date('2026-08-27T15:00:00Z'), // 4h before start
      reportedBy: [{ reporterId: 'aarav', report: 'no-show' }],
    });
    expect(outcomeFor(record, 'me', afterWindow)).toBe('withdrawn');
  });

  it('a silent no-show becomes a flake only after the window closes, on unanimous reports', () => {
    const record = plan({ reportedBy: [{ reporterId: 'aarav', report: 'no-show' }] });
    expect(outcomeFor(record, 'me', beforeWindow)).toBe('unverified');
    expect(outcomeFor(record, 'me', afterWindow)).toBe('flake');
  });

  it('a late cancel is judged like a no-show by the others', () => {
    const record = plan({
      cancelledAt: new Date('2026-08-27T18:30:00Z'), // 30min before start
      reportedBy: [{ reporterId: 'aarav', report: 'no-show' }],
    });
    expect(outcomeFor(record, 'me', afterWindow)).toBe('flake');
  });

  it('silence never creates a fact: nobody confirms, nothing happens', () => {
    const record = plan({ reportedBy: [] });
    expect(outcomeFor(record, 'me', afterWindow)).toBe('unverified');
  });

  it('conflicting reports go to no-penalty', () => {
    const record: PlanRecord = {
      startsAt: start,
      participants: [
        {
          userId: 'me',
          reportedBy: [
            { reporterId: 'aarav', report: 'showed' },
            { reporterId: 'riya', report: 'no-show' },
          ],
        },
      ],
    };
    expect(outcomeFor(record, 'me', afterWindow)).toBe('disputed');
  });

  it('same-pair receipts count at most once per 7 days', () => {
    const monday = new Date('2026-08-24T19:00:00Z');
    const wednesday = new Date('2026-08-26T19:00:00Z');
    const nextTuesday = new Date('2026-09-01T19:00:00Z');
    expect(receiptWeight([monday], wednesday)).toBe(0);
    expect(receiptWeight([monday], nextTuesday)).toBe(1);
    expect(receiptWeight([], wednesday)).toBe(1);
  });
});
