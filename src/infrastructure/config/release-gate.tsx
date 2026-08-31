import { StyleSheet, Text, View } from 'react-native';

import { fontFamily, tokens } from '@/design-system/tokens';
import { isReleaseBuild, releaseBlock } from '@/infrastructure/config/env';
import { backendMode, backendStatus } from '@/infrastructure/supabase/client';

/**
 * The last thing between a broken build and a tester.
 *
 * The app can run on local fixtures, which is how the test suites work and
 * how a screen can be built offline. In a release build on someone else's
 * phone that same mode shows invented casts, invented joiners and invented
 * activity, and the person holding the phone has no way to know. The first
 * product rule — never fabricate activity — has no exception for a missing
 * environment file, so such a build stops here and says why.
 *
 * A misconfiguration stops in every build, release or not, because nobody
 * ever means it. That is the case the old code got wrong: a typo in
 * `EXPO_PUBLIC_APP_ENV` was read as "no backend configured" and answered
 * with fixtures, with a perfectly good project URL sitting unused.
 *
 * The decision itself is pure and lives in `releaseBlock`; this renders it.
 */
export function ReleaseGate({ children }: { children: React.ReactNode }) {
  const block = releaseBlock({
    isRelease: isReleaseBuild(),
    mode: backendMode(),
    reason: backendStatus(),
  });

  if (block === null) return <>{children}</>;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.label}>BUILD STOPPED</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {block.title}
        </Text>
        <Text style={styles.detail}>{block.detail}</Text>
        <Text style={styles.footnote}>
          Nearcast will not show you anything rather than show you something
          that did not happen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.primitive.space[6],
    backgroundColor: tokens.semantic.color.cream,
  },
  card: { gap: tokens.primitive.space[4], maxWidth: 420 },
  label: {
    ...tokens.typography.tag,
    color: tokens.semantic.color.accent,
  },
  title: {
    ...tokens.typography.title,
    color: tokens.semantic.color.textOnCream,
  },
  detail: {
    ...tokens.typography.body,
    color: tokens.semantic.color.textOnCream,
  },
  footnote: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 19,
    color: tokens.semantic.color.textMutedOnCream,
  },
});
