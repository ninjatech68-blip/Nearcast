import type { PosterData } from '@/design-system/components/poster';
import type { DeliverableCast, ViewerContext } from '@/features/casts/domain/delivery';

/**
 * fixture data for the frontend build. nothing here ships to production:
 * counts, vouches, and receipts come from confirmed events server-side,
 * and the "why you" line is computed by the delivery framework — never
 * written by hand.
 */

export type PendingJoin = {
  personId: string;
  note: string;
  /** display label, never a real timestamp (fixtures never call Date.now) */
  sentAgo: string;
  /** server response id, set only in backend mode — maps this request
   *  back to the row accept/decline act on. absent on fixtures. */
  responseId?: string;
  /** the joiner's first name, from the server. fixtures resolve names
   *  locally, so this is only populated in backend mode. */
  displayName?: string;
};

export type CastDetail = PosterData & {
  by: string;
  byId: string;
  byLine: string;
  receipts: { lit: number; line: string };
  body: string;
  delivery: DeliverableCast;
  /** every delivery signal that fired, for the transparency tap */
  signals?: readonly string[];
  /**
   * how many joiners the caster wants. HIDDEN from the UI for now —
   * the concept added friction to casting without earning its place,
   * so the field stays (the schema and accept path still respect it)
   * but nothing surfaces or asks about it.
   */
  slotsWanted?: number;
  /** who has sent a note but not yet been accepted or declined */
  pendingJoins?: readonly PendingJoin[];
  /** who the caster has already accepted — these people have chat access */
  matched?: readonly string[];
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
  {
    id: 'kavya',
    name: 'Kavya',
    area: 'koramangala',
    trustLine: 'in your circle',
    receipts: { lit: 4, line: '22 plans made real · 0 flakes · casting since may' },
    vouchLine: 'in your college crew',
  },
  {
    id: 'nikhil',
    name: 'Nikhil',
    area: 'indiranagar',
    trustLine: '1 trusted link away',
    receipts: { lit: 3, line: '9 plans made real · 0 flakes · casting since june' },
    vouchLine: 'vouched by 1 person you trust',
  },
  {
    id: 'sana',
    name: 'Sana',
    area: 'koramangala',
    trustLine: '1 trusted link away',
    receipts: { lit: 4, line: '18 plans made real · 1 flake · casting since march' },
    vouchLine: 'vouched by 1 person you trust',
  },
  {
    id: 'rohan',
    name: 'Rohan',
    area: 'hsr',
    trustLine: '1 trusted link away',
    receipts: { lit: 3, line: '14 plans made real · 0 flakes · casting since april' },
    vouchLine: 'vouched by 1 person you trust',
  },
  {
    id: 'priya',
    name: 'Priya',
    area: 'indiranagar',
    trustLine: 'nearby with context',
    receipts: { lit: 2, line: '5 plans made real · 0 flakes · casting since july' },
    vouchLine: 'shares your indiranagar area',
  },
  {
    id: 'vikram',
    name: 'Vikram',
    area: 'koramangala',
    trustLine: 'nearby with context',
    receipts: { lit: 3, line: '11 plans made real · 0 flakes · casting since february' },
    vouchLine: 'runs a product meetup you saved',
  },
  {
    id: 'neha',
    name: 'Neha',
    area: 'indiranagar',
    trustLine: 'in your circle',
    receipts: { lit: 3, line: '7 plans made real · 0 flakes · casting since june' },
    vouchLine: 'in your flat 4b',
  },
];

