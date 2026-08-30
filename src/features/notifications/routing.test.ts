import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({ router: { navigate: vi.fn(), dismissAll: vi.fn() } }));
vi.mock('@/features/casts/store', () => ({ refreshInteractions: vi.fn() }));
vi.mock('@/features/chat/chat', () => ({ refreshConversations: vi.fn() }));
vi.mock('./push', () => ({ addNotificationListeners: vi.fn(() => () => undefined) }));

const { requestActivityPage, onActivityRequested, resetActivityRequest } =
  await import('./routing');

beforeEach(() => resetActivityRequest());

describe('asking the home pager for the activity page', () => {
  it('tells a pager that is already listening', () => {
    const goToActivity = vi.fn();
    onActivityRequested(goToActivity);
    requestActivityPage();
    expect(goToActivity).toHaveBeenCalledTimes(1);
  });

  // THE REGRESSION: the tap handler calls this straight after
  // router.navigate('/'), which only schedules the move. The pager does
  // not exist yet — least of all on a cold start from a closed app,
  // where the whole shell boots first — so a plain event bus drops the
  // request and the person lands on the feed.
  it('keeps a request made before the pager exists, and delivers it on mount', () => {
    requestActivityPage();
    const goToActivity = vi.fn();
    onActivityRequested(goToActivity);
    expect(goToActivity).toHaveBeenCalledTimes(1);
  });

  it('delivers a kept request once, not to every later subscriber', () => {
    requestActivityPage();
    const first = vi.fn();
    const second = vi.fn();
    onActivityRequested(first);
    onActivityRequested(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('does not re-deliver to a pager that remounts later', () => {
    requestActivityPage();
    const first = vi.fn();
    const unsubscribe = onActivityRequested(first);
    expect(first).toHaveBeenCalledTimes(1);

    unsubscribe();
    const remounted = vi.fn();
    onActivityRequested(remounted);
    expect(remounted).not.toHaveBeenCalled();
  });

  it('forgets a request nobody claimed in time', () => {
    vi.useFakeTimers();
    try {
      requestActivityPage();
      // opening the app minutes later, for your own reasons, must not
      // bounce you to activity because of a notification you ignored.
      vi.advanceTimersByTime(60_000);
      const goToActivity = vi.fn();
      onActivityRequested(goToActivity);
      expect(goToActivity).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fire on mount when nothing was ever asked for', () => {
    const goToActivity = vi.fn();
    onActivityRequested(goToActivity);
    expect(goToActivity).not.toHaveBeenCalled();
  });
});
