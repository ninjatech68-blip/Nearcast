import { useEffect } from 'react';

import { syncProfile } from './profile-sync';
import { useMe } from './me-store';

/**
 * Keep the server's copy of who you are in step with the device's.
 *
 * Mounted once in the app shell rather than called from each screen
 * that edits a field, because there are five of those and forgetting
 * one would mean a person's areas quietly stop matching what they see
 * in settings.
 *
 * Failures are swallowed on purpose, and only here: this is background
 * upkeep with no button behind it, so there is nothing to tell the
 * person and nothing for them to retry. The next change re-syncs
 * everything — the write is a full replace, not a delta — so a missed
 * run costs nothing once they are back online.
 */
export function useProfileSync(): void {
  const me = useMe();
  const areas = me.approvedAreas.join('|');
  const interests = me.interests.join('|');
  // the VALUES matter, not just the keys: re-picking an area the
  // person already had changes only its point, and that has to re-sync
  // or delivery keeps measuring from the old place.
  const points = Object.entries(me.areaPoints)
    .map(([name, point]) => `${name}:${point.latitude},${point.longitude}`)
    .sort()
    .join('|');
  const ready = me.signedIn && me.onboardingDone;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      try {
        await syncProfile({
          name: me.name,
          approvedAreas: me.approvedAreas,
          areaPoints: me.areaPoints,
          interests: me.interests,
        });
      } catch {
        if (!cancelled) {
          // nothing to surface: see the note above.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // the joined strings are the dependency: the arrays are new objects
    // every render and would re-run this on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, me.name, areas, interests, points]);
}
