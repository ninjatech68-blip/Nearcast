import type { PosterData } from '@/design-system/components/poster';

/**
 * fixture data for the frontend build. nothing here ships to production:
 * counts, vouches, and receipts come from confirmed events server-side.
 */

export type CastDetail = PosterData & {
  by: string;
  byLine: string;
  receipts: { lit: number; line: string };
  body: string;
};

export const casts: readonly CastDetail[] = [
  {
    id: 'badminton-after-work',
    verb: 'lets',
    text: 'badminton after work. need two.',
    area: 'indiranagar',
    vouches: '3 vouches',
    expiry: 'gone 10pm',
    why: 'you play nearby on weekday evenings',
    by: 'Aarav',
    byLine: 'indiranagar · 1 trusted link · your circle vouches',
    receipts: { lit: 4, line: '31 plans made real · 0 flakes' },
    body: "easy doubles, intermediate is fine. court's booked, split is ₹80.",
  },
  {
    id: 'ceramics-slot',
    verb: 'need',
    text: 'someone to split a ceramics slot saturday morning.',
    area: 'hsr',
    vouches: '1 vouch',
    expiry: 'gone friday',
    why: 'you saved a ceramics cast last week',
    by: 'Meera',
    byLine: 'hsr · 1 trusted link',
    receipts: { lit: 3, line: '12 plans made real · 1 flake' },
    body: 'shared studio, 9 to 12. wheel time split evenly. beginners fine.',
  },
  {
    id: 'concert-ticket',
    verb: 'got',
    text: 'extra concert ticket for thursday. face value.',
    area: 'koramangala',
    vouches: '2 vouches',
    expiry: 'gone thu',
    why: 'two of your circles overlap',
    by: 'Dev',
    byLine: 'koramangala · 1 trusted link',
    receipts: { lit: 5, line: '48 plans made real · 0 flakes' },
    body: 'indie gig at the brewery venue. ticket at cost, no markup.',
  },
];

export type ActivityItem = {
  id: string;
  title: string;
  sub: string;
  tag?: { label: string; tone: 'hot' | 'ok' | 'dim' };
  castId?: string;
};

export const yourMove: readonly ActivityItem[] = [
  {
    id: 'riya-in',
    title: "Riya's in",
    sub: '"can do 7pm" · 4m ago',
    tag: { label: 'new', tone: 'hot' },
    castId: 'badminton-after-work',
  },
  {
    id: 'arjun-time',
    title: 'Arjun moved it to 7:30',
    sub: '18m ago',
    tag: { label: 'matched', tone: 'ok' },
    castId: 'badminton-after-work',
  },
];

export const yourCasts: readonly ActivityItem[] = [
  {
    id: 'badminton-mine',
    title: 'badminton after work',
    sub: 'live · 2 in · gone 10pm',
    castId: 'badminton-after-work',
  },
  {
    id: 'ceramics-draft',
    title: 'ceramics slot',
    sub: 'draft · only you',
    tag: { label: 'draft', tone: 'dim' },
  },
];

export const me = {
  name: 'Piyush',
  line: 'indiranagar · 3 circles vouch for you',
  signal: { lit: 4, word: 'strong' },
  range: 'your cast reaches ~240 people · only you see this',
  receipts: { count: 31, sub: '31 plans made real · last: badminton, tuesday' },
  circles: '3 circles · 24 people',
  areas: 'indiranagar, koramangala · always approximate',
  quietHours: '10pm to 7am',
  blocked: 'nobody',
  privacy: 'exact places + contacts stay hidden until both sides say yes.',
};

export const recap = {
  month: 'march',
  headline: '6 plans made real.',
  meta: "2 people you'd never met · tuesdays are your night",
  why: "share it or don't. it's yours.",
};

export const reachLevels = [
  { value: 'origin_only', title: 'your circles', sub: '24 people you trust' },
  { value: 'adjacent_network', title: 'friends of circles', sub: 'one trusted link away' },
  { value: 'nearby_relevant', title: 'nearby with context', sub: 'strangers who share a thread' },
  { value: 'broader_approved', title: 'approved areas', sub: 'widest. still not public.' },
] as const;

export type ReachValue = (typeof reachLevels)[number]['value'];
