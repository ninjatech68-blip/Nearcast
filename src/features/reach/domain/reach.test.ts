import { describe, expect, it } from 'vitest';

import { INTENT_REACH_LEVELS } from '@/features/intents/domain/intent';
import {
  REACH_LABELS,
  describeAudienceDelta,
  describePrivacyImpact,
  isExpansion,
  isReduction,
  requiresDisclosureConfirmation,
  selectableLevels,
} from './reach';

describe('reach ordering', () => {
  it('ranks the four levels from narrowest to widest', () => {
    expect(isExpansion('origin_only', 'broader_approved')).toBe(true);
    expect(isExpansion('nearby_relevant', 'adjacent_network')).toBe(false);
    expect(isReduction('broader_approved', 'origin_only')).toBe(true);
  });

  it('treats an unchanged level as neither', () => {
    expect(isExpansion('nearby_relevant', 'nearby_relevant')).toBe(false);
    expect(isReduction('nearby_relevant', 'nearby_relevant')).toBe(false);
  });

  it('offers every level except the one already held', () => {
    expect(selectableLevels('origin_only')).not.toContain('origin_only');
    expect(selectableLevels('origin_only')).toHaveLength(3);
  });

  it('has a label for every level the database can hold', () => {
    for (const level of INTENT_REACH_LEVELS) {
      expect(REACH_LABELS[level].length).toBeGreaterThan(0);
    }
  });
});

describe('confirmation gate', () => {
  it('requires confirmation for every expansion', () => {
    expect(requiresDisclosureConfirmation('origin_only', 'adjacent_network')).toBe(true);
    expect(requiresDisclosureConfirmation('adjacent_network', 'broader_approved')).toBe(true);
  });

  it('never makes taking reach back the harder action', () => {
    expect(requiresDisclosureConfirmation('broader_approved', 'origin_only')).toBe(false);
    expect(requiresDisclosureConfirmation('nearby_relevant', 'adjacent_network')).toBe(false);
  });
});

describe('audience delta', () => {
  it('names who is added, without a count', () => {
    const delta = describeAudienceDelta('origin_only', 'nearby_relevant');

    expect(delta).toContain('nearby people');
    expect(delta).not.toMatch(/\d/);
  });

  it('says nothing for a reduction, which adds no one', () => {
    expect(describeAudienceDelta('broader_approved', 'origin_only')).toBeNull();
  });

  it('never invents an audience size for any expansion', () => {
    for (const from of INTENT_REACH_LEVELS) {
      for (const to of INTENT_REACH_LEVELS) {
        const delta = describeAudienceDelta(from, to);
        if (delta !== null) expect(delta).not.toMatch(/\d|people nearby now|others/i);
      }
    }
  });
});

describe('privacy impact', () => {
  it('states what becomes visible, and what does not, before expanding', () => {
    const impact = describePrivacyImpact('origin_only', 'nearby_relevant');

    expect(impact).toContain('approximate area');
    expect(impact).toContain('exact location and contact details stay private');
  });

  it('is honest that a reduction cannot unsee what was seen', () => {
    expect(describePrivacyImpact('broader_approved', 'origin_only')).toContain(
      'may still remember it',
    );
  });

  it('says nothing changes when nothing changes', () => {
    expect(describePrivacyImpact('nearby_relevant', 'nearby_relevant')).toBe(
      'Nothing changes.',
    );
  });
});
