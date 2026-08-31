import { describe, expect, it } from 'vitest';

import { describeConfirmations, shareLinkFor, shareMessageFor } from './share-link';

const SLUG = '11111111-2222-3333-4444-555555555555';

describe('shareLinkFor', () => {
  it('builds an https link when a share domain is configured', () => {
    const link = shareLinkFor(SLUG, 'https://nearcast.app');

    expect(link).toEqual({ kind: 'web', url: `https://nearcast.app/i/${SLUG}` });
  });

  it('tolerates a trailing slash on the origin', () => {
    expect(shareLinkFor(SLUG, 'https://nearcast.app/').url).toBe(
      `https://nearcast.app/i/${SLUG}`,
    );
  });

  /**
   * MUST-020 wants an HTTPS link, and that needs a domain we serve. Until
   * one exists the deep link is the honest fallback: it works for someone
   * who already has the app, and the copy says so rather than implying a
   * stranger can open it.
   */
  it('falls back to the app scheme when no domain is configured', () => {
    const link = shareLinkFor(SLUG, '');

    expect(link).toEqual({ kind: 'app', url: `nearcast://i/${SLUG}` });
  });

  it('treats a non-https origin as no domain rather than shipping http', () => {
    expect(shareLinkFor(SLUG, 'http://nearcast.app').kind).toBe('app');
  });
});

describe('shareMessageFor', () => {
  it('carries the statement and the link', () => {
    const message = shareMessageFor('Need one more for doubles', {
      kind: 'web',
      url: 'https://nearcast.app/i/abc',
    });

    expect(message).toContain('Need one more for doubles');
    expect(message).toContain('https://nearcast.app/i/abc');
  });

  it('warns that an app link only opens for people who have Nearcast', () => {
    const message = shareMessageFor('Need one more for doubles', {
      kind: 'app',
      url: 'nearcast://i/abc',
    });

    expect(message).toMatch(/if you have nearcast/i);
  });

  it('never mentions where the cast came from', () => {
    const message = shareMessageFor('Need one more', { kind: 'web', url: 'https://x/i/a' });

    expect(message).not.toMatch(/circle|group|whatsapp/i);
  });
});

describe('describeConfirmations', () => {
  /**
   * Honest zero, one and many, and never a word about who. MUST-023 is
   * that a recipient learns there is support without learning the
   * circle's membership.
   */
  it('says plainly when nobody has confirmed', () => {
    expect(describeConfirmations(0, false)).toBe('nobody has confirmed this yet');
  });

  it('counts one other person as one', () => {
    expect(describeConfirmations(1, false)).toBe('1 person confirmed this');
  });

  it('counts many as many', () => {
    expect(describeConfirmations(4, false)).toBe('4 people confirmed this');
  });

  it('puts the viewer first once they have confirmed', () => {
    expect(describeConfirmations(1, true)).toBe('you confirmed this');
    expect(describeConfirmations(2, true)).toBe('you and 1 other person confirmed this');
    expect(describeConfirmations(4, true)).toBe('you and 3 other people confirmed this');
  });

  it('never names anyone', () => {
    for (const count of [0, 1, 2, 9]) {
      for (const mine of [true, false]) {
        expect(describeConfirmations(count, mine)).not.toMatch(/[A-Z][a-z]+ [A-Z]/);
      }
    }
  });
});
