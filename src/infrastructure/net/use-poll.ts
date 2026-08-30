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
 * `fn` is kept in a ref so a new closure each render does not restart
 * the timer; only `intervalMs` and `enabled` do.
 */
export function usePoll(fn: () => void, intervalMs: number, enabled = true): void {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      saved.current(); // fire at once so a return from background is instant
      timer = setInterval(() => saved.current(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs, enabled]);
}
