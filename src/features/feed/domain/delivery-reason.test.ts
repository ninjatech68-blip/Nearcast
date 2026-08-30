import { describe, expect, it } from 'vitest';

import {
  DELIVERY_REASON_CODES,
  FEEDBACK_LABELS,
  hasUsableExplanation,
  isApprovedReasonCode,
} from './delivery-reason';

describe('delivery explanations', () => {
  it('accepts every approved code', () => {
    for (const code of DELIVERY_REASON_CODES) {
      expect(isApprovedReasonCode(code)).toBe(true);
    }
  });

  it('rejects a code nobody approved', () => {
    expect(isApprovedReasonCode('because_we_felt_like_it')).toBe(false);
    expect(isApprovedReasonCode('')).toBe(false);
  });

  it('drops a card whose explanation is missing rather than inventing one', () => {
    expect(
      hasUsableExplanation({
        reasonCode: 'adjacent_trust_connection',
        reasonText: 'Someone you both know shared this',
      }),
    ).toBe(true);

    expect(
      hasUsableExplanation({ reasonCode: 'adjacent_trust_connection', reasonText: '   ' }),
    ).toBe(false);

    expect(
      hasUsableExplanation({ reasonCode: 'made_up', reasonText: 'A plausible sentence' }),
    ).toBe(false);
  });

  it('offers hide, save and not-relevant, and nothing that reveals other viewers', () => {
    expect(Object.keys(FEEDBACK_LABELS).sort()).toEqual([
      'hide',
      'not_relevant',
      'save',
    ]);
    expect(Object.values(FEEDBACK_LABELS).join(' ')).not.toMatch(
      /others|people saw|popular|trending/i,
    );
  });
});
