import { useMemo } from 'react';

import { buildRecap, type Recap } from '@/features/casts/domain/recap';
import { useMyPastPlans } from '@/features/attendance/store';

/**
 * The month's recap from the viewer's real attendance record.
 *
 * Lives here rather than in the screen because two places read it —
 * the settings row and the poster — and a headline that disagreed with
 * the row that opened it would look like a bug.
 */
export function useRecap(): Recap {
  const past = useMyPastPlans();
  return useMemo(
    () =>
      buildRecap(
        past.map((entry) => ({
          startsAt: entry.plan.startsAt,
          outcome: entry.outcome,
          others: entry.others,
          area: entry.plan.area,
        })),
        new Date(),
      ),
    [past],
  );
}
