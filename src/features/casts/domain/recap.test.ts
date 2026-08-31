import { describe, expect, it } from 'vitest';

import { buildRecap } from './recap';

const NOW = new Date(2026, 2, 20); // 20 march 2026, a friday

function plan(day: number, others: readonly string[], area = 'indiranagar', outcome = 'receipt') {
  return { startsAt: new Date(2026, 2, day), outcome, others, area };
}

describe('buildRecap', () => {
  it('counts only receipts from the current month', () => {
    const recap = buildRecap(
      [
        plan(3, ['aarav']),
        plan(10, ['riya']),
        { ...plan(1, ['dev']), startsAt: new Date(2026, 1, 25) }, // february
        plan(12, ['meera'], 'hsr', 'flake'),
      ],
      NOW,
    );
    expect(recap.headline).toBe('2 plans made real.');
    expect(recap.hasData).toBe(true);
    expect(recap.tag).toBe('MARCH RECAP');
  });

  it('says nothing rather than inventing a month with no receipts', () => {
    const recap = buildRecap([plan(12, ['meera'], 'hsr', 'flake')], NOW);
    expect(recap.hasData).toBe(false);
    expect(recap.headline).toBe('nothing yet this month.');
    expect(recap.meta).toBe('your first one lands here.');
  });

  it('counts each person once across plans', () => {
    const recap = buildRecap([plan(3, ['aarav']), plan(10, ['aarav', 'riya'])], NOW);
    expect(recap.meta.startsWith('2 people')).toBe(true);
  });

  it('uses the singular for one person and one plan', () => {
    const recap = buildRecap([plan(3, ['aarav'])], NOW);
    expect(recap.headline).toBe('1 plan made real.');
    expect(recap.meta).toBe('1 person');
  });

  it('names a weekday only when it actually repeats', () => {
    // 3, 10 and 17 march 2026 are all tuesdays
    const repeats = buildRecap([plan(3, ['a']), plan(10, ['b']), plan(17, ['c'])], NOW);
    expect(repeats.meta).toContain('tuesdays are your night');

    const once = buildRecap([plan(3, ['a']), plan(11, ['b'])], NOW);
    expect(once.meta).not.toContain('are your night');
  });

  it('names an area only when it actually repeats', () => {
    const repeats = buildRecap([plan(3, ['a'], 'hsr'), plan(11, ['b'], 'hsr')], NOW);
    expect(repeats.meta).toContain('mostly hsr');

    const once = buildRecap([plan(3, ['a'], 'hsr'), plan(11, ['b'], 'koramangala')], NOW);
    expect(once.meta).not.toContain('mostly');
  });

  it('drops the people clause when a receipt carries no other names', () => {
    const recap = buildRecap([plan(3, [])], NOW);
    expect(recap.meta).toBe('');
  });
});
