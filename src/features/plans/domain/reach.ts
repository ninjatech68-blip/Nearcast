import { REACH_LEVELS, type ReachLevel } from './enums';

type ReachOptions = { connectionsOnly?: boolean };

export function reachRank(level: ReachLevel): number {
  return REACH_LEVELS.indexOf(level) + 1;
}

/** Reach only widens (AGENTS.md). Connections-only plans stop at friends of friends. */
export function canWiden(from: ReachLevel, to: ReachLevel, options: ReachOptions = {}): boolean {
  if (options.connectionsOnly && reachRank(to) > reachRank('friends_of_friends')) return false;
  return reachRank(to) > reachRank(from);
}

export function widenOptions(current: ReachLevel, options: ReachOptions = {}): ReachLevel[] {
  return REACH_LEVELS.filter((level) => canWiden(current, level, options));
}

export function reachLabel(level: ReachLevel, city: string): string {
  switch (level) {
    case 'friends':
      return 'Friends';
    case 'friends_of_friends':
      return 'Friends of friends';
    case 'nearby':
      return 'Nearby';
    case 'city':
      return `Anyone in ${city}`;
  }
}
