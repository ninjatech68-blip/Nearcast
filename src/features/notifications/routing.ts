import { router } from 'expo-router';
import { useEffect } from 'react';

import { refreshInteractions } from '@/features/casts/store';
import { refreshConversations } from '@/features/chat/chat';

import { addNotificationListeners } from './push';

/**
 * What happens when a push arrives, and when someone taps one.
 *
 * A notification is a claim that something changed on the server. If
 * tapping it lands on the same stale screen the person was looking at,
 * the push was a lie — so both paths pull the interaction state before
 * anything is shown.
 *
 * A tap also has to GO somewhere. Every push we send is about a request
 * or an accept, and both of those live on the activity page, so a tap
 * closes whatever sheet was open and puts the pager on activity. The
 * payload carries only a kind and ids (product law: no intent text, no
 * message, no coordinates), which is enough to pick the page and not
 * enough to render anything from — the screen reads the real row.
 */

type Listener = () => void;
const activityListeners = new Set<Listener>();

/** ask the home pager to show the activity page. */
export function requestActivityPage(): void {
  for (const listener of activityListeners) listener();
}

/** the home pager subscribes; returns its unsubscribe. */
export function onActivityRequested(listener: Listener): () => void {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}

/** mounted once in the app shell. */
export function useNotificationRouting(): void {
  useEffect(
    () =>
      addNotificationListeners({
        onReceived: () => {
          // arrived while the app is open: fold it into what is on screen
          // instead of leaving a banner over stale rows.
          void refreshInteractions();
          void refreshConversations();
        },
        onTap: () => {
          void refreshInteractions();
          void refreshConversations();
          // a push can be tapped from anywhere, including with a sheet
          // open over the pager. dismissAll throws when the stack has
          // nothing to dismiss, which is the common case.
          try {
            router.dismissAll();
          } catch {
            // nothing was open
          }
          router.navigate('/');
          requestActivityPage();
        },
      }),
    [],
  );
}
