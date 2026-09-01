import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertsPage } from '@/features/casts/alerts-page';
import { ChatsPage } from '@/features/chat/chats-page';
import { fontFamily, tokens } from '@/design-system/tokens';

export type InboxTab = 'actions' | 'chat';

/**
 * One destination for everything waiting on you.
 *
 * Chats and alerts were two of four dock slots. Merging them is what
 * makes three destinations enough, and it is the right merge on its own
 * terms: both answer the same question -- what needs me? -- and someone
 * checking one is already checking the other.
 *
 * The tabs go in Page's `subhead` slot -- a row below the title, left of
 * the screen. They cannot go on the title row: the cast button owns the
 * top-right corner, and a tab under it is a tab you cannot read or tap.
 * The first version stacked its own strip on top of a Page that already
 * owned the safe area, so the strip rendered at y=0 underneath the
 * status bar and the screen carried two titles: "inbox" from here and
 * "alerts" from the page inside it. One Page, one title, one inset.
 *
 * Two tabs: `actions` (everything you owe or are part of -- the alerts,
 * with their own NEEDS YOU / YOUR PLANS grouping inside) and `chat` (the
 * conversations). Both answer "what needs me?", which is why they share
 * one destination; the split is only which KIND of thing needs you.
 */
export function InboxPage({ chatCount = 0, activityCount = 0 }: { chatCount?: number; activityCount?: number }) {
  const [tab, setTab] = useState<InboxTab>('actions');

  const tabs = (
    <View style={styles.strip} accessibilityRole="tablist">
      <TabButton label="actions" count={activityCount} selected={tab === 'actions'} onPress={() => setTab('actions')} />
      <TabButton label="chat" count={chatCount} selected={tab === 'chat'} onPress={() => setTab('chat')} />
    </View>
  );

  return tab === 'actions' ? (
    <AlertsPage title="inbox" subhead={tabs} />
  ) : (
    <ChatsPage title="inbox" subhead={tabs} />
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
  strip: { flexDirection: 'row', gap: 24, marginTop: 10 },
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
