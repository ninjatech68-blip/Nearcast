import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EXPIRY_HOURS,
  STATEMENT_MAX_LENGTH,
  createEmptyDraft,
  describeDisclosure,
  findDraftProblems,
  intentDraftSchema,
  isPublishable,
  proposeExpiry,
  type IntentDraft,
} from './draft';

const now = new Date('2026-08-30T12:00:00Z');

function publishableDraft(): IntentDraft {
  const draft = createEmptyDraft(now);

  return {
    ...draft,
    publicDraft: {
      ...draft.publicDraft,
      primitive: 'request',
      statement: 'Need two helpers for Saturday',
      responseAction: 'Offer help',
    },
  };
}

describe('draft defaults', () => {
  it('proposes a safe expiry rather than leaving it unset', () => {
    expect(proposeExpiry(now).toISOString()).toBe('2026-08-31T12:00:00.000Z');
    expect(DEFAULT_EXPIRY_HOURS).toBe(24);
  });

  it('starts with no primitive chosen, so the choice stays explicit', () => {
    expect(createEmptyDraft(now).publicDraft.primitive).toBeNull();
  });

  it('starts with an empty private half', () => {
    expect(createEmptyDraft(now).privateDraft).toEqual({
      exactAddress: null,
      privateContact: null,
      coordinationNotes: null,
    });
  });
});

describe('draft validation', () => {
  it('accepts a complete draft', () => {
    expect(findDraftProblems(publishableDraft(), now)).toEqual([]);
    expect(isPublishable(publishableDraft(), now)).toBe(true);
  });

  it('requires a primitive', () => {
    const draft = publishableDraft();
    draft.publicDraft.primitive = null;

    expect(findDraftProblems(draft, now)).toContain(
      'Choose whether this is a request, an offer, or a plan',
    );
  });

  it('requires a statement within the 500 character limit', () => {
    const empty = publishableDraft();
    empty.publicDraft.statement = '   ';
    expect(findDraftProblems(empty, now)).toContain('Write what you need in a sentence');

    const long = publishableDraft();
    long.publicDraft.statement = 'x'.repeat(STATEMENT_MAX_LENGTH + 1);
    expect(findDraftProblems(long, now)).toContain(
      'Shorten the statement to 500 characters',
    );

    const atLimit = publishableDraft();
    atLimit.publicDraft.statement = 'x'.repeat(STATEMENT_MAX_LENGTH);
    expect(findDraftProblems(atLimit, now)).toEqual([]);
  });

  it('rejects an expiry that has already passed', () => {
    const draft = publishableDraft();
    draft.publicDraft.expiresAt = new Date(now.getTime() - 1000).toISOString();

    expect(findDraftProblems(draft, now)).toContain('Choose an expiry in the future');
  });

  it('keeps price and currency together, matching the database check', () => {
    const draft = publishableDraft();
    draft.publicDraft.priceMinor = 1500;

    expect(findDraftProblems(draft, now)).toContain(
      'A price needs a currency, and a currency needs a price',
    );

    draft.publicDraft.currency = 'INR';
    expect(findDraftProblems(draft, now)).toEqual([]);
  });

  it('reports every remaining problem at once', () => {
    const draft = createEmptyDraft(now);

    expect(findDraftProblems(draft, now)).toHaveLength(3);
  });
});

describe('privacy disclosure', () => {
  it('shows nothing as visible while the draft is still local', () => {
    expect(describeDisclosure(publishableDraft()).visibleNow).toEqual([]);
  });

  it('lists the public context that publishing would reveal', () => {
    const draft = publishableDraft();
    draft.publicDraft.approximatePlace = 'Indiranagar';
    draft.publicDraft.quantity = 2;
    draft.publicDraft.requirements = ['Can lift boxes'];

    const labels = describeDisclosure(draft).visibleAfterAction.map((item) => item.label);

    expect(labels).toContain('Your statement');
    expect(labels).toContain('Approximate area');
    expect(labels).toContain('How many');
    expect(labels).toContain('Requirement');
  });

  it('never leaks a private value into what publishing reveals', () => {
    const draft = publishableDraft();
    draft.publicDraft.approximatePlace = 'Indiranagar';
    draft.privateDraft = {
      exactAddress: '42 Private Lane',
      privateContact: '+910000000000',
      coordinationNotes: 'Gate code 1234',
    };

    const disclosure = describeDisclosure(draft);
    const revealed = JSON.stringify([
      disclosure.visibleNow,
      disclosure.visibleAfterAction,
    ]);

    expect(revealed).not.toContain('42 Private Lane');
    expect(revealed).not.toContain('+910000000000');
    expect(revealed).not.toContain('1234');
  });

  it('names what is held back without repeating its contents', () => {
    const draft = publishableDraft();
    draft.privateDraft.exactAddress = '42 Private Lane';

    const { heldBack } = describeDisclosure(draft);

    expect(heldBack).toHaveLength(1);
    expect(heldBack[0]?.label).toBe('Exact address');
    expect(heldBack[0]?.detail).not.toContain('42 Private Lane');
  });

  it('holds nothing back when no private details were entered', () => {
    expect(describeDisclosure(publishableDraft()).heldBack).toEqual([]);
  });
});

describe('draft serialisation', () => {
  it('round-trips through the stored shape', () => {
    const draft = publishableDraft();
    const parsed = intentDraftSchema.parse(JSON.parse(JSON.stringify(draft)));

    expect(parsed).toEqual(draft);
  });

  it('rejects stored data that is not a draft', () => {
    expect(intentDraftSchema.safeParse({ publicDraft: {} }).success).toBe(false);
  });
});
