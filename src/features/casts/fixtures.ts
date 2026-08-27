import type { PosterData } from '@/design-system/components/poster';
import type { DeliverableCast, ViewerContext } from '@/features/casts/domain/delivery';

/**
 * fixture data for the frontend build. nothing here ships to production:
 * counts, vouches, and receipts come from confirmed events server-side,
 * and the "why you" line is computed by the delivery framework — never
 * written by hand.
 */

export type CastDetail = PosterData & {
  by: string;
  byId: string;
  byLine: string;
  receipts: { lit: number; line: string };
  body: string;
  delivery: DeliverableCast;
  /** every delivery signal that fired, for the transparency tap */
  signals?: readonly string[];
};

/** the signed-in viewer, as the delivery framework sees them. */
export const viewer: ViewerContext = {
  areas: ['indiranagar', 'koramangala', 'hsr'],
  circleIds: ['badminton-gang', 'flat-4b', 'college-crew'],
  adjacentCircleIds: ['kavya-friends', 'dev-music-people'],
  // onboarding picks: the standing interest signal
  interests: ['sports', 'games', 'arts'],
  activeWindows: ['weekday-evening'],
  blockedCasterIds: [],
};

export type CasterProfile = {
  id: string;
  name: string;
  area: string;
  trustLine: string;
  receipts: { lit: number; line: string };
  vouchLine: string;
};

export const casters: readonly CasterProfile[] = [
  {
    id: 'aarav',
    name: 'Aarav',
    area: 'indiranagar',
    trustLine: '1 trusted link away · your circle vouches',
    receipts: { lit: 4, line: '31 plans made real · 0 flakes · casting since march' },
    vouchLine: 'vouched by 2 people you trust',
  },
  {
    id: 'meera',
    name: 'Meera',
    area: 'hsr',
    trustLine: '1 trusted link away',
    receipts: { lit: 3, line: '12 plans made real · 1 flake · casting since april' },
    vouchLine: 'vouched by 1 person you trust',
  },
  {
    id: 'dev',
    name: 'Dev',
    area: 'koramangala',
    trustLine: '2 trusted links away',
    receipts: { lit: 5, line: '48 plans made real · 0 flakes · casting since february' },
    vouchLine: 'vouched by 1 person one link away',
  },
];

export const casts: readonly CastDetail[] = [
  {
    id: 'badminton-after-work',
    category: 'sports',
    text: 'badminton after work. need two.',
    area: 'indiranagar',
    vouches: '3 vouches',
    expiry: 'gone 10pm',
    why: 'you play nearby on weekday evenings',
    by: 'Aarav',
    byId: 'aarav',
    byLine: 'indiranagar · 1 trusted link · your circle vouches',
    receipts: { lit: 4, line: '31 plans made real · 0 flakes' },
    body: "easy doubles, intermediate is fine. court's booked, split is ₹80.",
    delivery: {
      casterId: 'aarav',
      area: 'indiranagar',
      category: 'sports',
      categoryLabel: 'sports',
      window: 'weekday-evening',
      reach: 'adjacent_network',
      casterCircleIds: ['kavya-friends'],
    },
  },
  {
    id: 'ceramics-slot',
    category: 'arts',
    text: 'someone to split a ceramics slot saturday morning.',
    area: 'hsr',
    vouches: '1 vouch',
    expiry: 'gone friday',
    why: 'you saved a ceramics cast last week',
    by: 'Meera',
    byId: 'meera',
    byLine: 'hsr · 1 trusted link',
    receipts: { lit: 3, line: '12 plans made real · 1 flake' },
    body: 'shared studio, 9 to 12. wheel time split evenly. beginners fine.',
    delivery: {
      casterId: 'meera',
      area: 'hsr',
      category: 'arts',
      categoryLabel: 'arts + making',
      window: 'weekend-morning',
      reach: 'nearby_relevant',
      casterCircleIds: ['pottery-people'],
    },
  },
  {
    id: 'concert-ticket',
    category: 'music',
    text: 'extra concert ticket for thursday. face value.',
    area: 'koramangala',
    vouches: '2 vouches',
    expiry: 'gone thu',
    why: 'two of your circles overlap',
    by: 'Dev',
    byId: 'dev',
    byLine: 'koramangala · 1 trusted link',
    receipts: { lit: 5, line: '48 plans made real · 0 flakes' },
    body: 'indie gig at the brewery venue. ticket at cost, no markup.',
    delivery: {
      casterId: 'dev',
      area: 'koramangala',
      category: 'music',
      categoryLabel: 'music + nightlife',
      window: 'weekday-evening',
      reach: 'adjacent_network',
      casterCircleIds: ['dev-music-people'],
    },
  },
];

export type ActivityItem = {
  id: string;
  title: string;
  sub: string;
  tag?: { label: string; tone: 'hot' | 'ok' | 'dim' };
  castId?: string;
  personId?: string;
};

export const yourMove: readonly ActivityItem[] = [
  {
    id: 'riya-in',
    personId: 'riya',
    title: "Riya's in",
    sub: '"can do 7pm" · 4m ago',
    tag: { label: 'new', tone: 'hot' },
    castId: 'badminton-after-work',
  },
  {
    id: 'arjun-time',
    personId: 'arjun',
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
  areas: 'indiranagar, koramangala, hsr · always approximate',
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
