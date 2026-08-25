import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { NoteInput, Section, SymbolIcon, TopBar } from '@/features/native-demo/native-ui';

export default function RequestSheetScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <TopBar title="Request" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <View style={styles.sheet}>
            <Text accessibilityRole="header" style={styles.title}>Request to join</Text>
            <Text style={styles.body}>Aarav will see your first name and response.</Text>
            <Section>
              <NoteInput placeholder="Add a short note" />
            </Section>
            <View style={styles.privacyRow}>
              <SymbolIcon fallback="L" name="lock" size={18} />
              <Text style={styles.privacyText}>Exact contact details stay hidden</Text>
            </View>
            <View style={styles.actions}>
              <Button label="Send request" onPress={() => router.back()} />
              <Text style={styles.cancel}>Cancel</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.light.background.app },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end', padding: 16 },
  sheet: { padding: 18, borderWidth: 1, borderColor: tokens.color.light.border.subtle, borderRadius: 24, backgroundColor: tokens.color.light.background.surface },
  title: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.color.light.text.primary },
  body: { marginTop: 8, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 22, color: tokens.color.light.text.secondary },
  privacyRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: tokens.color.light.background.surfaceMuted },
  privacyText: { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.color.light.text.secondary },
  actions: { marginTop: 18, gap: 12 },
  cancel: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: tokens.color.light.text.secondary },
});
