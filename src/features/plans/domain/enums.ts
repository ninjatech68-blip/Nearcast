// Mirrors the database enums (supabase/migrations/*_truegoing_foundation.sql).
// enums.test.ts fails to type-check if they drift apart.

export const PLAN_TYPES = ['plan', 'ask', 'offer'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_STATUSES = ['draft', 'live', 'full', 'started', 'ended', 'cancelled', 'restricted'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Narrowest first. Reach only ever moves to the right. */
export const REACH_LEVELS = ['friends', 'friends_of_friends', 'nearby', 'city'] as const;
export type ReachLevel = (typeof REACH_LEVELS)[number];

export const DELIVERY_REASONS = [
  'friend_going',
  'friend_vouched',
  'friend_hosting',
  'friends_of_friends',
  'nearby_interest',
  'nearby',
  'heading_to',
  'venue_nearby',
  'widened',
] as const;
export type DeliveryReason = (typeof DELIVERY_REASONS)[number];

export const MEMBER_STATUSES = ['going', 'left', 'removed'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
