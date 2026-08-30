export const RESPONSE_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
] as const;

export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];
