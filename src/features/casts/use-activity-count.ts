import { usePendingReports } from '@/features/attendance/store';
import { useConversations } from '@/features/chat/chat';

import { usePendingJoinsOnMyCasts } from './store';

/**
 * How many things on the activity page are actually waiting for you.
 *
 * One definition, shared by the rail badge and the tab counts, so the
 * dot on the rail can never disagree with what you find when you tap
 * it. Everything counted here is a real row someone is waiting on:
 *
 *   - requests to join casts you posted
 *   - unread messages in your chats
 *   - plans that need a "how did it go?" before they can settle
 *
 * Never a total of things to look at — a number that includes what you
 * have already read is a number nobody can clear.
 */
export function useActivityCount(): number {
  const requests = usePendingJoinsOnMyCasts();
  const chats = useConversations();
  const reflect = usePendingReports('me');
  return (
    requests.length + chats.reduce((n, chat) => n + chat.unread, 0) + reflect.length
  );
}
