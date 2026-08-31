export const featuredIntent = {
  id: 'badminton-tonight',
  primitive: 'I need',
  title: 'Two people for badminton tonight',
  summary: 'Join a friendly doubles game tonight. Intermediate level is fine.',
  metadata: 'Tonight, 8:00 PM · Indiranagar area',
  expiry: 'Open for another 7 hours',
  trust: 'One trusted connection',
  reason: 'Shown because you play nearby on weekday evenings.',
  action: 'Ask to join',
  requestNote: 'Your request goes to Aarav. Your exact location stays private.',
  status: 'Request open',
  chips: ['2 spots', 'Friendly intermediate', 'Approximate area'],
};

export const secondIntent = {
  id: 'walk-and-talk',
  primitive: 'I want to',
  title: 'Walk and talk this evening',
  summary: 'Easy evening walk and conversation.',
  metadata: 'Evening · Koramangala area',
  expiry: 'Open for the rest of today',
  trust: 'Connected through Kavya',
  reason: 'Shown because you both joined nearby weekday plans.',
  action: 'View',
  status: 'Open',
  chips: ['Conversation', 'Approximate area'],
};

export const broadcaster = {
  id: 'aarav',
  initials: 'AA',
  name: 'Aarav',
  area: 'Indiranagar area',
  context: 'One trusted connection',
  hiddenContact: 'Contact details hidden until accepted',
};
