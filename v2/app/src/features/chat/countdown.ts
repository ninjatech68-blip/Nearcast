/**
 * A live label for a chat window's remaining time.
 *
 * The header used to show a string frozen at the moment the thread was
 * loaded ("22h left") that never moved, so a window an hour from closing
 * looked the same as one a day out. This turns an expiry timestamp into
 * a label that counts down as the clock actually runs.
 *
 * The grain widens with the distance, the way a person thinks about it:
 * days out, then hours, then minutes in the last hour, because the last
 * hour is the one where the exact number matters. `open` and `ended`
 * carry no clock.
 */
export function countdownLabel(
  mode: 'day' | 'week' | 'always' | 'ended',
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): string {
  if (mode === 'ended') return 'ended';
  if (mode === 'always') return 'open';
  if (!expiresAt) return '24h left';

  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'expired';

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m left`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h left`;

  // round to the nearest day past a day out: "6d left", never "6d 3h".
  return `${Math.round(hours / 24)}d left`;
}

/** how often the label needs re-rendering to stay honest, given the distance. */
export function countdownTickMs(expiresAt: string | null | undefined, now: number = Date.now()): number {
  if (!expiresAt) return 60_000;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 60_000;
  // inside the final hour it moves by the minute; further out, once a minute
  // is still plenty and costs nothing.
  return ms < 3_600_000 ? 30_000 : 60_000;
}
