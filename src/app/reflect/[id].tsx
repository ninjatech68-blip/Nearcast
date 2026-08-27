import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { reportPresence, usePlan } from '@/features/attendance/store';
import { people } from '@/features/trust/circles';
import type { PresenceReport } from '@/features/casts/domain/attendance';

/**
 * how did it go? the reflection sheet.
 *
 * for each other participant, the viewer picks one of three:
 *   - showed          → 'showed'
 *   - didn't show     → 'no-show'
 *   - not sure        → no report submitted (silence never creates a fact)
 *
 * the domain (@/features/casts/domain/attendance) decides the outcome
 * from unanimous reports across all reporters. this sheet never
 * displays anyone else's report about anyone — you see only your own
 * pending choices. reporters stay opaque to the person being reported.
 */

type Choice = PresenceReport | 'not-sure';

export default function ReflectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id ?? '');
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  if (!plan) {
    return (
      <SheetShell title="plan not found.">
        <Text style={styles.goneSub}>it may have been archived.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  const others = plan.participants.filter((p) => p.userId !== 'me');
  const pending = others.filter(
    (other) => !other.reportedBy.some((entry) => entry.reporterId === 'me'),
  );

  function set(userId: string, choice: Choice) {
    haptic('selection');
    setChoices((now) => ({ ...now, [userId]: choice }));
  }

  function submit() {
    for (const [userId, choice] of Object.entries(choices)) {
      if (choice === 'showed' || choice === 'no-show') {
        reportPresence(plan!.id, userId, choice);
      }
    }
    router.back();
  }

  const anyChosen = Object.keys(choices).length > 0;

  return (
    <SheetShell title="how did it go?">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.meta}>
          {plan.title} · {plan.area}
        </Text>

        {pending.length === 0 ? (
          <Text style={styles.done}>you already reported everyone here. thanks.</Text>
        ) : (
          <View style={styles.list}>
            {pending.map((participant) => {
              const person = people[participant.userId];
              const name = person?.name ?? participant.userId;
              const choice = choices[participant.userId];
              return (
                <View key={participant.userId} style={styles.row}>
                  <View style={styles.rowHead}>
                    <Face
                      photo={facePhotos[participant.userId]}
                      initials={name.slice(0, 2).toUpperCase()}
                      size={44}
                      label={`photo of ${name}`}
                    />
                    <Text style={styles.name}>{name}</Text>
                  </View>
                  <View style={styles.chips}>
                    <ChoiceChip label="showed" on={choice === 'showed'} onPress={() => set(participant.userId, 'showed')} tone="pos" />
                    <ChoiceChip label="didn’t show" on={choice === 'no-show'} onPress={() => set(participant.userId, 'no-show')} tone="neg" />
                    <ChoiceChip label="not sure" on={choice === 'not-sure'} onPress={() => set(participant.userId, 'not-sure')} tone="mute" />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <SheetNote>
          silence never creates a fact. a flake needs everyone-else to say the same thing, and only after the 24h window closes.
          nobody ever sees who reported them.
        </SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton
          label={pending.length === 0 ? 'done' : 'submit'}
          variant="onOrange"
          onPress={pending.length === 0 ? () => router.back() : submit}
          disabled={pending.length > 0 && !anyChosen}
        />
        <QuietAction label="close" color={tokens.semantic.color.ink} onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

function ChoiceChip({
  label,
  on,
  onPress,
  tone,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  tone: 'pos' | 'neg' | 'mute';
}) {
  const fields: Record<'pos' | 'neg' | 'mute', string> = {
    pos: tokens.semantic.color.verbGot,
    neg: tokens.semantic.color.accent,
    mute: tokens.semantic.color.ink,
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[
        styles.chip,
        on && { backgroundColor: fields[tone], borderColor: fields[tone] },
      ]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  meta: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  done: { ...tokens.typography.meta, color: tokens.semantic.color.ink, marginTop: 20 },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  list: { marginTop: 22 },
  row: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  chipText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  chipTextOn: { color: tokens.semantic.color.cream },
  actions: { marginTop: 18, gap: 2 },
});
