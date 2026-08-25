import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/design-system/appearance';
import { type ColorScheme } from '@/design-system/tokens';
import { broadcaster } from '@/features/native-demo/nearcast-fixtures';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

export default function MessagesScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>Messages</ScreenTitle>

        <Section title="Active rooms">
          <Group>
            <View style={styles.roomRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{broadcaster.initials}</Text></View>
              <View style={styles.roomCopy}>
                <Text style={styles.title}>Badminton tonight</Text>
                <Text style={styles.body}>{broadcaster.name}</Text>
                <Text style={styles.status}>Awaiting confirmation</Text>
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Start a conversation">
          <Group>
            <View style={styles.emptyRow}>
              <View style={styles.emptyIcon}><SymbolIcon fallback="M" name="message" /></View>
              <View style={styles.roomCopy}>
                <Text style={styles.title}>Messages appear after acceptance</Text>
                <Text style={styles.body}>Once there is mutual interest, you can coordinate here.</Text>
              </View>
            </View>
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (color: ColorScheme) =>
  StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.background.app },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background.success },
  avatarText: { fontWeight: '700', fontSize: 18, color: color.on.success },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background.surfaceMuted },
  roomCopy: { flex: 1 },
  title: { fontWeight: '600', fontSize: 15, lineHeight: 21, color: color.text.primary },
  body: { marginTop: 2, fontWeight: '400', fontSize: 13, lineHeight: 19, color: color.text.secondary },
  status: { marginTop: 4, fontWeight: '600', fontSize: 12, lineHeight: 17, color: color.on.success },
});
