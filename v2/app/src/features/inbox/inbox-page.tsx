import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertsPage } from '@/features/casts/alerts-page';
import { ChatsPage } from '@/features/chat/chats-page';
import { fontFamily, tokens } from '@/design-system/tokens';

export type InboxTab = 'activity' | 'chats';

/**
 * One destination for everything waiting on you.
 *
 * Chats and alerts were two of four dock slots. Merging them is what
 * makes three destinations enough, and it is the right merge on its own
 * terms: both answer the same question -- what needs me? -- and someone
 * checking one is already checking the other.
 *
 * The tabs go in Page's `accessory` slot rather than above the page.
 * The first version stacked its own strip on top of a Page that already
 * owned the safe area, so the strip rendered at y=0 underneath the
 * status bar and the screen carried two titles: "inbox" from here and
 * "alerts" from the page inside it. One Page, one title, one inset.
 */
export function InboxPage({ chatCount = 0, activityCount = 0 }: { chatCount?: number; activityCount?: number }) {
  const [tab, setTab] = useState<InboxTab>('activity');

  const tabs = (
    <View style={styles.strip} accessibilityRole="tablist">
      <TabButton label="activity" count={activityCount} selected={tab === 'activity'} onPress={() => setTab('activity')} />
      <TabButton label="chats" count={chatCount} selected={tab === 'chats'} onPress={() => setTab('chats')} />
    </View>
  );

  return tab === 'activity' ? (
    <AlertsPage title="inbox" accessory={tabs} />
  ) : (
    <ChatsPage title="inbox" accessory={tabs} />
  );
}

function TabButton({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      // the spoken label carries the real number, the rule the dock
      // follows too: a screen reader never hears a rounded count.
      accessibilityLabel={count > 0 ? `${label}, ${count} waiting` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.tab}
      hitSlop={8}
    >
      <Text style={[styles.tabLabel, selected ? styles.tabLabelOn : styles.tabLabelOff]}>
        {label}
        {count > 0 ? `  ${count > 9 ? '9+' : count}` : ''}
      </Text>
      <View style={[styles.rule, selected ? styles.ruleOn : styles.ruleOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 24, marginTop: 4 },
  tab: { paddingTop: 4 },
  tabLabel: { fontFamily: fontFamily.text, fontSize: 15, paddingBottom: 8 },
  tabLabelOn: { color: tokens.semantic.color.ink, fontWeight: '600' },
  // was ink at 40% -- #9A978E on cream, 2.55:1, under the 4.5:1 that
  // 15pt text owes. A real token now, not an opacity.
  tabLabelOff: { color: tokens.semantic.color.textMutedOnCream, fontWeight: '400' },
  rule: { height: 2, borderRadius: 1 },
  ruleOn: { backgroundColor: tokens.semantic.color.ink },
  ruleOff: { backgroundColor: 'transparent' },
});
