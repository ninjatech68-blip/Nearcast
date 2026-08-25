export type ReliabilityEntry = {
  context: string;
  completed: number;
  confirmed: number;
};

/**
 * Reliability is rendered as counted evidence, never as a score, percentage or
 * rating. A universal reputation score is a stated product non-goal and is
 * prohibited by the trust and safety baseline.
 */
export function describeReliability(entry: ReliabilityEntry): string {
  if (entry.confirmed === 0) return 'No confirmed interactions yet';
  return `${entry.completed} of ${entry.confirmed} confirmed interactions were completed`;
}
