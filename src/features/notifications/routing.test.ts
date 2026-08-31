import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({ router: { navigate: vi.fn(), dismissAll: vi.fn() } }));
vi.mock('@/features/casts/store', () => ({ refreshInteractions: vi.fn() }));
vi.mock('@/features/chat/chat', () => ({ refreshConversations: vi.fn() }));
vi.mock('./push', () => ({ addNotificationListeners: vi.fn(() => () => undefined) }));

const { requestAlertsPage, onAlertsRequested, resetAlertsRequest } =
  await import('./routing');

beforeEach(() => resetAlertsRequest());

describe('asking the home pager for the alerts page', () => {
  it('tells a pager that is already listening', () => {
    const goToAlerts = vi.fn();
    onAlertsRequested(goToAlerts);
    requestAlertsPage();
    expect(goToAlerts).toHaveBeenCalledTimes(1);
  });

  // THE REGRESSION: the tap handler calls this straight after
  // router.navigate('/'), which only schedules the move. The pager does
  // not exist yet — least of all on a cold start from a closed app,
  // where the whole shell boots first — so a plain event bus drops the
  // request and the person lands on the feed.
  it('keeps a request made before the pager exists, and delivers it on mount', () => {
    requestAlertsPage();
    const goToAlerts = vi.fn();
    onAlertsRequested(goToAlerts);
    expect(goToAlerts).toHaveBeenCalledTimes(1);
  });

  it('delivers a kept request once, not to every later subscriber', () => {
    requestAlertsPage();
    const first = vi.fn();
    const second = vi.fn();
    onAlertsRequested(first);
    onAlertsRequested(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('does not re-deliver to a pager that remounts later', () => {
    requestAlertsPage();
    const first = vi.fn();
    const unsubscribe = onAlertsRequested(first);
    expect(first).toHaveBeenCalledTimes(1);

    unsubscribe();
    const remounted = vi.fn();
    onAlertsRequested(remounted);
    expect(remounted).not.toHaveBeenCalled();
  });

  it('forgets a request nobody claimed in time', () => {
    vi.useFakeTimers();
    try {
      requestAlertsPage();
      // opening the app minutes later, for your own reasons, must not
      // bounce you to alerts because of a notification you ignored.
      vi.advanceTimersByTime(60_000);
      const goToAlerts = vi.fn();
      onAlertsRequested(goToAlerts);
      expect(goToAlerts).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fire on mount when nothing was ever asked for', () => {
    const goToAlerts = vi.fn();
    onAlertsRequested(goToAlerts);
    expect(goToAlerts).not.toHaveBeenCalled();
  });
});
