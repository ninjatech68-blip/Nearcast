import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton } from '@/design-system/components/button';
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
import { me, reachLevels, type ReachValue } from '@/features/casts/fixtures';
import { addCast, clearDraft, setDraftArea, useDraftArea } from '@/features/casts/store';

type Step = 'write' | 'sent';

const CAST_WINDOW_HOURS = 2;

export default function ComposeScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('write');
  const [pick, setPick] = useState<Category | null>(null);
  const [text, setText] = useState('');
  const [when, setWhen] = useState<Date | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);
  const [reachOpen, setReachOpen] = useState(false);
  const [reach, setReach] = useState<ReachValue>('adjacent_network');
  const [casting, setCasting] = useState(false);

  const area = useDraftArea();
  // pre-fill the area with the viewer's home area on mount, so the row is
  // never empty for a plan that stays close. draft is still authoritative
  // if they set one, and clearDraft runs on unmount.
  useEffect(() => {
    if (!area) setDraftArea(me.area);
    return clearDraft;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = text.trim();
  const chosen = pick ?? 'social';
  const spec = categoryTokens[chosen];
  const goneLabel = when ? formatGone(when) : 'gone 10pm';
  const whenLabel = when ? formatWhen(when) : null;
  const ready = trimmed.length > 0 && pick !== null;

  function close() {
    // drafts save silently — no confirm on close. the drafts list is
    // where you toss them, not here.
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
                <Text style={styles.expandNote}>it disappears {CAST_WINDOW_HOURS}h after start. no countdowns.</Text>
              </View>
            ) : null}

            {/* reach used to be its own step. it isn't — the default holds
                for most casts, and the row makes the choice honest
                without dragging you through a second screen. */}
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
                <Text style={styles.reachNote}>wider reach never happens on its own.</Text>
              </View>
            ) : null}
          </View>

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
        <BarButton label="cast it" variant="onOrange" onPress={castIt} loading={casting} disabled={!ready} />
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
  label: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginBottom: 10, marginTop: 8 },
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
  detailBlock: { marginTop: 20 },
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
  sentNote: { ...tokens.typography.metaSmall, marginBottom: 14, opacity: 0.7 },
});
