import { describe, expect, it } from 'vitest';

import { DELIVERY_REASONS } from './enums';
import { reasonText } from './reason';

describe('reason lines (closed set, 06 §9.5)', () => {
  it('renders every reason code', () => {
    expect(reasonText('friend_going', { name: 'Priya' })).toBe('Priya is going');
    expect(reasonText('friend_vouched', { name: 'Arjun' })).toBe('Vouched by Arjun');
    expect(reasonText('friend_hosting', { name: 'Priya' })).toBe('Priya is hosting');
    expect(reasonText('friends_of_friends', {})).toBe('Friends of friends');
    expect(reasonText('nearby_interest', { interest: 'Badminton' })).toBe('Near you · Badminton');
    expect(reasonText('nearby', {})).toBe('Near you');
    expect(reasonText('heading_to', { city: 'Shimla' })).toBe("You're heading to Shimla");
    expect(reasonText('venue_nearby', {})).toBe('Hosted by a venue near you');
    expect(reasonText('widened', { city: 'Chandigarh' })).toBe('Anyone in Chandigarh');
  });

  it('covers exactly the database reason codes', () => {
    const params = { name: 'A', interest: 'B', city: 'C' };
    for (const code of DELIVERY_REASONS) {
      expect(reasonText(code, params).length).toBeGreaterThan(0);
    }
  });

  it('throws when a required parameter is missing or blank', () => {
    expect(() => reasonText('friend_going', {})).toThrow('missing name');
    expect(() => reasonText('heading_to', { city: '  ' })).toThrow('missing city');
  });

  it('throws on an unknown code instead of inventing a reason', () => {
    expect(() => reasonText('popular' as never, {})).toThrow('unknown reason');
  });

  it('fits the database limit of 120 characters', () => {
    expect(() => reasonText('friend_going', { name: 'x'.repeat(200) })).toThrow('too long');
  });
});
