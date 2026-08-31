/**
 * The monthly recap, derived from real receipts.
 *
 * It used to be four hard-coded strings ("6 plans made real", "2 people
 * you'd never met"), identical on every device — a fabricated activity
 * count, which is the one thing this product may never show. Everything
 * here is computed from plans the person actually turned up to.
 *
 * Two rules follow from that:
 *
 *  - A month with no receipts says so. There is no filler headline and
 *    no rounded-up number; an empty month is a real answer.
 *  - A pattern is only named when it repeats. One tuesday is not a
 *    habit, and one area is not "mostly" anywhere, so a clause is
 *    dropped rather than stated from a single data point.
 *
 * Pure: no React, no store, no clock of its own — `now` is passed in so
 * the boundary of "this month" is testable.
 */

export type RecapInput = {
  /** when the plan happened */
  startsAt: Date;
  /** the computed outcome for the viewer; only 'receipt' counts */
  outcome: string;
  /** the other participants — ids offline, first names in a live app */
  others: readonly string[];
  area: string;
};

export type Recap = {
  /** lowercase month name, e.g. "march" */
  month: string;
  /** the poster's corner tag, e.g. "MARCH RECAP" */
  tag: string;
  headline: string;
  /** the supporting line. empty when nothing true can be said. */
  meta: string;
  why: string;
  /** false when the month has no receipts at all */
  hasData: boolean;
};

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** the value that occurs most often, but only if it occurs more than once. */
function repeatedTop(values: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function buildRecap(plans: readonly RecapInput[], now: Date): Recap {
  const month = MONTHS[now.getMonth()];
  const tag = `${month.toUpperCase()} RECAP`;

  const made = plans.filter(
    (plan) =>
      plan.outcome === 'receipt' &&
      plan.startsAt.getMonth() === now.getMonth() &&
      plan.startsAt.getFullYear() === now.getFullYear(),
  );

  if (made.length === 0) {
    return {
      month,
      tag,
      headline: 'nothing yet this month.',
      meta: 'your first one lands here.',
      why: 'it fills in as plans land. nothing here leaves your phone unless you share it.',
      hasData: false,
    };
  }

  const people = new Set<string>();
  for (const plan of made) for (const other of plan.others) people.add(other);

  const parts: string[] = [];
  if (people.size > 0) {
    parts.push(`${people.size} ${people.size === 1 ? 'person' : 'people'}`);
  }
  const weekday = repeatedTop(made.map((plan) => WEEKDAYS[plan.startsAt.getDay()]));
  if (weekday) parts.push(`${weekday}s are your night`);
  const area = repeatedTop(made.map((plan) => plan.area).filter((a) => a.trim().length > 0));
  if (area) parts.push(`mostly ${area}`);

  return {
    month,
    tag,
    headline: `${made.length} ${made.length === 1 ? 'plan' : 'plans'} made real.`,
    meta: parts.join(' · '),
    why: "share it or don't. it's yours.",
    hasData: true,
  };
}