export const casts: readonly CastDetail[] = [
  {
    id: 'chess-park-mine',
    category: 'games',
    text: 'chess in the park sunday morning. bring a board.',
    area: 'indiranagar',
    vouches: 'your circles',
    expiry: 'gone sun',
    why: 'you cast this',
    by: 'Piyush',
    byId: 'me',
    byLine: 'indiranagar · your cast',
    receipts: { lit: 4, line: '31 plans made real · 0 flakes' },
    body: 'casual games, 3–4 people. bring a board if you have one.',
    delivery: {
      casterId: 'me',
      area: 'indiranagar',
      category: 'games',
      categoryLabel: 'games',
      window: 'weekend-morning',
      radiusKm: 5,
      casterCircleIds: [],
    },
    matched: [],
    pendingJoins: [
      { personId: 'riya', note: 'I play regularly. would love to join.', sentAgo: '4m ago' },
      { personId: 'arjun', note: 'can be there by 9. sunday works.', sentAgo: '18m ago' },
    ],
  },
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
      radiusKm: 5,
      casterCircleIds: ['kavya-friends'],
    },
  },
  {
    id: 'ceramics-split',
    category: 'arts',
    text: 'someone to split a ceramics class saturday morning.',
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
      radiusKm: 10,
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
      radiusKm: 5,
      casterCircleIds: ['dev-music-people'],
    },
  },
  {
    id: 'sunday-brunch',
    category: 'social',
    text: 'sunday brunch, small table. two spots.',
    area: 'koramangala',
    vouches: '4 vouches',
    expiry: 'gone sat',
    why: 'in your college crew',
    by: 'Kavya',
    byId: 'kavya',
    byLine: 'koramangala · in your circle',
    receipts: { lit: 4, line: '22 plans made real · 0 flakes' },
    body: 'the small cafe near the park. bring a book or don\'t. splitting the bill.',
    delivery: {
      casterId: 'kavya',
      area: 'koramangala',
      category: 'social',
      categoryLabel: 'social',
      window: 'weekend-morning',
      radiusKm: 2,
      casterCircleIds: ['college-crew'],
    },
  },
  {
    id: 'burrito-hunt',
    category: 'food',
    text: 'burrito hunt. new spot on 12th cross.',
    area: 'indiranagar',
    vouches: '2 vouches',
    expiry: 'gone 8pm',
    why: 'near you in indiranagar',
    by: 'Nikhil',
    byId: 'nikhil',
    byLine: 'indiranagar · 1 trusted link',
    receipts: { lit: 3, line: '9 plans made real · 0 flakes' },
    body: 'grabbing an early dinner. two other seats. we split the guac.',
    delivery: {
      casterId: 'nikhil',
      area: 'indiranagar',
      category: 'food',
      categoryLabel: 'food + drinks',
      window: 'weekday-evening',
      radiusKm: 5,
      casterCircleIds: ['kavya-friends'],
    },
  },
  {
    id: 'coorg-weekend',
    category: 'travel',
    text: 'coorg road trip, three seats left.',
    area: 'koramangala',
    vouches: '2 vouches',
    expiry: 'gone fri',
    why: 'one trusted link away',
    by: 'Sana',
    byId: 'sana',
    byLine: 'koramangala · 1 trusted link',
    receipts: { lit: 4, line: '18 plans made real · 1 flake' },
    body: 'leave saturday 6am, back sunday night. stay + fuel split five ways.',
    delivery: {
      casterId: 'sana',
      area: 'koramangala',
      category: 'travel',
      categoryLabel: 'travel + outdoors',
      window: 'weekend-morning',
      radiusKm: 5,
      casterCircleIds: ['dev-music-people'],
    },
  },
  {
    id: 'board-game-night',
    category: 'games',
    text: 'board game night, room for two more.',
    area: 'hsr',
    vouches: '3 vouches',
    expiry: 'gone 11pm',
    why: 'you\'re into games',
    by: 'Rohan',
    byId: 'rohan',
    byLine: 'hsr · 1 trusted link',
    receipts: { lit: 3, line: '14 plans made real · 0 flakes' },
    body: 'catan, wingspan, or whatever the room lands on. snacks provided.',
    delivery: {
      casterId: 'rohan',
      area: 'hsr',
      category: 'games',
      categoryLabel: 'games',
      window: 'weekday-evening',
      radiusKm: 5,
      casterCircleIds: ['kavya-friends'],
    },
  },
  {
    id: 'python-study',
    category: 'learning',
    text: 'python study group, thursdays.',
    area: 'indiranagar',
    vouches: '1 vouch',
    expiry: 'gone thu',
    why: 'near you in indiranagar',
    by: 'Priya',
    byId: 'priya',
    byLine: 'indiranagar · nearby',
    receipts: { lit: 2, line: '5 plans made real · 0 flakes' },
    body: 'working through the crafting-interpreters book. beginners welcome.',
    delivery: {
      casterId: 'priya',
      area: 'indiranagar',
      category: 'learning',
      categoryLabel: 'learning',
      window: 'weekday-evening',
      radiusKm: 25,
      casterCircleIds: ['book-club'],
    },
  },
  {
    id: 'product-meetup',
    category: 'networking',
    text: 'product folks meetup, tuesday.',
    area: 'koramangala',
    vouches: '2 vouches',
    expiry: 'gone tue',
    why: 'near you in koramangala',
    by: 'Vikram',
    byId: 'vikram',
    byLine: 'koramangala · nearby',
    receipts: { lit: 3, line: '11 plans made real · 0 flakes' },
    body: 'small room, no pitches. talking about tools we actually use.',
    delivery: {
      casterId: 'vikram',
      area: 'koramangala',
      category: 'networking',
      categoryLabel: 'networking',
      window: 'weekday-evening',
      radiusKm: 25,
      casterCircleIds: ['product-collective'],
    },
  },
  {
    id: 'moving-hands',
    category: 'help',
    text: 'need two hands moving a bookshelf saturday.',
    area: 'indiranagar',
    vouches: '1 vouch',
    expiry: 'gone sat',
    why: 'in your flat 4b',
    by: 'Neha',
    byId: 'neha',
    byLine: 'indiranagar · in your circle',
    receipts: { lit: 3, line: '7 plans made real · 0 flakes' },
    body: 'thirty minutes at most. lunch after. no truck needed.',
    delivery: {
      casterId: 'neha',
      area: 'indiranagar',
      category: 'help',
      categoryLabel: 'help + favors',
      window: 'weekend-morning',
      radiusKm: 2,
      casterCircleIds: ['flat-4b'],
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
    sub: 'live · gone 10pm',
    castId: 'badminton-after-work',
  },
  {
    id: 'ceramics-draft',
    title: 'ceramics class',
    sub: 'draft · only you',
    tag: { label: 'draft', tone: 'dim' },
  },
];

export const me = {
  name: 'Piyush',
  area: 'indiranagar',
  signal: { lit: 4, word: 'strong' },
  receipts: { count: 31, sub: '31 plans made real · last: badminton, tuesday' },
  circles: '3 circles · 24 people',
  areas: 'indiranagar, koramangala, hsr · always approximate',
  quietHours: '10pm to 7am',
  blocked: 'nobody',
  privacy: 'casts carry the neighbourhood, never an exact spot — the app never has one. sort out exactly where in chat; it lives in-app, numbers never change hands.',
};

export const recap = {
  month: 'march',
  headline: '6 plans made real.',
  meta: "2 people you'd never met · tuesdays are your night",
  why: "share it or don't. it's yours.",
};

