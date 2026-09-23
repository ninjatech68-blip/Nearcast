import { describe, expect, it } from 'vitest';

import { canWiden, reachLabel, reachRank, widenOptions } from './reach';

describe('reach', () => {
  it('ranks levels narrowest first', () => {
    expect(reachRank('friends')).toBeLessThan(reachRank('friends_of_friends'));
    expect(reachRank('friends_of_friends')).toBeLessThan(reachRank('nearby'));
    expect(reachRank('nearby')).toBeLessThan(reachRank('city'));
  });

  it('only widens, never narrows or stays put', () => {
    expect(canWiden('nearby', 'city')).toBe(true);
    expect(canWiden('nearby', 'nearby')).toBe(false);
    expect(canWiden('city', 'friends')).toBe(false);
  });

  it('offers only wider levels', () => {
    expect(widenOptions('friends_of_friends')).toEqual(['nearby', 'city']);
    expect(widenOptions('city')).toEqual([]);
  });

  it('caps connections-only plans at friends of friends', () => {
    expect(widenOptions('friends', { connectionsOnly: true })).toEqual(['friends_of_friends']);
    expect(canWiden('friends_of_friends', 'nearby', { connectionsOnly: true })).toBe(false);
  });

  it('uses the locked vocabulary', () => {
    expect(reachLabel('friends', 'Chandigarh')).toBe('Friends');
    expect(reachLabel('friends_of_friends', 'Chandigarh')).toBe('Friends of friends');
    expect(reachLabel('nearby', 'Chandigarh')).toBe('Nearby');
    expect(reachLabel('city', 'Chandigarh')).toBe('Anyone in Chandigarh');
  });
});
