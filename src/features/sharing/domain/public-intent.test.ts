import { describe, expect, it } from 'vitest';

import {
  buildShareMessage,
  buildShareUrl,
  describeConfirmations,
  isOpenForResponse,
  publicIntentSchema,
  type PublicIntent,
} from './public-intent';

const now = new Date('2026-08-30T12:00:00Z');

const intent = (overrides: Partial<PublicIntent> = {}): PublicIntent => ({
  id: 'intent-1',
  shareSlug: 'slug-1',
  primitive: 'request',
  statement: 'Need two helpers for Saturday',
  responseAction: 'Offer help',
  expiresAt: '2026-08-31T12:00:00.000Z',
  publishedAt: '2026-08-30T10:00:00.000Z',
  startsAt: null,
  deadlineAt: null,
  quantity: null,
  priceMinor: null,
  currency: null,
  approximatePlace: 'Indiranagar',
  broadcasterFirstName: 'Asha',
  confirmationCount: 0,
  ...overrides,
});

describe('confirmation copy', () => {
  it('says zero plainly rather than implying activity', () => {
    expect(describeConfirmations(0, false)).toBe('No one has confirmed this yet');
  });

  it('counts one person as one', () => {
    expect(describeConfirmations(1, false)).toBe('1 person confirmed this');
  });

  it('reports many as a plain number', () => {
    expect(describeConfirmations(7, false)).toBe('7 people confirmed this');
  });

  it('acknowledges the viewer without naming anyone else', () => {
    expect(describeConfirmations(1, true)).toBe('You confirmed this');
    expect(describeConfirmations(2, true)).toBe('You and 1 other person confirmed this');
    expect(describeConfirmations(5, true)).toBe('You and 4 other people confirmed this');
  });

  it('never names a confirmer or the origin circle', () => {
    for (const count of [0, 1, 2, 25]) {
      for (const confirmed of [true, false]) {
        const copy = describeConfirmations(count, confirmed);

        expect(copy).not.toMatch(/group|circle|whatsapp|verified/i);
      }
    }
  });
});

describe('public projection', () => {
  it('drops a field the projection should never have carried', () => {
    const parsed = publicIntentSchema.parse({
      ...intent(),
      broadcasterId: 'should-not-be-here',
      exactAddress: '42 Private Lane',
    });

    expect('broadcasterId' in parsed).toBe(false);
    expect(JSON.stringify(parsed)).not.toContain('42 Private Lane');
  });

  it('rejects a projection missing a contracted field', () => {
    const { statement: _statement, ...withoutStatement } = intent();

    expect(publicIntentSchema.safeParse(withoutStatement).success).toBe(false);
  });

  it('closes the intent once its expiry passes', () => {
    expect(isOpenForResponse(intent(), now)).toBe(true);
    expect(
      isOpenForResponse(intent({ expiresAt: '2026-08-30T11:00:00.000Z' }), now),
    ).toBe(false);
  });
});

describe('share message', () => {
  it('builds the https link from the share slug', () => {
    expect(buildShareUrl('slug-1', 'https://nearcast.app')).toBe(
      'https://nearcast.app/i/slug-1',
    );
    expect(buildShareUrl('slug-1', 'https://nearcast.app/')).toBe(
      'https://nearcast.app/i/slug-1',
    );
  });

  it('shares the statement and the link, and nothing else', () => {
    const message = buildShareMessage(intent(), 'https://nearcast.app/i/slug-1');

    expect(message).toContain('Need two helpers for Saturday');
    expect(message).toContain('https://nearcast.app/i/slug-1');
    expect(message).not.toContain('Indiranagar');
    expect(message).not.toContain('Asha');
  });

  it('does not forward a confirmation count into a group we cannot see', () => {
    const message = buildShareMessage(
      intent({ confirmationCount: 12 }),
      'https://nearcast.app/i/slug-1',
    );

    expect(message).not.toContain('12');
  });
});
