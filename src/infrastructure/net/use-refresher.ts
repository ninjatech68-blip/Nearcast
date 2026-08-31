import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pull-to-refresh state, with a floor on how long it is allowed to look
 * like it is working.
 *
 * A refresh that returns in 80ms sets `refreshing` back to false before
 * the spinner has drawn a frame, so the screen looks identical whether
 * the pull did something, did nothing, or failed. Testers reported
 * exactly that: "not sure if loading on pull is done or not". Holding
 * the state for a beat is not a fake delay to seem busy — it is the
 * difference between an answer and no answer.
 *
 * Never throws into the screen: a refresher is background upkeep with
 * no button behind it, and the list keeps showing what it already had.
 */
const MIN_VISIBLE_MS = 650;

export function useRefresher(run: () => Promise<unknown>): {
  refreshing: boolean;
  onRefresh: () => void;
} {
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const running = useRef(false);
  // the latest run, so a re-render with a new closure does not pin the
  // refresher to the callback captured on first mount. written in an
  // effect, never during render.
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  }, [run]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const onRefresh = useCallback(() => {
    if (running.current) return; // a second pull mid-flight is not a second fetch
    running.current = true;
    setRefreshing(true);
    const started = Date.now();
    void (async () => {
      try {
        await latest.current();
      } catch {
        // the screen keeps what it had; there is nothing to retry into
      } finally {
        const held = Date.now() - started;
        const wait = Math.max(0, MIN_VISIBLE_MS - held);
        setTimeout(() => {
          running.current = false;
          if (mounted.current) setRefreshing(false);
        }, wait);
      }
    })();
  }, []);

  return { refreshing, onRefresh };
}
