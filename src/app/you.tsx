import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { Face } from '@/design-system/components/face';
import { QuietAction } from '@/design-system/components/button';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { me, recap } from '@/features/casts/fixtures';

/**
 * you: signal, five rows, one privacy sentence, out.
 * the identity flex is receipts and vouches, not a profile page.
 */
export default function YouScreen() {
  const [quiet, setQuiet] = useState(true);
  const receipts = useCountUp(me.receipts.count);

  return (
    <SheetShell
      title={me.name}
      accessory={<Face photo={facePhotos.me} initials="PS" size={64} label="your photo" />}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.line}>{me.line}</Text>

        <View style={styles.signalBlock}>
          <SignalBars lit={me.signal.lit} size="big" trackColor={tokens.semantic.color.ink} />
          <View style={styles.signalCopy}>
            <Text style={styles.signalWord}>signal: {me.signal.word}</Text>
            <Text style={styles.range}>{me.range}</Text>
          </View>
        </View>

        <View style={styles.rows}>
          <Row title="receipts" sub={`${receipts} plans made real · last: badminton, tuesday`} right={<Tag label="→" tone="line" />} />
          <Row title="circles" sub={me.circles} right={<Tag label="→" tone="line" />} />
          <Row title="areas" sub={me.areas} right={<Tag label="→" tone="line" />} />
          <Row
            title="quiet hours"
            sub={me.quietHours}
            right={
              <Switch
                accessibilityLabel="quiet hours"
                value={quiet}
                onValueChange={(next) => {
                  haptic('selection');
                  setQuiet(next);
                }}
                trackColor={{ true: tokens.semantic.color.accent, false: tokens.semantic.color.hairlineOnCream }}
              />
            }
          />
          <Row title="blocked" sub={me.blocked} right={<Tag label="→" tone="line" />} />
          <Row
            title={`${recap.month} recap`}
            sub={recap.headline}
            right={<Tag label="→" tone="line" />}
            onPress={() => router.push('/recap')}
          />
        </View>

        <SheetNote>{me.privacy}</SheetNote>
        <View style={styles.signOut}>
          <QuietAction label="sign out" color={tokens.semantic.color.ink} onPress={() => undefined} />
        </View>
      </ScrollView>
    </SheetShell>
  );
}

/** receipts count up over 600ms on first view. facts arrive, they don't blink in. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const subscription = progress.addListener(({ value: v }) => setValue(Math.round(v * target)));
    Animated.timing(progress, { toValue: 1, duration: 600, useNativeDriver: false }).start();
    return () => progress.removeListener(subscription);
  }, [progress, target]);

  return value;
}

const styles = StyleSheet.create({
  line: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  signalBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 26 },
  signalCopy: { flex: 1 },
  signalWord: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.45,
    color: tokens.semantic.color.ink,
  },
  range: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  rows: { marginTop: 24 },
  signOut: { marginTop: 20, alignItems: 'center' },
});
