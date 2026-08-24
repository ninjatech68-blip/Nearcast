import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';

const steps = [
  ['1', 'Say what you need', 'Create a clear, temporary request, offer, or plan.'],
  ['2', 'Start with trust', 'Share privately and collect only genuine confirmations.'],
  ['3', 'Choose the reach', 'You decide if and when the intent travels further.'],
] as const;

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wordmarkRow}>
          <View style={styles.signalMark}><View style={styles.signalDot} /></View>
          <Text style={styles.wordmark}>nearcast</Text>
        </View>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TRUSTED REACH, ON YOUR TERMS</Text>
          <Text style={styles.title}>Let the intent travel. Keep the circle private.</Text>
          <Text style={styles.subtitle}>Move a real need, offer, or plan beyond one closed group without posting it everywhere.</Text>
        </View>
        <View style={styles.steps}>
          {steps.map(([number, title, description]) => (
            <View key={number} style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDescription}>{description}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.trustNote}>
          <Text style={styles.trustTitle}>No artificial activity</Text>
          <Text style={styles.trustBody}>Every confirmation and response comes from a real person. Empty states stay honest.</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Create an intent" onPress={() => router.push('/create')} />
        <Pressable accessibilityRole="button" hitSlop={12}><Text style={styles.signIn}>I already have an invitation</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signalMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: tokens.semantic.color.actionPrimary, alignItems: 'center', justifyContent: 'center' },
  signalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.semantic.color.actionPrimary },
  wordmark: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: tokens.semantic.color.textPrimary, letterSpacing: -0.5 },
  hero: { marginTop: 54 },
  eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.4, color: tokens.semantic.color.actionPrimary },
  title: { marginTop: 12, fontFamily: 'Manrope_700Bold', fontSize: 37, lineHeight: 43, letterSpacing: -1.4, color: tokens.semantic.color.textPrimary },
  subtitle: { marginTop: 16, fontFamily: 'Manrope_400Regular', fontSize: 17, lineHeight: 25, color: tokens.semantic.color.textSecondary },
  steps: { marginTop: 40, gap: 20 },
  step: { flexDirection: 'row', gap: 14 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.semantic.color.trustSurface, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: 'Manrope_700Bold', color: tokens.semantic.color.trustText },
  stepCopy: { flex: 1 },
  stepTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  stepDescription: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textMuted },
  trustNote: { marginTop: 36, padding: 16, borderRadius: 16, backgroundColor: tokens.semantic.color.trustSurface },
  trustTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: tokens.semantic.color.trustText },
  trustBody: { marginTop: 4, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.trustText },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, gap: 14, backgroundColor: tokens.semantic.color.backgroundCanvas },
  signIn: { textAlign: 'center', fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: tokens.semantic.color.textSecondary },
});
