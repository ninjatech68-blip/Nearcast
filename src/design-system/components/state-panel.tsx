import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';

/**
 * Every data screen must render one of these states. Skeletons may imply shape
 * but never imply people or counts that do not exist, so the loading state is a
 * plain indicator with a label rather than fake cards.
 */
export type ScreenState =
  | { kind: 'loading' }
  | { kind: 'empty'; title: string; body: string }
  | { kind: 'error'; message: string }
  | { kind: 'offline' }
  | { kind: 'restricted'; message: string };

type StatePanelProps = {
  state: ScreenState;
  onRetry?: () => void;
};

export function StatePanel({ state, onRetry }: StatePanelProps) {
  if (state.kind === 'loading') {
    return (
      <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={styles.panel}>
        <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
        <Text style={styles.body}>Loading</Text>
      </View>
    );
  }

  if (state.kind === 'empty') {
    return (
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>
          {state.title}
        </Text>
        <Text style={styles.body}>{state.body}</Text>
      </View>
    );
  }

  if (state.kind === 'offline') {
    return (
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>
          You are offline
        </Text>
        <Text style={styles.body}>
          Your draft is saved on this device. It will not be published until you are online.
        </Text>
        {onRetry ? <RetryAction onPress={onRetry} /> : null}
      </View>
    );
  }

  if (state.kind === 'restricted') {
    return (
      <View style={styles.panel}>
        <Text accessibilityRole="header" style={styles.title}>
          Not available
        </Text>
        <Text style={styles.body}>{state.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        Something went wrong
      </Text>
      <Text style={styles.body}>{state.message}</Text>
      {onRetry ? <RetryAction onPress={onRetry} /> : null}
    </View>
  );
}

/** Retry is recovery, not destruction, so it never uses danger styling. */
function RetryAction({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
      <Text style={styles.retryLabel}>Try again</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: tokens.primitive.space[3],
    paddingHorizontal: tokens.primitive.space[5],
    paddingVertical: tokens.primitive.space[8],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    textAlign: 'center',
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  retry: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: tokens.primitive.space[5],
    borderRadius: tokens.primitive.radius.button,
    borderWidth: 1,
    borderColor: tokens.semantic.color.actionPrimary,
  },
  retryPressed: { backgroundColor: tokens.semantic.color.backgroundSuccess },
  retryLabel: {
    color: tokens.semantic.color.actionPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
  },
});
