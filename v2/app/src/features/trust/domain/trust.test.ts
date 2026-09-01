import { describe, expect, it } from 'vitest';

import { reachSize, trustLink, type TrustGraph } from './trust';

// me & aarav share 'badminton-gang'; aarav & meera share 'hsr-potters';
// meera & dev share 'gig-crew'; nova is off on her own island.
const graph: TrustGraph = {
  membership: {
    me: ['badminton-gang', 'flat-4b'],
    aarav: ['badminton-gang', 'hsr-potters'],
    meera: ['hsr-potters', 'gig-crew'],
    dev: ['gig-crew'],
    nova: ['island'],
  },
};

describe('trust graph', () => {
  it('calls a shared-circle person in your circle (distance 0)', () => {
    const link = trustLink(graph, 'me', 'aarav');
    expect(link.distance).toBe(0);
    expect(link.phrase).toBe('in your circle');
    expect(link.viaCircleId).toBe('badminton-gang');
  });

  it('establishes 1 trusted link away through one intermediary', () => {
    // me → aarav (shared) → meera (shared with aarav): meera is one link away
    const link = trustLink(graph, 'me', 'meera');
    expect(link.distance).toBe(1);
    expect(link.phrase).toBe('1 trusted link away');
    expect(link.viaCircleId).toBe('badminton-gang');
  });

  it('establishes 2 trusted links away', () => {
    // me → aarav → meera → dev
    const link = trustLink(graph, 'me', 'dev');
    expect(link.distance).toBe(2);
    expect(link.phrase).toBe('2 trusted links away');
  });

  it('returns not-in-network beyond the horizon', () => {
    const link = trustLink(graph, 'me', 'nova');
    expect(link.distance).toBeNull();
    expect(link.phrase).toBe('not in your network');
  });

  it('counts reachable people within the horizon as the range number', () => {
    // aarav (0), meera (1), dev (2) are reachable; nova is not
    expect(reachSize(graph, 'me')).toBe(3);
  });

  it('is symmetric on distance', () => {
    expect(trustLink(graph, 'dev', 'me').distance).toBe(2);
  });
});
