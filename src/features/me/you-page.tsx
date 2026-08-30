import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { Face } from '@/design-system/components/face';
import { Page } from '@/design-system/components/page';
import { Row } from '@/design-system/components/row';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { casters, me as meFixture } from '@/features/casts/fixtures';
import { useRecap } from '@/features/casts/use-recap';
import { useMyPastPlans } from '@/features/attendance/store';
import { initialsFor } from '@/features/me/initials';
import { setMyPhoto, useMe, useMyPhoto, useQuietHours } from '@/features/me/me-store';
import { profilesEnabled, signalLit } from '@/features/me/remote-profile';
import { circlesVouchingForMe, refreshCircles, refreshVouchers, useCircles, vouchersOfMe } from '@/features/trust/circles';

function signalWord(lit: number): string {
  return lit >= 5 ? 'trusted' : lit >= 4 ? 'strong' : lit >= 3 ? 'steady' : lit >= 2 ? 'building' : 'new';
}

/**
 * You: who you are, and the three controls that decide how the app
 * reaches you.
 *
 * This screen used to carry fourteen rows, an inline time picker with
 * its own expand-and-commit state machine, and both destructive actions,
 * all on first open. Your own casts have moved to alerts, settings have
 * moved behind one door, and what is left is ordered by CONSEQUENCE
 * rather than by how often it is opened:
 *
 *   circles      — the only control over who a cast reaches. P1.
 *   quiet hours  — whether the phone may wake you.
 *   blocked      — who cannot reach you at all.
 *
 * Each is rarely touched and expensive to get wrong, which is exactly
 * why sorting by frequency would have buried them. Receipts and the
 * recap sit below: things you read about yourself, not things you set.
 */
export function YouPage() {
  const me = useMe();
  const live = profilesEnabled();
  const recap = useRecap();

  useEffect(() => {
    void refreshCircles();
    void refreshVouchers();
  }, []);

  const pastPlans = useMyPastPlans();
  const circles = useCircles();
  const quiet = useQuietHours();
  const photoUri = useMyPhoto();

  const realReceipts = pastPlans.filter((p) => p.outcome === 'receipt').length;
  const receiptCount = live ? realReceipts : meFixture.receipts.count;
  const signalBars = live ? signalLit(realReceipts) : meFixture.signal.lit;
  const signalLabel = live ? signalWord(signalBars) : meFixture.signal.word;
  const receipts = useCountUp(receiptCount);

  const circleMembers = circles.reduce((n, c) => n + c.memberIds.length, 0);
  const circlesSub = live
    ? `${circles.length} ${circles.length === 1 ? 'circle' : 'circles'} · ${circleMembers} ${circleMembers === 1 ? 'person' : 'people'}`
    : meFixture.circles;

  const vouchCount = circlesVouchingForMe();
  const vouchers = vouchersOfMe()
    .map((id) => casters.find((c) => c.id === id)?.name ?? null)
    .filter(Boolean) as readonly string[];
  // in the live app voucher names are never resolved client-side — they
  // are private circle members — so the count carries the meaning.
  const vouchNames = live
    ? vouchCount > 0
      ? `${vouchCount} ${vouchCount === 1 ? 'person' : 'people'}`
      : 'nobody yet'
    : vouchers.length > 0
      ? vouchers.join(', ')
      : 'nobody yet';

  const blockedLine =
    me.blocked.length === 0 ? 'nobody' : `${me.blocked.length} ${me.blocked.length === 1 ? 'person' : 'people'}`;
  const source = photoUri ? { uri: photoUri } : facePhotos.me;

  /**
   * A profile photo, from the camera or the library.
   *
   * The camera is the one the product wants: a face shown at a decision
   * moment means more when it was taken now than when it was chosen from
   * a roll. Both are offered because a person may not be anywhere they
   * want to be photographed, and a square crop is asked for either way
   * so the avatar is never a stretched rectangle.
   */
  async function pickPhoto(sourceKind: 'camera' | 'library') {
    const permission =
      sourceKind === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        sourceKind === 'camera' ? 'camera is off' : 'photos are off',
        sourceKind === 'camera'
          ? 'turn on camera access to take a profile photo.'
          : 'turn on photo access to pick a profile photo.',
        [{ text: 'ok' }],
      );
      return;
    }
    const options = { allowsEditing: true, aspect: [1, 1] as [number, number], quality: 0.9 };
    const result =
      sourceKind === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets[0]) {
      haptic('success');
      setMyPhoto(result.assets[0].uri);
    }
  }

  /**
   * Add, replace and remove all live on the photo itself.
   *
   * Editing a photo through a settings row three screens away asks you
   * to hold a model of where the thing lives; tapping the photo asks
   * nothing. The camera badge is what makes it findable — an affordance
   * nobody can see is not an affordance — and Face already renders a
   * badge in that position, so this is an existing component.
   */
  function changePhoto() {
    Alert.alert(
      'your photo',
      'only people on a cast with you ever see it.',
      [
        { text: 'take a photo', onPress: () => void pickPhoto('camera') },
        { text: 'choose from library', onPress: () => void pickPhoto('library') },
        photoUri ? { text: 'remove photo', style: 'destructive' as const, onPress: () => setMyPhoto(null) } : null,
        { text: 'never mind', style: 'cancel' as const },
      ].filter(Boolean) as Parameters<typeof Alert.alert>[2],
    );
  }

  return (
    <Page
      title="you"
      accessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photoUri ? 'change or remove your photo' : 'add a photo'}
          onPress={changePhoto}
        >
          <Face photo={source} initials={initialsFor(me.name)} size={64} label="your photo" badge="camera" />
        </Pressable>
      }
    >
      <Text style={styles.name}>{me.name}</Text>
      <Text style={styles.line}>
        {me.homeArea} · {vouchCount} {vouchCount === 1 ? 'circle vouches' : 'circles vouch'} for you
      </Text>
      <Text style={styles.line}>{vouchNames} put you in one of their circles. never told which.</Text>

      <View style={styles.signalBlock}>
        <SignalBars lit={signalBars} size="big" trackColor={tokens.semantic.color.ink} />
        <View style={styles.signalCopy}>
          <Text style={styles.signalWord}>signal: {signalLabel}</Text>
          <Text style={styles.signalVisibility}>signal + receipts are public · anyone on a cast can see this</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <Row title="circles" sub={circlesSub} right={<Tag label="→" tone="line" />} onPress={() => router.push('/circles')} />
        <Row
          title="quiet hours"
          sub={quiet.on ? `${quiet.start} to ${quiet.end}` : 'a ping can arrive at any hour'}
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/quiet-hours')}
        />
        <Row title="blocked" sub={blockedLine} right={<Tag label="→" tone="line" />} onPress={() => router.push('/blocked')} />
        <Row
          title="your receipts"
          sub={live ? `${receipts} plans made real` : `${receipts} plans made real · last: badminton, tuesday`}
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/receipts')}
        />
        <Row
          title={`${recap.month} recap`}
          sub={recap.headline}
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/recap')}
        />
      </View>

      <View style={styles.door}>
        <Row
          title="edit profile"
          sub="name, email, area, terms"
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/profile-edit')}
        />
      </View>
    </Page>
  );
}

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
  name: { ...tokens.typography.title, color: tokens.semantic.color.ink, marginTop: 14 },
  line: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 6 },
  signalBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 24 },
  signalCopy: { flex: 1 },
  signalWord: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.45,
    color: tokens.semantic.color.ink,
  },
  signalVisibility: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  rows: { marginTop: 22 },
  door: { marginTop: 20 },
});
