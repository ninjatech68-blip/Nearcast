import { describe, expect, it } from 'vitest';

import {
  centroidFor,
  DEFAULT_RADIUS_KM,
  distanceKm,
  RADIUS_CHOICES,
  withinRadius,
} from './geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ latitude: 12.97, longitude: 77.64 }, { latitude: 12.97, longitude: 77.64 })).toBe(0);
  });

  it('matches a known city-scale distance', () => {
    const indiranagar = centroidFor('indiranagar')!;
    const koramangala = centroidFor('koramangala')!;
    // ~5km apart in reality; allow a wide band, this is approximate by design
    const d = distanceKm(indiranagar, koramangala);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(7);
  });

  it('is symmetric', () => {
    const a = centroidFor('hsr')!;
    const b = centroidFor('whitefield')!;
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
  });
});

describe('centroidFor', () => {
  it('is case and whitespace insensitive', () => {
    expect(centroidFor('  Indiranagar ')).toEqual(centroidFor('indiranagar'));
  });

  it('returns null for a place we cannot put on the map', () => {
    expect(centroidFor('gulmohar trends, dhakoli')).toBeNull();
  });
});

describe('withinRadius', () => {
  it('includes an area inside the radius and excludes one outside it', () => {
    // indiranagar → whitefield is ~12km
    expect(withinRadius('whitefield', ['indiranagar'], 25)).toBe(true);
    expect(withinRadius('whitefield', ['indiranagar'], 5)).toBe(false);
  });

  it('takes the nearest of the viewer areas, not the first', () => {
    // hsr is 7.5km from indiranagar but 3.6km from koramangala, so a
    // 4km cast reaches a viewer who counts both as theirs.
    expect(withinRadius('hsr', ['indiranagar', 'koramangala'], 4)).toBe(true);
    expect(withinRadius('hsr', ['indiranagar'], 4)).toBe(false);
  });

  it('is inclusive at the boundary', () => {
    const exact = distanceKm(centroidFor('indiranagar')!, centroidFor('koramangala')!);
    expect(withinRadius('koramangala', ['indiranagar'], exact)).toBe(true);
    expect(withinRadius('koramangala', ['indiranagar'], exact - 0.001)).toBe(false);
  });

  it('falls back to name matching when the cast area is unplaceable', () => {
    // treating an unknown area as "far" would silently stop delivery,
    // which is worse than a coarse match.
    expect(withinRadius('Dhakoli', ['dhakoli'], 2)).toBe(true);
    expect(withinRadius('Dhakoli', ['indiranagar'], 25)).toBe(false);
  });

  it('falls back to name matching when no viewer area can be placed', () => {
    expect(withinRadius('indiranagar', ['zirakpur', 'indiranagar'], 2)).toBe(true);
    expect(withinRadius('indiranagar', ['zirakpur'], 25)).toBe(false);
  });

  it('offers a default that is one of the choices, and none that rebuild a group chat', () => {
    expect(RADIUS_CHOICES.some((c) => c.km === DEFAULT_RADIUS_KM)).toBe(true);
    expect(Math.min(...RADIUS_CHOICES.map((c) => c.km))).toBeGreaterThanOrEqual(2);
  });
});
