import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { broadcaster } from '@/features/native-demo/nearcast-fixtures';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

export default function MessagesScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle>Messages</ScreenTitle>

        <Section title="Active rooms">
          <Group>
            <Pressable
              accessibilityLabel={`Open your room with ${broadcaster.name} about Badminton tonight`}
              accessibilityRole="button"
              onPress={() => router.push('/match/badminton-tonight')}
              style={styles.roomRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{broadcaster.initials}</Text></View>
              <View style={styles.roomCopy}>
                <Text style={styles.title}>Badminton tonight</Text>
                <Text style={styles.body}>{broadcaster.name}</Text>
                <Text style={styles.status}>Awaiting confirmation</Text>
              </View>
            </Pressable>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: tokens.semantic.color.trustText },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.backgroundSubtle },
  roomCopy: { flex: 1 },
  title: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  body: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  status: { marginTop: 4, fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 17, color: tokens.semantic.color.trustText },
});
