const MINUTE_MS = 60_000;
const TONIGHT_FROM_HOUR = 17;
// Fixed abbreviations: locale data varies (en-GB renders September as "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type LocalParts = { dayNumber: number; hour: number; minute: number; weekday: string; day: number; month: string };

/** Wall-clock parts of `date` in `timeZone`, read as numbers so no locale strings leak in. */
function localParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const utcMidnight = Date.UTC(year, month - 1, day);
  return {
    dayNumber: Math.floor(utcMidnight / (24 * 60 * MINUTE_MS)),
    hour: get('hour') % 24,
    minute: get('minute'),
    weekday: WEEKDAYS[new Date(utcMidnight).getUTCDay()] ?? '',
    day,
    month: MONTHS[month - 1] ?? '',
  };
}

function clock(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${h12} ${suffix}` : `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * The time label on plan cards (06 §9.6): now · in 20 min · tonight 8 pm ·
 * today 1:30 pm · tomorrow 7:30 am · Sat 6 pm · 12 Oct · ended.
 * Calendar days are compared in the viewer's time zone.
 */
export function relativePlanTime(input: { startsAt: Date; endsAt: Date; now: Date; timeZone: string }): string {
  const { startsAt, endsAt, now, timeZone } = input;
  if (now.getTime() >= endsAt.getTime()) return 'ended';
  if (now.getTime() >= startsAt.getTime()) return 'now';

  const minutesAway = Math.ceil((startsAt.getTime() - now.getTime()) / MINUTE_MS);
  if (minutesAway < 60) return `in ${Math.max(1, minutesAway)} min`;

  const start = localParts(startsAt, timeZone);
  const today = localParts(now, timeZone);
  const daysAway = start.dayNumber - today.dayNumber;
  const time = clock(start.hour, start.minute);

  if (daysAway === 0) return start.hour >= TONIGHT_FROM_HOUR ? `tonight ${time}` : `today ${time}`;
  if (daysAway === 1) return `tomorrow ${time}`;
  if (daysAway < 7) return `${start.weekday} ${time}`;
  return `${start.day} ${start.month}`;
}
