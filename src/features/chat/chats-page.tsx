import { router } from 'expo-router';
import { useEffect } from 'react';

import { Face } from '@/design-system/components/face';
import { Page, Quiet } from '@/design-system/components/page';
import { Row } from '@/design-system/components/row';
import { Tag } from '@/design-system/components/tag';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { refreshConversations, useConversations } from '@/features/chat/chat';
import { useRefresher } from '@/infrastructure/net/use-refresher';

/**
 * Chats: its own destination now, rather than one of three tabs on a
 * page that also carried requests and your own casts.
 *
 * It needs no tabs of its own, because everything on it is the same
 * kind of thing — which is the clearest evidence that the old activity
 * page was carrying two jobs. A live conversation is what people come
 * back for several times a day; a join request is a once-in-a-while
 * event. They do not belong behind the same label.
 *
 * An ended chat stays in place with an `ended` tag instead of
 * disappearing. A plan that happened is not a plan that never was.
 */
export function ChatsPage() {
  const chats = useConversations();

  useEffect(() => {
    void refreshConversations();
  }, []);

  const { refreshing, onRefresh } = useRefresher(() => refreshConversations());

  return (
    <Page title="chats" refreshing={refreshing} onRefresh={onRefresh} refreshLabel="looking for messages…">
      {chats.length === 0 ? (
        <Quiet head="quiet." sub="no chats yet. one opens the moment a request is accepted." />
      ) : (
        chats.map((chat) => (
          <Row
            key={chat.conversationId}
            title={chat.withName}
            sub={
              chat.planCount > 1
                ? `${chat.planCount} plans · ${chat.ended ? 'ended' : chat.lastMessage}`
                : `"${chat.castTitle}" · ${chat.ended ? 'ended' : chat.lastMessage}`
            }
            left={
              <Face
                photo={facePhotos[chat.withId]}
                initials={chat.withName.slice(0, 2).toUpperCase()}
                size={44}
                label={`photo of ${chat.withName}`}
                verified={isVerified(chat.withId)}
              />
            }
            right={
              chat.ended ? (
                <Tag label="ended" tone="dim" />
              ) : chat.unread > 0 ? (
                <Tag label={String(chat.unread)} tone="hot" />
              ) : (
                <Tag label="→" tone="line" />
              )
            }
            onPress={() => router.push(`/chat/${chat.conversationId}`)}
          />
        ))
      )}
    </Page>
  );
}
