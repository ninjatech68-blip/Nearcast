/**
 * Privacy-safe content checks for anything rendered into a discoverable
 * surface (intent cards, previews, composer drafts).
 *
 * These are display-side guardrails, not a replacement for the database and
 * Edge Function invariants that keep exact location and contact details out of
 * discoverable rows in the first place.
 */

/** A decimal coordinate pair such as `12.9716, 77.5946`. */
const COORDINATE_PAIR = /-?\d{1,3}\.\d{3,}\s*[,/]\s*-?\d{1,3}\.\d{3,}/;

/** A street address with a house or building number, such as `221 Baker Street`. */
const STREET_ADDRESS =
  /\b\d{1,5}[a-z]?[,\s]+[\w'-]+(\s+[\w'-]+)?\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|cross|main|block|apartment|apt|flat|suite)\b/i;

/** A flat or door number written before the building, such as `Flat 4B`. */
const DOOR_NUMBER = /\b(flat|apt|apartment|suite|door|house|plot)\s*(no\.?|number)?\s*#?\s*\d+[a-z]?\b/i;

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;

/** Seven or more dialable digits, allowing spaces, dashes, dots, and brackets. */
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/;

export type PrivacyViolation = 'exactLocation' | 'contactDetails';

/** Detects an exact location: coordinates, a street address, or a door number. */
export function findsExactLocation(value: string): boolean {
  return COORDINATE_PAIR.test(value) || STREET_ADDRESS.test(value) || DOOR_NUMBER.test(value);
}

/** Detects contact details: an email address or a dialable phone number. */
export function findsContactDetails(value: string): boolean {
  return EMAIL.test(value) || PHONE.test(value.replace(COORDINATE_PAIR, ' '));
}

/** Returns every privacy violation found in a piece of user-visible copy. */
export function findPrivacyViolations(value: string): PrivacyViolation[] {
  const violations: PrivacyViolation[] = [];

  if (findsExactLocation(value)) {
    violations.push('exactLocation');
  }

  if (findsContactDetails(value)) {
    violations.push('contactDetails');
  }

  return violations;
}

const MESSAGES: Record<PrivacyViolation, string> = {
  exactLocation: 'must use an approximate area, not an exact location',
  contactDetails: 'must not include contact details',
};

/**
 * Throws when a field about to be shown to other people carries an exact
 * location or contact details. Used by the components that render discoverable
 * content so a privacy regression fails loudly instead of shipping quietly.
 */
export function assertPrivacySafe(field: string, value: string): void {
  const [violation] = findPrivacyViolations(value);

  if (violation) {
    throw new Error(`${field} ${MESSAGES[violation]}.`);
  }
}
