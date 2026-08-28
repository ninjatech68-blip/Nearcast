import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos, isVerified } from '@/features/casts/faces';
import { casters } from '@/features/casts/fixtures';
import { profilesEnabled, usePersonFirstName } from '@/features/me/remote-profile';
import { addToCircle, useCircles } from '@/features/trust/circles';

/**
 * vouch sheet: pick which of your circles to add a person to. one
 * screen instead of an Alert row-of-buttons, so cancel is visually
 * distinct from the circle choices. tap a circle to add and close.
 */
export default function VouchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fixtureCaster = casters.find((c) => c.id === id);
  const liveName = usePersonFirstName(id);
  // in a live app the person is a real user, not a fixture; resolve a
  // name and proceed rather than falling to "not around".
  const caster = fixtureCaster ?? (profilesEnabled() && id ? { id, name: liveName ?? 'this person' } : undefined);
  const circles = useCircles();
  const options = circles.filter((c) => !c.memberIds.includes(id ?? ''));
  const already = circles.filter((c) => c.memberIds.includes(id ?? ''));

  if (!caster) {
    return (
      <SheetShell title="not around.">
        <Text style={styles.goneSub}>this profile is no longer visible to you.</Text>
        <View style={styles.actions}>
          <BarButton label="back" variant="onCream" onPress={() => router.back()} />
        </View>
      </SheetShell>
    );
  }

  function pick(circleId: string) {
    if (!id) return;
    haptic('success');
    addToCircle(circleId, id);
    router.back();
  }

  return (
    <SheetShell
      title={`vouch for ${caster.name}`}
      accessory={
        <Face
          photo={facePhotos[caster.id]}
          initials={caster.name.slice(0, 2).toUpperCase()}
          size={64}
          label={`photo of ${caster.name}`}
          verified={isVerified(caster.id)}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
        <Text style={styles.hint}>
          putting them in one of your circles is your vouch. they never see which one — or that they were added at all.
        </Text>

        {already.length > 0 ? (
          <>
            <Text style={styles.section}>ALREADY IN</Text>
            {already.map((c) => (
              <Row key={c.id} title={c.name} sub={`${c.memberIds.length} ${c.memberIds.length === 1 ? 'person' : 'people'}`} right={<Tag label="in" tone="ok" />} />
            ))}
          </>
        ) : null}

        {options.length > 0 ? (
          <>
            <Text style={styles.section}>{already.length > 0 ? 'ADD TO ANOTHER' : 'PICK A CIRCLE'}</Text>
            {options.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`add ${caster.name} to ${c.name}`}
                onPress={() => pick(c.id)}
                style={styles.circleRow}
              >
                <View style={styles.flex}>
                  <Text style={styles.circleTitle}>{c.name}</Text>
                  <Text style={styles.circleSub}>
                    {c.memberIds.length} {c.memberIds.length === 1 ? 'person' : 'people'} · tap to add
                  </Text>
                </View>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Text style={styles.empty}>{caster.name} is already in all your circles.</Text>
        )}

        <SheetNote>{`you already have a shared receipt with ${caster.name}. vouching is your recorded fact that you know them.`}</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <QuietAction label="cancel" color={tokens.semantic.color.ink} onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 22, marginBottom: 6 },
  circleRow: {
    minHeight: 64,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleTitle: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  circleSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3 },
  plus: { fontFamily: fontFamily.display, fontSize: 26, color: tokens.semantic.color.accent, paddingHorizontal: 6 },
  empty: { ...tokens.typography.meta, color: tokens.semantic.color.ink, marginTop: 22 },
  goneSub: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  actions: { marginTop: 18, gap: 2 },
});
