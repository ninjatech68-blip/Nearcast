import type { MatchMessage } from './domain/match-room';

export const VIEWER_ID = 'me';

export const matchRoom = {
  castTitle: 'Two people for badminton tonight',
  hostInitials: 'AA',
  hostName: 'Aarav',
  status: 'Matched',
  statusDetail: 'Open until tonight, 10:00 PM',
};

/**
 * Fields released to both parties by the acceptance. Anything absent here is
 * still private, so the room states that explicitly rather than leaving the
 * boundary to inference.
 */
export const releasedFields = [
  ['Meeting place', 'Indiranagar Sports Arena, Court 3'],
  ['Time', 'Tonight, 8:00 PM'],
  ['Phone', 'Shared only if you both choose to'],
] as const;

export const matchMessages: MatchMessage[] = [
  {
    authorId: 'aarav',
    body: 'Great — court 3 is booked from 8.',
    id: 'm1',
    readByRecipient: true,
    sentAt: '2026-08-31T12:04:00.000Z',
    status: 'sent',
  },
  {
    authorId: 'aarav',
    body: 'Bring a spare racket if you have one.',
    id: 'm2',
    readByRecipient: true,
    sentAt: '2026-08-31T12:04:30.000Z',
    status: 'sent',
  },
  {
    authorId: VIEWER_ID,
    body: 'Will do. See you there.',
    id: 'm3',
    readByRecipient: true,
    sentAt: '2026-08-31T12:06:00.000Z',
    status: 'sent',
  },
];
