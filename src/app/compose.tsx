import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Field } from '@/design-system/components/field';
import { Poster } from '@/design-system/components/poster';
import { Stamp } from '@/design-system/components/stamp';
import { haptic } from '@/design-system/haptics';
import {
  CATEGORIES,
  category as categoryTokens,
  fontFamily,
  tokens,
  type Category,
} from '@/design-system/tokens';
import { reachLevels, type ReachValue } from '@/features/casts/fixtures';
import { addCast, clearDraft, setDraftArea, useDraftArea } from '@/features/casts/store';
import { useMe } from '@/features/me/me-store';

type Step = 'write' | 'details' | 'sent';

const CAST_WINDOW_HOURS = 2;

/**
 * two-step compose: WRITE (what) then DETAILS (where + when + who).
 * a single screen was tried and rejected — the keyboard hides the
 * detail rows and the screen reads as too many decisions at once.
 * step 1 stays keyboard-friendly; step 2 has no field and can show
 * every row above the fold.
 */
export default function ComposeScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('write');
  const [pick, setPick] = useState<Category | null>(null);
  const [text, setText] = useState('');
  const [when, setWhen] = useState<Date | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [reachOpen, setReachOpen] = useState(false);
  const [reach, setReach] = useState<ReachValue>('adjacent_network');
  const [exactSpot, setExactSpot] = useState('');
  const [spotOpen, setSpotOpen] = useState(false);
  const [casting, setCasting] = useState(false);

  const area = useDraftArea();
  const me = useMe();
  // pre-fill area with the viewer's home area on mount so the row is
  // never empty; the /area picker still overrides it.
  useEffect(() => {
    if (!area) setDraftArea(me.homeArea);
    return clearDraft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = text.trim();
  const chosen = pick ?? 'social';
  const spec = categoryTokens[chosen];
  const goneLabel = when ? formatGone(when) : 'gone 10pm';
  const whenLabel = when ? formatWhen(when) : null;
  const ready = trimmed.length > 0 && pick !== null;

  function close() {
    // drafts save silently — no confirm on close.
    router.back();
  }

  function pickCategory(next: Category) {
    haptic('selection');
    setPick(next);
  }

  function castIt() {
    setCasting(true);
    setTimeout(() => {
      addCast({
        category: chosen,
        text: trimmed,
        area: area.trim() || 'nearby',
        gone: goneLabel,
        reach: reachTitle(reach),
        exactSpot: exactSpot.trim() || undefined,
      });
      setCasting(false);
      setStep('sent');
    }, 700);
  }

  if (step === 'sent') {
    return (
      <Poster
        cast={{
          id: 'mine',
          category: chosen,
          text: trimmed,
          area: area.trim() || 'nearby',
          vouches: reachTitle(reach),
          expiry: goneLabel,
          why: '',
        }}
        reserveRail={false}
        badge={<Stamp label="OUT" color={spec.fg} />}
        topRight={
          <Pressable accessibilityRole="button" accessibilityLabel="close" hitSlop={12} onPress={() => router.back()} style={styles.closeTarget}>
            <Text style={[styles.close, { color: spec.fg }]}>×</Text>
          </Pressable>
        }
      >
        <Text style={[styles.sentNote, { color: spec.fg }]}>you&apos;ll hear the second someone&apos;s in.</Text>
        <BarButton
          label="done"
          variant={spec.fg === tokens.semantic.color.cream ? 'onCream' : 'onInk'}
          onPress={() => router.back()}
        />
      </Poster>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>CAST</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={12} onPress={close} style={styles.closeTarget}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <View style={styles.progress}>
          <View style={[styles.progressBar, styles.progressOn]} />
          <View style={[styles.progressBar, step === 'details' && styles.progressOn]} />
        </View>

        {step === 'write' ? (
          <>
            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.flex}>
              <Text style={styles.label}>WHAT KIND OF PLAN?</Text>
              <View accessibilityRole="radiogroup" style={styles.chips}>
                {CATEGORIES.map((id) => {
                  const selected = pick === id;
                  const item = categoryTokens[id];
                  const selectionBorder =
                    item.field === tokens.semantic.color.cream ? tokens.semantic.color.ink : item.field;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                      onPress={() => pickCategory(id)}
                      style={[
                        styles.chip,
                        selected && { backgroundColor: item.field, borderColor: selectionBorder, borderWidth: 1.5 },
                      ]}
                    >
                      <Text style={[styles.chipText, selected && { color: item.fg }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field value={text} onChange={setText} placeholder="what's the plan?" accessibilityLabel="your cast" />

              {pick ? (
                <View accessibilityRole="text" style={styles.preview}>
                  <View style={[styles.swatch, { backgroundColor: spec.field, borderColor: tokens.semantic.color.hairlineOnCream }]} />
                  <Text style={styles.previewText}>
                    your poster reads as <Text style={styles.previewName}>{spec.label}</Text>.
                  </Text>
                </View>
              ) : null}
              {trimmed.length > 0 ? <Text style={styles.saved}>draft saved. only you see it.</Text> : null}
            </ScrollView>
            <BarButton label="next: add details" onPress={() => setStep('details')} disabled={!ready} />
          </>
        ) : (
          <>
            <ScrollView style={styles.flex}>
              <Text accessibilityRole="header" style={styles.detailsTitle}>
                where, when, who?
              </Text>

              <View style={styles.detailBlock}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="area"
                  onPress={() => router.push('/area')}
                  style={styles.detailRow}
                >
                  <View style={styles.flex}>
                    <Text style={styles.detailTitle}>area</Text>
                    <Text style={styles.detailSub}>{area ? `${area} · stays approximate` : 'add approximate area'}</Text>
                  </View>
                  <Text style={styles.detailAction}>CHANGE</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="time"
                  onPress={() => setWhenOpen((open) => !open)}
                  style={styles.detailRow}
                >
                  <View style={styles.flex}>
                    <Text style={styles.detailTitle}>time</Text>
                    <Text style={styles.detailSub}>{whenLabel ? `${whenLabel} · ${goneLabel}` : 'add date + time'}</Text>
                  </View>
                  <Text style={styles.detailAction}>{whenLabel ? 'EDIT' : 'ADD'}</Text>
                </Pressable>
                {whenOpen ? (
                  <View style={styles.expand}>
                    <DateTimePicker
                      value={when ?? defaultWhen()}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      minimumDate={new Date()}
                      minuteInterval={5}
                      themeVariant="light"
                      accentColor={tokens.semantic.color.accent}
                      onChange={(_, date) => {
                        if (date) setWhen(date);
                      }}
                    />
                    <Text style={styles.expandNote}>
                      pick when the plan starts. the cast stays up until then, then hangs on {CAST_WINDOW_HOURS}h more before it disappears — no countdowns.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="done picking time"
                      onPress={() => {
                        // if the user opened the picker and never scrolled, land on the default
                        if (!when) setWhen(defaultWhen());
                        setWhenOpen(false);
                      }}
                      style={styles.doneBtn}
                    >
                      <Text style={styles.doneText}>done</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="who sees it"
                  onPress={() => setReachOpen((open) => !open)}
                  style={styles.detailRow}
                >
                  <View style={styles.flex}>
                    <Text style={styles.detailTitle}>who sees it</Text>
                    <Text style={styles.detailSub}>{reachTitle(reach)} · {reachSub(reach)}</Text>
                  </View>
                  <Text style={styles.detailAction}>{reachOpen ? 'DONE' : 'CHANGE'}</Text>
                </Pressable>
                {reachOpen ? (
                  <View accessibilityRole="radiogroup" style={styles.reachInline}>
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
                    <Text style={styles.reachNote}>
                      wider reach is a real choice, not the default. meeting people beyond your circle for the same plan is what this app is for.
                    </Text>
                  </View>
                ) : null}

                {/* exact meeting spot: shared with joiners ONLY after you
                    accept them. the poster displays the area only. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="exact meeting spot"
                  onPress={() => setSpotOpen((open) => !open)}
                  style={styles.detailRow}
                >
                  <View style={styles.flex}>
                    <Text style={styles.detailTitle}>exact meeting spot</Text>
                    <Text style={styles.detailSub}>
                      {exactSpot.trim().length > 0
                        ? `${exactSpot.trim()} · shared once you accept them`
                        : 'optional · only shared with joiners after you accept'}
                    </Text>
                  </View>
                  <Text style={styles.detailAction}>{spotOpen ? 'DONE' : exactSpot ? 'EDIT' : 'ADD'}</Text>
                </Pressable>
                {spotOpen ? (
                  <View style={styles.expand}>
                    <TextInput
                      accessibilityLabel="exact meeting spot"
                      value={exactSpot}
                      onChangeText={setExactSpot}
                      placeholder="e.g. KSLTA Court 3 · gate 2"
                      placeholderTextColor={tokens.semantic.color.hairlineOnCream}
                      selectionColor={tokens.semantic.color.accent}
                      style={styles.spotInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.expandNote}>
                      the poster shows just the area. the exact spot is revealed to a joiner in chat, and only after you accept.
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
            <View style={styles.detailsActions}>
              <BarButton label="cast it" variant="onOrange" onPress={castIt} loading={casting} />
              <QuietAction label="back" color={tokens.semantic.color.ink} onPress={() => setStep('write')} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function reachTitle(reach: ReachValue): string {
  const level = reachLevels.find((item) => item.value === reach);
  return level ? level.title : 'your circles';
}

function reachSub(reach: ReachValue): string {
  const level = reachLevels.find((item) => item.value === reach);
  return level ? level.sub : 'one trusted link away';
}

function defaultWhen(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function formatClock(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return minutes === 0 ? `${hours}${suffix}` : `${hours}:${String(minutes).padStart(2, '0')}${suffix}`;
}

function dayWord(date: Date): string | null {
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(date) - startOf(now)) / 86400000);
  if (diffDays === 0) return null;
  if (diffDays === 1) return 'tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
}

function formatWhen(date: Date): string {
  const day = dayWord(date);
  return day ? `${day}, ${formatClock(date)}` : `today, ${formatClock(date)}`;
}

function formatGone(when: Date): string {
  const gone = new Date(when.getTime() + CAST_WINDOW_HOURS * 3600000);
  const day = dayWord(gone);
  return day ? `gone ${day} ${formatClock(gone)}` : `gone ${formatClock(gone)}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  closeTarget: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  close: { fontFamily: fontFamily.text, fontSize: 28, lineHeight: 30, color: tokens.semantic.color.ink },
  progress: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  progressBar: { flex: 1, height: 3, borderRadius: 4, backgroundColor: tokens.semantic.color.hairlineOnCream },
  progressOn: { backgroundColor: tokens.semantic.color.accent },
  label: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  chipText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  detailsTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginBottom: 8,
  },
  detailBlock: { marginTop: 12 },
  detailRow: {
    minHeight: 64,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailTitle: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  detailSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3 },
  detailAction: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  expand: { paddingBottom: 18, gap: 12 },
  doneBtn: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: 20,
    borderRadius: tokens.primitive.radius.pill,
    backgroundColor: tokens.semantic.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.cream },
  spotInput: {
    minHeight: 48,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 16,
    color: tokens.semantic.color.ink,
  },
  expandNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  swatch: { width: 18, height: 18, borderRadius: 4, borderWidth: 1 },
  previewText: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, flex: 1 },
  previewName: { color: tokens.semantic.color.ink, fontFamily: fontFamily.monoSemi },
  saved: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 14 },
  reachInline: { paddingBottom: 12 },
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
  reachNote: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  detailsActions: { gap: 2, paddingBottom: 4 },
  sentNote: { ...tokens.typography.metaSmall, marginBottom: 14, opacity: 0.7 },
});
