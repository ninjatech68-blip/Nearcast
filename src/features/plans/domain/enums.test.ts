import { describe, expect, expectTypeOf, it } from 'vitest';

import type { Database } from '@/infrastructure/supabase/database.types';

import {
  DELIVERY_REASONS,
  MEMBER_STATUSES,
  PLAN_STATUSES,
  PLAN_TYPES,
  REACH_LEVELS,
  type DeliveryReason,
  type PlanStatus,
  type PlanType,
  type ReachLevel,
} from './enums';

type DbEnums = Database['public']['Enums'];

describe('domain enums mirror the database', () => {
  it('matches the database enum types exactly', () => {
    expectTypeOf<PlanType>().toEqualTypeOf<DbEnums['plan_type']>();
    expectTypeOf<PlanStatus>().toEqualTypeOf<DbEnums['plan_status']>();
    expectTypeOf<ReachLevel>().toEqualTypeOf<DbEnums['reach_level']>();
    expectTypeOf<DeliveryReason>().toEqualTypeOf<DbEnums['delivery_reason']>();
  });

  it('lists reach levels narrowest first', () => {
    expect(REACH_LEVELS).toEqual(['friends', 'friends_of_friends', 'nearby', 'city']);
  });

  it('has no duplicates', () => {
    for (const list of [PLAN_TYPES, PLAN_STATUSES, REACH_LEVELS, DELIVERY_REASONS, MEMBER_STATUSES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
