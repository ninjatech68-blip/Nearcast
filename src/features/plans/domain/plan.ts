import { z } from 'zod';

import { PLAN_TYPES } from './enums';

const HOUR_MS = 60 * 60 * 1000;

/** Length in code points, which is what PostgreSQL's char_length counts. */
const codePoints = (value: string) => Array.from(value).length;

/**
 * Validates a plan draft before it is sent to `create_plan_draft`.
 * The database enforces the same rules again (AGENTS.md).
 */
export function makePlanDraftSchema(now: Date) {
  return z
    .object({
      type: z.enum(PLAN_TYPES),
      text: z.string().trim().min(1).max(500),
      emoji: z.string().refine((value) => {
        const length = codePoints(value);
        return length >= 1 && length <= 8;
      }, 'invalid_emoji'),
      categoryId: z.uuid().optional(),
      startsAt: z.date(),
      endsAt: z.date(),
      repeatWeekly: z.boolean().default(false),
      capacity: z.number().int().min(1).max(200).nullable(),
      womenOnly: z.boolean().default(false),
      verifiedOnly: z.boolean().default(false),
      connectionsOnly: z.boolean().default(false),
      areaName: z.string().trim().min(1).max(80),
      city: z.string().trim().min(1).max(80),
      exactPoint: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
      exactAddress: z.string().trim().max(200).optional(),
      spotVisibility: z.enum(['on_unlock', 'immediate']).default('on_unlock'),
    })
    .refine((draft) => draft.endsAt.getTime() > draft.startsAt.getTime(), {
      message: 'invalid_time',
      path: ['endsAt'],
    })
    .refine((draft) => draft.startsAt.getTime() > now.getTime() - HOUR_MS, {
      message: 'invalid_time',
      path: ['startsAt'],
    })
    .transform((draft) => ({
      ...draft,
      // Asks and offers are for one accepted person.
      capacity: draft.type === 'plan' ? draft.capacity : 1,
      // Women-only plans are always verified-only.
      verifiedOnly: draft.verifiedOnly || draft.womenOnly,
    }));
}

export type PlanDraft = z.output<ReturnType<typeof makePlanDraftSchema>>;
export type PlanDraftInput = z.input<ReturnType<typeof makePlanDraftSchema>>;
