import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Field } from '@/design-system/components/field';
import { Poster } from '@/design-system/components/poster';
import { Row } from '@/design-system/components/row';
import { Stamp } from '@/design-system/components/stamp';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens, verbColor, verbForeground, verbLabel, type Verb } from '@/design-system/tokens';
import { reachLevels, type ReachValue } from '@/features/casts/fixtures';

type Step = 'write' | 'reach' | 'sent';

const verbs: readonly Verb[] = ['need', 'got', 'lets'];

export default function ComposeScreen() {
  const [step, setStep] = useState<Step>('write');
  const [verb, setVerb] = useState<Verb>('lets');
  const [text, setText] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [reach, setReach] = useState<ReachValue>('adjacent_network');
  const [casting, setCasting] = useState(false);

  const trimmed = text.trim();

  function close() {
    if (trimmed.length > 0 && step !== 'sent') {
      Alert.alert('keep draft?', 'only you see drafts.', [
        { text: 'keep draft', onPress: () => router.back() },
        { text: 'toss it', style: 'destructive', onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  }

  function pickVerb(next: Verb) {
    haptic('selection');
    setVerb(next);
  }

  function castIt() {
    setCasting(true);
    setTimeout(() => {
      setCasting(false);
      setStep('sent');
    }, 700);
  }

  if (step === 'sent') {
    return (
      <Poster
        cast={{
          id: 'mine',
          verb,
          text: trimmed,
          area: area ?? 'area later',
          vouches: reachLabel(reach),
          expiry: time ?? 'gone 10pm',
          why: '',
        }}
        reserveRail={false}
        badge={<Stamp label="OUT" color={verbForeground[verb]} />}
        topRight={
          <Pressable accessibilityRole="button" accessibilityLabel="close" hitSlop={12} onPress={() => router.back()}>
            <Text style={[styles.close, { color: verbForeground[verb] }]}>×</Text>
          </Pressable>
        }
      >
        <Text style={[styles.sentNote, { color: verbForeground[verb] }]}>
          you&apos;ll hear the second someone&apos;s in.
        </Text>
        <BarButton label="done" variant={verb === 'got' ? 'onCream' : 'onInk'} onPress={() => router.back()} />
      </Poster>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>CAST</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="close" hitSlop={12} onPress={close}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <View style={styles.progress}>
          <View style={[styles.progressBar, styles.progressOn]} />
          <View style={[styles.progressBar, step === 'reach' && styles.progressOn]} />
        </View>

        {step === 'write' ? (
          <>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.flex}>
              <View accessibilityRole="radiogroup" style={styles.verbs}>
                {verbs.map((option) => {
                  const selected = verb === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityLabel={verbLabel[option]}
                      accessibilityState={{ selected }}
                      onPress={() => pickVerb(option)}
                      style={[styles.verbChip, selected && { backgroundColor: verbColor[option], borderColor: verbColor[option] }]}
                    >
                      <Text style={[styles.verbText, selected && { color: verbForeground[option] }]}>{verbLabel[option]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field
                value={text}
                onChange={setText}
                placeholder="what's the plan?"
                accessibilityLabel="your cast"
                autoFocus
              />

              <View style={styles.detailBlock}>
                <Row
                  title="area"
                  sub={area ? `${area} · stays approximate` : 'add approximate area'}
                  right={<Text style={styles.edit}>{area ? 'edit' : 'add'}</Text>}
                  onPress={() => setArea('indiranagar')}
                />
                <Row
                  title="time"
                  sub={time ? `tonight, 8pm · ${time}` : 'add time'}
                  right={<Text style={styles.edit}>{time ? 'edit' : 'add'}</Text>}
                  onPress={() => setTime('gone 10pm')}
                />
              </View>

              {trimmed.length > 0 ? <Text style={styles.saved}>draft saved. only you see it.</Text> : null}
            </ScrollView>
            <BarButton label="next: who sees it" onPress={() => setStep('reach')} disabled={trimmed.length === 0} />
          </>
        ) : (
          <>
            <ScrollView style={styles.flex}>
              <Text accessibilityRole="header" style={styles.reachTitle}>
                who sees it?
              </Text>
              <View style={styles.reachList}>
                {reachLevels.map((level) => {
                  const selected = reach === level.value;
                  return (
                    <Pressable
                      key={level.value}
                      accessibilityRole="radio"
                      accessibilityLabel={level.title}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        haptic('selection');
                        setReach(level.value);
                      }}
                      style={styles.reachRow}
                    >
                      <View style={styles.flex}>
                        <Text style={styles.reachRowTitle}>{level.title}</Text>
                        <Text style={styles.reachRowSub}>{level.sub}</Text>
                      </View>
                      <View style={[styles.pick, selected && styles.pickOn]}>{selected ? <View style={styles.pickDot} /> : null}</View>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.reachNote}>wider reach never happens on its own.</Text>
            </ScrollView>
            <View style={styles.reachActions}>
              <BarButton label="cast it" variant="onOrange" onPress={castIt} loading={casting} />
              <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => setStep('write')} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function reachLabel(reach: ReachValue): string {
  const level = reachLevels.find((item) => item.value === reach);
  return level ? level.title : 'your circles';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  close: { fontFamily: fontFamily.text, fontSize: 26, lineHeight: 28, color: tokens.semantic.color.ink },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 22 },
  progressBar: { flex: 1, height: 3, borderRadius: 4, backgroundColor: tokens.semantic.color.hairlineOnCream },
  progressOn: { backgroundColor: tokens.semantic.color.accent },
  verbs: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  verbChip: {
    flex: 1,
    height: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verbText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  detailBlock: { marginTop: 20 },
  edit: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, textTransform: 'uppercase' },
  saved: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 16 },
  reachTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginBottom: 14,
  },
  reachList: {},
  reachRow: {
    minHeight: 66,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reachRowTitle: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.ink },
  reachRowSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3 },
  pick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.hairlineOnCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickOn: { borderColor: tokens.semantic.color.ink, backgroundColor: tokens.semantic.color.ink },
  pickDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.semantic.color.accent },
  reachNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
  reachActions: { gap: 2, paddingBottom: 4 },
  sentNote: { ...tokens.typography.metaSmall, marginBottom: 14, opacity: 0.7 },
});
