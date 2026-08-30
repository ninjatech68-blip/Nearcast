import { z } from 'zod';

/**
 * Responding to an intent.
 *
 * The screen contract allows one CTA and forbids showing competing responses,
 * so nothing here models a list of other people's replies: a respondent has
 * their own draft and no view of anyone else's. That is a privacy rule, not a
 * layout preference.
 *
 * Pure: no React Native, no Supabase.
 */

export const RESPONSE_MESSAGE_MAX_LENGTH = 1000;

export const responseMessageSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, 'Write a short note so they know how you can help')
      .max(
        RESPONSE_MESSAGE_MAX_LENGTH,
        `Responses are limited to ${RESPONSE_MESSAGE_MAX_LENGTH} characters`,
      ),
  );

/** Optional, factual qualifications a respondent can volunteer. */
export const QUALIFICATION_KEYS = ['can_travel', 'has_transport', 'available_now'] as const;

export type QualificationKey = (typeof QUALIFICATION_KEYS)[number];

export const QUALIFICATION_LABELS: Record<QualificationKey, string> = {
  can_travel: 'I can travel to them',
  has_transport: 'I have transport',
  available_now: 'I am available now',
};

export type ResponseDraft = {
  message: string;
  qualification: Partial<Record<QualificationKey, boolean>>;
};

export function emptyResponseDraft(): ResponseDraft {
  return { message: '', qualification: {} };
}

/**
 * Only true values are sent. An unchecked box is an absence of a claim, not a
 * claim of absence, and storing `false` would let a screen later render "does
 * not have transport" as though the person had asserted it.
 */
export function toQualificationPayload(
  draft: ResponseDraft,
): Record<string, boolean> {
  return Object.fromEntries(
    QUALIFICATION_KEYS.filter((key) => draft.qualification[key] === true).map(
      (key) => [key, true],
    ),
  );
}

export function findResponseProblems(draft: ResponseDraft): string[] {
  const parsed = responseMessageSchema.safeParse(draft.message);

  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
}

export function canSubmitResponse(draft: ResponseDraft): boolean {
  return findResponseProblems(draft).length === 0;
}

export type DisclosureLine = { label: string; detail: string };

/**
 * What the broadcaster will see, and what stays hidden.
 *
 * Mirrors the PrivacyDisclosure idea from the composer: a respondent should
 * know exactly what they are handing over before they hand it over. Contact
 * details are never part of a response, so they are named as withheld rather
 * than silently absent.
 */
export function describeResponseDisclosure(
  draft: ResponseDraft,
  respondentFirstName: string,
): { shared: DisclosureLine[]; withheld: DisclosureLine[] } {
  const shared: DisclosureLine[] = [
    { label: 'Your first name', detail: respondentFirstName },
    { label: 'Your note', detail: draft.message.trim() },
  ];

  for (const key of QUALIFICATION_KEYS) {
    if (draft.qualification[key] === true) {
      shared.push({ label: 'You said', detail: QUALIFICATION_LABELS[key] });
    }
  }

  return {
    shared,
    withheld: [
      {
        label: 'Your contact details',
        detail: 'Shared only if they accept you, and only when you release them',
      },
      {
        label: 'Your exact location',
        detail: 'Never shared through a response',
      },
    ],
  };
}
