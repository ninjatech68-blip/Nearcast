import { describe, expect, it } from 'vitest';

import { toChatMessage, ME } from './adapter';
import type { Message } from './chat';

function msg(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    from: 'them',
    text: 'on my way',
    time: '18:04',
    createdAt: '2026-08-31T12:34:00.000Z',
    ...overrides,
  };
}

describe('toChatMessage', () => {
  it('carries the id, text and time across', () => {
    const out = toChatMessage(msg(), 'Asha');

    expect(out._id).toBe('m1');
    expect(out.text).toBe('on my way');
    expect(out.createdAt).toEqual(new Date('2026-08-31T12:34:00.000Z'));
  });

  it('puts my messages on me and theirs on them', () => {
    expect(toChatMessage(msg({ from: 'me' }), 'Asha').user._id).toBe(ME);
    expect(toChatMessage(msg({ from: 'them' }), 'Asha').user._id).toBe('them');
  });

  it('names the other person, so their bubbles are attributable', () => {
    expect(toChatMessage(msg({ from: 'them' }), 'Asha').user.name).toBe('Asha');
  });

  it('marks a system message as one', () => {
    const out = toChatMessage(msg({ from: 'system', text: 'this room closes at 9' }), 'Asha');

    expect(out.system).toBe(true);
  });

  /**
   * The library models three receipt states; we have five. `pending` and
   * `sent` map directly, `delivered` and `read` both count as received so
   * the built-in ticks stay sensible, and the exact state is kept on the
   * message for our own renderer to draw. `failed` must never read as
   * sent — that is the one mapping that would lie to someone.
   */
  it('maps our five receipt states onto the three it models', () => {
    expect(toChatMessage(msg({ from: 'me', status: 'pending' }), 'A')).toMatchObject({
      pending: true, sent: false, received: false,
    });
    expect(toChatMessage(msg({ from: 'me', status: 'sent' }), 'A')).toMatchObject({
      pending: false, sent: true, received: false,
    });
    expect(toChatMessage(msg({ from: 'me', status: 'delivered' }), 'A')).toMatchObject({
      sent: true, received: true,
    });
    expect(toChatMessage(msg({ from: 'me', status: 'read' }), 'A')).toMatchObject({
      sent: true, received: true,
    });
  });

  it('never lets a failed message read as sent', () => {
    const out = toChatMessage(msg({ from: 'me', status: 'failed' }), 'A');

    expect(out.sent).toBe(false);
    expect(out.received).toBe(false);
    expect(out.pending).toBe(false);
    // and the real state survives for our own tick renderer
    expect(out.status).toBe('failed');
  });

  it('keeps the exact status on the message for our renderer', () => {
    expect(toChatMessage(msg({ from: 'me', status: 'read' }), 'A').status).toBe('read');
  });

  it('passes a location share through as a location, not as text', () => {
    const out = toChatMessage(
      msg({ latitude: 12.97, longitude: 77.64, placeLabel: 'indiranagar' }),
      'A',
    );

    expect(out.location).toEqual({ latitude: 12.97, longitude: 77.64 });
    expect(out.placeLabel).toBe('indiranagar');
  });

  /**
   * Media is a path in a private bucket, not a URL. Handing it to the
   * library's `image` field would make it try to load a path as a URI, so
   * it stays on our own field and our renderer resolves the signed URL.
   */
  it('does not put a private media path in the image field', () => {
    const out = toChatMessage(msg({ mediaPath: 'chat/abc.jpg', mediaKind: 'image' }), 'A');

    expect(out.image).toBeUndefined();
    expect(out.mediaPath).toBe('chat/abc.jpg');
  });

  it('falls back to now when a message has no timestamp yet', () => {
    const out = toChatMessage(msg({ createdAt: undefined }), 'A');

    expect(out.createdAt).toBeInstanceOf(Date);
  });

  it('keeps the client id so an optimistic message can be reconciled', () => {
    expect(toChatMessage(msg({ clientMessageId: 'c1' }), 'A').clientMessageId).toBe('c1');
  });
});
