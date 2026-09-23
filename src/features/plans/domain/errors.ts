export const SERVER_ERROR_CODES = [
  'underage',
  'not_available',
  'stale',
  'plan_full',
  'plan_not_live',
  'plan_started',
  'duplicate_request',
  'already_member',
  'not_member',
  'not_host',
  'cannot_narrow',
  'women_only_not_allowed',
  'women_only_required',
  'verified_required',
  'connections_required',
  'blocked',
  'restricted',
  'spot_locked',
  'rate_limited',
  'invalid_capacity',
  'invalid_time',
  'no_basis_for_connection',
  'opt_in_required',
] as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
export type ErrorCode = ServerErrorCode | 'unknown';

const NOT_AVAILABLE = "This isn't available. It may have ended or isn't shared with you.";

const COPY: Record<ErrorCode, string> = {
  underage: 'You need to be 18 or older to use TrueGoing.',
  not_available: NOT_AVAILABLE,
  // A block must read exactly like any other "not available" (04 §A.4).
  blocked: NOT_AVAILABLE,
  stale: 'This plan changed. Check the latest version and try again.',
  plan_full: 'Just filled up.',
  plan_not_live: "This plan isn't open right now.",
  plan_started: 'This plan has already started.',
  duplicate_request: "You've already asked.",
  already_member: "You're already in.",
  not_member: "You're not in this plan.",
  not_host: 'Only the host can do that.',
  cannot_narrow: 'You can widen who sees a plan, but not narrow it.',
  women_only_not_allowed: 'Only verified women can host women-only plans.',
  women_only_required: 'This plan is for verified women.',
  verified_required: 'This plan is for verified people.',
  connections_required: 'This plan is for friends and friends of friends.',
  restricted: 'Your account is limited right now. Contact support.',
  spot_locked: 'The exact spot unlocks 1 hour before the plan starts.',
  rate_limited: "You're doing that too often. Try again in a minute.",
  invalid_capacity: "Capacity can't be lower than the number of people going.",
  invalid_time: 'Check the time. A plan has to end after it starts.',
  no_basis_for_connection: "You can connect after you've been to a plan together.",
  opt_in_required: 'Turn on contact matching in Settings first.',
  unknown: 'Something went wrong. Try again.',
};

const KNOWN = new Set<string>(SERVER_ERROR_CODES);

/** Server functions raise the error code as the exception message (05 §8). */
export function toErrorCode(error: { message?: string } | null | undefined): ErrorCode {
  const message = error?.message?.trim() ?? '';
  return KNOWN.has(message) ? (message as ServerErrorCode) : 'unknown';
}

export function errorCopy(code: ErrorCode): string {
  return COPY[code];
}
