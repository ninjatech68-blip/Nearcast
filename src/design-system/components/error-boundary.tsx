import type { ErrorBoundaryProps } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * Last line of defence. Without this, an uncaught render error in a
 * release build leaves a blank white screen with no way out — the app
 * looks dead and the only recovery is a force-quit.
 *
 * expo-router catches the error and re-renders this in place, so `retry`
 * remounts the failed segment without restarting the app.
 *
 * The message is shown deliberately: this ships to testers, and "it
 * broke" with no detail makes a bug report useless. It is the error's
 * message only — never a stack — so nothing internal leaks into a
 * screenshot.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <Text style={styles.wordmark}>NEARCAST</Text>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          that screen broke.
        </Text>
        <Text style={styles.sub}>
          nothing you did, and nothing you wrote was lost. try again, and if it keeps happening,
          send us this line.
        </Text>
        <Text style={styles.detail} selectable numberOfLines={6}>
          {error?.message?.trim() || 'unknown error'}
        </Text>
      </ScrollView>
      <BarButton label="try again" variant="onOrange" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 28 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  body: { flexGrow: 1, justifyContent: 'center', gap: 12 },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.85,
    color: tokens.semantic.color.ink,
  },
  sub: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.textMutedOnCream },
  detail: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.semantic.color.textMutedOnCream,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    borderRadius: tokens.primitive.radius.control,
    padding: 12,
  },
});
