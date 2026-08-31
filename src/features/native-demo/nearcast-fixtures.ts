export const featuredIntent = {
  id: 'badminton-tonight',
  primitive: 'I need',
  title: 'Two people for badminton tonight',
  summary: 'Join a friendly doubles game tonight. Intermediate level is fine.',
  metadata: 'Tonight, 8:00 PM · Indiranagar area',
  expiry: 'Expires in 7 hours',
  trust: 'One trusted connection',
  reason: 'You play nearby on weekday evenings.',
  action: 'Request to join',
  status: 'Request open',
  chips: ['2 spots', 'Friendly intermediate', 'Approximate area'],
};

export const secondIntent = {
  id: 'walk-and-talk',
  primitive: 'I want to',
  title: 'Walk and talk this evening',
  summary: 'Easy evening walk and conversation.',
  metadata: 'Evening · Koramangala area',
  expiry: 'Expires today',
  trust: 'Connected through Kavya',
  reason: 'You both joined nearby weekday plans.',
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
