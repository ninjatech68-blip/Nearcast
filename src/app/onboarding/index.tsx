import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { CATEGORIES, category as categoryTokens, fontFamily, tokens, type Category } from '@/design-system/tokens';
import {
  addApprovedArea,
  removeApprovedArea,
  setHomeArea,
  setInterests,
  setName,
  setOnboardingDone,
  setPushGranted,
  useMe,
} from '@/features/me/me-store';

type Step = 'name' | 'home' | 'areas' | 'interests' | 'push';

/**
 * onboarding: four steps + push permission. this is what turns the
 * fixture viewer into real state. every field written here is what
 * delivery reads (interests + areas), what the you sheet renders
 * (name + home), and what push is allowed to enqueue (pushGranted).
 *
 * skip is offered where the field has a safe default; name has none.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [step, setStep] = useState<Step>('name');
  const [name, setLocalName] = useState(me.name);
  const [home, setLocalHome] = useState(me.homeArea);
  const [areaDraft, setAreaDraft] = useState('');
  const [interests, setLocalInterests] = useState<readonly Category[]>(me.interests);

  const step1Ready = name.trim().length > 0;
  const step2Ready = home.trim().length > 0;

  function next() {
    haptic('selection');
    if (step === 'name') {
      setName(name.trim());
      setStep('home');
      return;
    }
    if (step === 'home') {
      const trimmed = home.trim().toLowerCase();
      setHomeArea(trimmed);
      if (!me.approvedAreas.includes(trimmed)) addApprovedArea(trimmed);
      setStep('areas');
      return;
    }
    if (step === 'areas') {
      setStep('interests');
      return;
    }
    if (step === 'interests') {
      setInterests(interests);
      setStep('push');
      return;
    }
    // last step: mark onboarding done and land in the app
    setOnboardingDone();
    router.replace('/');
  }

  async function askPush() {
    // stub: the real call is
    //   const { status } = await Notifications.requestPermissionsAsync();
    // we can't add the module here (network install blocked in this
    // env); the store field is set so the shape is real and the flow
    // is complete.
    setPushGranted(true);
    setOnboardingDone();
    router.replace('/');
  }

  function skipPush() {
    setPushGranted(false);
    setOnboardingDone();
    router.replace('/');
  }

  function toggle(id: Category) {
    haptic('selection');
    setLocalInterests((now) => (now.includes(id) ? now.filter((v) => v !== id) : [...now, id]));
  }

  function addArea() {
    const trimmed = areaDraft.trim().toLowerCase();
    if (!trimmed || me.approvedAreas.includes(trimmed)) return;
    haptic('success');
    addApprovedArea(trimmed);
    setAreaDraft('');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>NEARCAST · {stepLabel(step)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="need help"
            hitSlop={12}
            onPress={() => Alert.alert('need help?', 'signing back in with the same email brings you right back here.', [{ text: 'ok' }])}
            style={styles.helpTap}
          >
            <Text style={styles.help}>?</Text>
          </Pressable>
        </View>

        <View style={styles.progress}>
          {(['name', 'home', 'areas', 'interests', 'push'] as const).map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressBar,
                (isBefore(s, step) || s === step) && styles.progressOn,
                i > 0 && { marginLeft: 6 },
              ]}
            />
          ))}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.flex} showsVerticalScrollIndicator={false}>
          {step === 'name' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>what should we call you?</Text>
              <Text style={styles.hint}>your first name is all anyone else on nearcast sees. no last names, no handles.</Text>
              <TextInput
                accessibilityLabel="your first name"
                value={name}
                onChangeText={setLocalName}
                placeholder="first name"
                placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                selectionColor={tokens.semantic.color.accent}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={step1Ready ? next : undefined}
              />
            </>
          ) : null}

          {step === 'home' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>where&apos;s home, roughly?</Text>
              <Text style={styles.hint}>the neighborhood, not the address. we keep it approximate — a cast never carries a coordinate.</Text>
              <TextInput
                accessibilityLabel="your home area"
                value={home}
                onChangeText={setLocalHome}
                placeholder="e.g. indiranagar"
                placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                selectionColor={tokens.semantic.color.accent}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={step2Ready ? next : undefined}
              />
            </>
          ) : null}

          {step === 'areas' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>where else are you around?</Text>
              <Text style={styles.hint}>add the neighborhoods you spend time in. casts near any of these can reach you.</Text>
              <View style={styles.tagsRow}>
                {me.approvedAreas.map((a) => (
                  <Pressable
                    key={a}
                    accessibilityRole="button"
                    accessibilityLabel={`remove ${a}`}
                    onPress={() => removeApprovedArea(a)}
                    style={styles.tag}
                  >
                    <Text style={styles.tagText}>{a} ×</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="add a neighborhood"
                value={areaDraft}
                onChangeText={setAreaDraft}
                placeholder="type + return to add"
                placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                selectionColor={tokens.semantic.color.accent}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={addArea}
              />
            </>
          ) : null}

          {step === 'interests' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>what are you actually into?</Text>
              <Text style={styles.hint}>pick a few. delivery uses this to decide when a stranger&apos;s cast is worth showing you.</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((id) => {
                  const item = categoryTokens[id];
                  const selected = interests.includes(id);
                  const border = item.field === tokens.semantic.color.cream ? tokens.semantic.color.ink : item.field;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.label}
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggle(id)}
                      style={[styles.chip, selected && { backgroundColor: item.field, borderColor: border, borderWidth: 1.5 }]}
                    >
                      <Text style={[styles.chipText, selected && { color: item.fg }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 'push' ? (
            <>
              <Text accessibilityRole="header" style={styles.title}>can we tap you when a plan lands?</Text>
              <Text style={styles.hint}>
                push notifications for accepted joins, new casts that match, and reflection prompts after a plan. never message
                text, never a coordinate — only the id. you can turn it off anytime.
              </Text>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          {step === 'push' ? (
            <>
              <BarButton label="turn on push" variant="onOrange" onPress={askPush} />
              <QuietAction label="not now" color={tokens.semantic.color.ink} onPress={skipPush} />
            </>
          ) : (
            <BarButton
              label={step === 'interests' ? 'looks good' : 'next'}
              variant="onOrange"
              onPress={next}
              disabled={step === 'name' ? !step1Ready : step === 'home' ? !step2Ready : false}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function stepLabel(step: Step): string {
  return { name: 'HELLO', home: 'HOME', areas: 'AREAS', interests: 'INTERESTS', push: 'PUSH' }[step];
}

function isBefore(a: Step, b: Step): boolean {
  const order: Step[] = ['name', 'home', 'areas', 'interests', 'push'];
  return order.indexOf(a) < order.indexOf(b);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  helpTap: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  help: { fontFamily: fontFamily.displaySemi, fontSize: 22, color: tokens.semantic.color.textMutedOnCream },
  progress: { flexDirection: 'row', marginTop: 6, marginBottom: 20 },
  progressBar: { flex: 1, height: 3, borderRadius: 4, backgroundColor: tokens.semantic.color.hairlineOnCream },
  progressOn: { backgroundColor: tokens.semantic.color.accent },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: tokens.semantic.color.ink,
    marginTop: 8,
  },
  hint: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.textMutedOnCream, marginTop: 12, marginBottom: 22 },
  input: {
    minHeight: 56,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 18,
    color: tokens.semantic.color.ink,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.ink,
    justifyContent: 'center',
  },
  tagText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.cream },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  chipText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  actions: { gap: 2, paddingBottom: 4 },
});
