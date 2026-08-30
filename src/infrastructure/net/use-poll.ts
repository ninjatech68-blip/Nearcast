import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Run a function on an interval while the app is in the foreground.
 *
 * Realtime is the accelerant; this is the floor under it. Websockets can
 * fail to connect on a real device (captive networks, backgrounding, a
 * project without Realtime enabled), and when they do the chat must not
 * freeze until someone pulls to refresh — a messenger that needs a
 * manual refresh is broken. So the screen also polls: cheap re-reads on
 * a short interval that stop the moment the app backgrounds and fire
 * once immediately on return, so nothing is missed while away.
 *
 * `intervalMs` may be a FUNCTION, re-read before each wait rather than
 * captured once. That is what lets the interval answer "is the socket
 * carrying this already?" every time round: when realtime is live the
 * poll is duplicate load and can idle; the moment it drops, the next
 * wait is already the short one. A plain number still behaves exactly
 * as it always did.
 *
 * `fn` is kept in a ref so a new closure each render does not restart
 * the timer; only `enabled` does.
 */
export function usePoll(
  fn: () => void,
  intervalMs: number | (() => number),
  enabled = true,
): void {
  const saved = useRef(fn);
  const savedInterval = useRef(intervalMs);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => {
    savedInterval.current = intervalMs;
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;
    let paused = false;

    // chained timeouts rather than setInterval: the wait is decided
    // fresh each time, and a slow tick can never stack up behind itself.
    const waitFor = () => {
      const next = savedInterval.current;
      const ms = typeof next === 'function' ? next() : next;
      return Number.isFinite(ms) && ms > 0 ? ms : 1000;
    };
    const schedule = () => {
      if (unmounted || paused) return;
      timer = setTimeout(() => {
        timer = null;
        saved.current();
        schedule();
      }, waitFor());
    };
    const start = () => {
      if (unmounted || timer) return;
      paused = false;
      saved.current(); // fire at once so a return from background is instant
      schedule();
    };
    const stop = () => {
      paused = true;
      if (timer) clearTimeout(timer);
      timer = null;
    };

    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      unmounted = true;
      stop();
      sub.remove();
    };
  }, [enabled]);
}
