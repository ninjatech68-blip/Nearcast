/**
 * The two-way conversion between the label quiet hours are stored as
 * ("10:00 pm") and the Date the platform time picker wants.
 *
 * Shared rather than local because quiet hours now live on their own
 * screen, and the profile still renders the same label underneath the
 * row that opens it. One parser, so the two can never disagree.
 */

export function timeToDate(label: string): Date {
  const match = label.match(/(\d+):(\d+)\s*(am|pm)/i);
  const now = new Date();
  now.setSeconds(0, 0);
  // an unreadable label is not worth throwing over: the picker opens on
  // the current time and whatever the person sets replaces it.
  if (!match) return now;
  let hours = Number.parseInt(match[1], 10) % 12;
  const minutes = Number.parseInt(match[2], 10);
  if (match[3].toLowerCase() === 'pm') hours += 12;
  now.setHours(hours, minutes);
  return now;
}

export function dateToTime(date: Date): string {
  const minutes = date.getMinutes();
  let hours = date.getHours();
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
