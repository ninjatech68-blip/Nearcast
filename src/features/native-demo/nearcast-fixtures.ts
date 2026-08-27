import type { IntentSummary } from './native-ui';

export const featuredIntent: IntentSummary = {
  id: 'badminton-tonight',
  primitive: 'I want to',
  title: 'Two more players for badminton after work',
  summary: 'Looking for two intermediate players near Indiranagar for an easy doubles game after work today.',
  metadata: 'Tonight · Indiranagar area',
  area: 'Indiranagar area',
  confirmations: '3 origin confirmations',
  expiry: 'Ends tonight',
  trust: 'One trusted connection',
  reason: 'Nearby and relevant to your preferences.',
  reasonBody: 'Nearby and relevant to your preferences.',
  action: 'Request to join',
  status: 'Live · 2 responses · Ends tonight',
  chips: ['2 spots open', 'Intermediate friendly', 'After 7:00 PM'],
};

export const secondIntent: IntentSummary = {
  id: 'walk-and-talk',
  primitive: 'I want to',
  title: 'Easy evening walk and conversation',
  summary: 'Quiet walk and slow conversation. Meet in the park area.',
  metadata: 'Evening · Koramangala area',
  area: 'Koramangala area',
  confirmations: '2 origin confirmations',
  expiry: 'Ends today',
  trust: 'Connected through Kavya',
  reason: 'Similar evening walks in your circle.',
  action: 'Request to join',
  status: 'Open',
  chips: ['Conversation', 'Approximate area'],
};

export const thirdIntent: IntentSummary = {
  id: 'ceramics-partner',
  primitive: 'I need',
  title: 'Studio partner for weekend ceramics',
  summary: 'Split a shared studio slot Saturday morning. Beginner friendly.',
  metadata: 'Saturday morning · HSR area',
  area: 'HSR area',
  confirmations: '1 origin confirmation',
  expiry: 'Ends Friday',
  trust: 'One trusted connection',
  reason: 'You saved a similar ceramics intent recently.',
  action: 'Request to join',
  status: 'Open',
  chips: ['1 spot', 'Beginner friendly'],
};

export const broadcaster = {
  id: 'aarav',
  initials: 'AA',
  name: 'Aarav',
  area: 'Indiranagar area',
  context: 'One trusted connection',
  hiddenContact: 'Contact details hidden until accepted',
};

export type ActivityRowData = {
  id: string;
  initials: string;
  title: string;
  body: string;
  time: string;
  badge?: number;
  status?: string;
};

export const activityResponses: readonly ActivityRowData[] = [
  {
    id: 'riya-response',
    initials: 'RK',
    title: 'Riya responded',
    body: '“I can join after 7:00 pm.”',
    time: '4 minutes ago',
    badge: 1,
  },
  {
    id: 'arjun-updated',
    initials: 'AK',
    title: 'Coordination updated',
    body: 'Arjun shared a new time.',
    time: '18 minutes ago',
    status: 'Matched',
  },
  {
    id: 'nisha-declined',
    initials: 'NS',
    title: 'Nisha stepped back',
    body: 'Nisha is no longer available today.',
    time: '32 minutes ago',
    status: 'Closed',
  },
];

export const myIntents = [
  {
    id: 'badminton-tonight',
    title: 'Badminton after work',
    meta: 'Live · 2 responses · Ends tonight',
  },
  {
    id: 'coffee-weekend',
    title: 'Coffee this weekend',
    meta: 'Draft · Only you can see this',
  },
  {
    id: 'ceramics-partner',
    title: 'Weekend ceramics partner',
    meta: 'Open · 0 responses · Ends Friday',
  },
] as const;

export const primitives = [
  { value: 'request', label: 'I need' },
  { value: 'offer', label: 'I offer' },
  { value: 'plan', label: 'I want to' },
] as const;

export const reachLevels = [
  { value: 'origin_only', title: 'Trusted circles', body: 'People you are connected to' },
  { value: 'adjacent_network', title: 'Adjacent network', body: 'People connected to your network' },
  { value: 'nearby_relevant', title: 'Relevant nearby', body: 'People near you with shared context' },
  { value: 'broader_approved', title: 'Broader approved', body: 'People in approved neighborhoods' },
] as const;
