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
 * or an accept, and both of those land in alerts, so a tap closes
 * whatever sheet was open and puts the pager on alerts. The
 * payload carries only a kind and ids (product law: no intent text, no
 * message, no coordinates), which is enough to pick the page and not
 * enough to render anything from — the screen reads the real row.
 */

type Listener = () => void;
const alertsListeners = new Set<Listener>();

/** ask the home pager to show the alerts page. */
export function requestAlertsPage(): void {
  for (const listener of alertsListeners) listener();
}

/** the home pager subscribes; returns its unsubscribe. */
export function onAlertsRequested(listener: Listener): () => void {
  alertsListeners.add(listener);
  return () => {
    alertsListeners.delete(listener);
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
        onTap: (payload) => {
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
          // A message ping is about ONE conversation, and the person
          // tapped it to read that conversation. Dropping them on the
          // activity list to find it themselves is the app making them
          // do the work the notification already did.
          if (payload.kind === 'chat_message' && payload.conversationId) {
            router.navigate(`/chat/${payload.conversationId}`);
            return;
          }
          router.navigate('/');
          requestAlertsPage();
        },
      }),
    [],
  );
}
