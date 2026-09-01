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
 * terms: both answer the same question -- what needs me? -- and a person
 * checking one is already checking the other.
 *
 * Two tabs and no more. The activity side keeps its own group strip
 * (needs / waiting / plans), which appears only when two or more groups
 * have rows, so most of the time there is exactly one level of tabs on
 * screen and never a strip with a single choice in it.
 */
export function InboxPage({ chatCount = 0, activityCount = 0 }: { chatCount?: number; activityCount?: number }) {
  const [tab, setTab] = useState<InboxTab>('activity');

  return (
    <View style={styles.page}>
      <View style={styles.strip} accessibilityRole="tablist">
        <TabButton
          label="activity"
          count={activityCount}
          selected={tab === 'activity'}
          onPress={() => setTab('activity')}
        />
        <TabButton label="chats" count={chatCount} selected={tab === 'chats'} onPress={() => setTab('chats')} />
      </View>
      {tab === 'activity' ? <AlertsPage /> : <ChatsPage />}
    </View>
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
      // the spoken label carries the real number; the rule the dock
      // follows, so a screen reader never hears a rounded count.
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
  page: { flex: 1, backgroundColor: tokens.semantic.color.cream },
  strip: { flexDirection: 'row', paddingHorizontal: 20, gap: 24 },
  tab: { paddingTop: 8 },
  tabLabel: { fontFamily: fontFamily.text, fontSize: 15, paddingBottom: 10 },
  tabLabelOn: { color: tokens.semantic.color.ink, fontWeight: '600' },
  // was ink at 40%, which computes to #9A978E on cream -- 2.57:1, under
  // the 4.5:1 that 15pt text owes. This is a real token, not an opacity.
  tabLabelOff: { color: tokens.semantic.color.textMutedOnCream, fontWeight: '400' },
  rule: { height: 2, borderRadius: 1 },
  ruleOn: { backgroundColor: tokens.semantic.color.ink },
  ruleOff: { backgroundColor: 'transparent' },
});
