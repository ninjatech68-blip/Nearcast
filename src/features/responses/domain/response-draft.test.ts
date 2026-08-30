import { describe, expect, it } from 'vitest';

import {
  RESPONSE_MESSAGE_MAX_LENGTH,
  canSubmitResponse,
  describeResponseDisclosure,
  emptyResponseDraft,
  findResponseProblems,
  toQualificationPayload,
  type ResponseDraft,
} from './response-draft';

const draft = (overrides: Partial<ResponseDraft> = {}): ResponseDraft => ({
  ...emptyResponseDraft(),
  message: 'Happy to help on Saturday',
  ...overrides,
});

describe('response validation', () => {
  it('requires a note', () => {
    expect(findResponseProblems(draft({ message: '   ' }))).toContain(
      'Write a short note so they know how you can help',
    );
    expect(canSubmitResponse(draft({ message: '   ' }))).toBe(false);
  });

  it('mirrors the database length limit', () => {
    expect(canSubmitResponse(draft({ message: 'x'.repeat(RESPONSE_MESSAGE_MAX_LENGTH) }))).toBe(
      true,
    );
    expect(
      canSubmitResponse(draft({ message: 'x'.repeat(RESPONSE_MESSAGE_MAX_LENGTH + 1) })),
    ).toBe(false);
  });

  it('accepts a complete draft', () => {
    expect(findResponseProblems(draft())).toEqual([]);
  });
});

describe('qualification payload', () => {
  it('sends only what the respondent actually claimed', () => {
    expect(
      toQualificationPayload(
        draft({ qualification: { has_transport: true, can_travel: false } }),
      ),
    ).toEqual({ has_transport: true });
  });

  it('sends nothing when nothing was claimed', () => {
    expect(toQualificationPayload(draft())).toEqual({});
  });

  it('never records a negative claim the person did not make', () => {
    const payload = toQualificationPayload(
      draft({ qualification: { can_travel: false, available_now: false } }),
    );

    expect(Object.values(payload)).not.toContain(false);
    expect(payload).toEqual({});
  });
});

describe('response disclosure', () => {
  it('shows the first name and note that will be shared', () => {
    const { shared } = describeResponseDisclosure(draft(), 'Dev');

    expect(shared[0]).toEqual({ label: 'Your first name', detail: 'Dev' });
    expect(shared[1]).toEqual({
      label: 'Your note',
      detail: 'Happy to help on Saturday',
    });
  });

  it('lists a claimed qualification but not an unclaimed one', () => {
    const { shared } = describeResponseDisclosure(
      draft({ qualification: { has_transport: true } }),
      'Dev',
    );
    const details = shared.map((line) => line.detail);

    expect(details).toContain('I have transport');
    expect(details).not.toContain('I can travel to them');
  });

  it('names contact details and location as withheld rather than leaving them unmentioned', () => {
    const { withheld } = describeResponseDisclosure(draft(), 'Dev');
    const labels = withheld.map((line) => line.label);

    expect(labels).toContain('Your contact details');
    expect(labels).toContain('Your exact location');
  });

  it('never carries a full name into what is shared', () => {
    const { shared, withheld } = describeResponseDisclosure(draft(), 'Dev');
    const rendered = JSON.stringify([shared, withheld]);

    expect(rendered).not.toContain('Mehta');
  });
});
