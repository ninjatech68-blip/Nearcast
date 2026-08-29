import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { SignalBars } from '@/design-system/components/bars';
import { QuietAction } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { casters, me as meFixture, recap } from '@/features/casts/fixtures';
import { setMyPhoto, setQuietHours, useMe, useMyPhoto, useQuietHours } from '@/features/me/me-store';
import { signOut } from '@/features/auth/auth';
import { circlesVouchingForMe, refreshCircles, refreshVouchers, useCircles, vouchersOfMe } from '@/features/trust/circles';
import { useMyPastPlans } from '@/features/attendance/store';
import { profilesEnabled, signalLit } from '@/features/me/remote-profile';

/**
 * Initials for the avatar, from whatever name the person actually gave.
 * Onboarding asks for a first name only, so "Piyush" -> "PI" and
 * "Piyush Sharma" -> "PS". Never hard-code: the placeholder used to read
 * "PS" for everyone, which showed one tester another tester's initials.
 */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function signalWord(lit: number): string {
  return lit >= 5 ? 'trusted' : lit >= 4 ? 'strong' : lit >= 3 ? 'steady' : lit >= 2 ? 'building' : 'new';
}

export default function YouScreen() {
  const me = useMe();
  const live = profilesEnabled();

  // real circles + vouchers in a live app; no-op offline.
  useEffect(() => {
    void refreshCircles();
    void refreshVouchers();
  }, []);
  const pastPlans = useMyPastPlans();
  const circles = useCircles();
  // real attendance drives the profile in a live app; the fixture count
  // is only for the no-backend demo build.
  const realReceipts = pastPlans.filter((p) => p.outcome === 'receipt').length;
  const receiptCount = live ? realReceipts : meFixture.receipts.count;
  const signalBars = live ? signalLit(realReceipts) : meFixture.signal.lit;
  const signalLabel = live ? signalWord(signalBars) : meFixture.signal.word;
  const circleMembers = circles.reduce((n, c) => n + c.memberIds.length, 0);
  const circlesSub = live
    ? `${circles.length} ${circles.length === 1 ? 'circle' : 'circles'} · ${circleMembers} ${circleMembers === 1 ? 'person' : 'people'}`
    : meFixture.circles;
  const receipts = useCountUp(receiptCount);
  const photoUri = useMyPhoto();
  const quiet = useQuietHours();
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      haptic('success');
      setMyPhoto(result.assets[0].uri);
    }
  }

  function changePhoto() {
    Alert.alert('profile photo', undefined, [
      { text: 'choose from library', onPress: pickPhoto },
      photoUri ? { text: 'remove photo', style: 'destructive' as const, onPress: () => setMyPhoto(null) } : null,
      { text: 'cancel', style: 'cancel' as const },
    ].filter(Boolean) as Parameters<typeof Alert.alert>[2]);
  }

  const source = photoUri ? { uri: photoUri } : facePhotos.me;
  const vouchCount = circlesVouchingForMe();
  const vouchers = vouchersOfMe()
    .map((id) => casters.find((c) => c.id === id)?.name ?? null)
    .filter(Boolean) as readonly string[];
  // in the live app we do not resolve voucher names client-side (they
  // are private circle members); the count carries the meaning.
  const vouchNames = live
    ? vouchCount > 0
      ? `${vouchCount} ${vouchCount === 1 ? 'person' : 'people'}`
      : 'nobody yet'
    : vouchers.length > 0
      ? vouchers.join(', ')
      : 'nobody yet';
  const line = `${me.homeArea} · ${vouchCount} ${vouchCount === 1 ? 'circle vouches' : 'circles vouch'} for you`;
  const areasLine = `${me.approvedAreas.join(', ')} · always approximate`;
  const blockedLine = me.blocked.length === 0 ? 'nobody' : `${me.blocked.length} ${me.blocked.length === 1 ? 'person' : 'people'}`;

  return (
    <SheetShell
      title={me.name}
      accessory={
        <Pressable accessibilityRole="button" accessibilityLabel="change your photo" onPress={changePhoto}>
          <Face photo={source} initials={initialsFor(me.name)} size={64} label="your photo" />
        </Pressable>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.line}>{line}</Text>
        <Text style={styles.vouchLine}>
          {vouchNames} put you in one of their circles. never told which.
        </Text>

        <View style={styles.signalBlock}>
          <SignalBars lit={signalBars} size="big" trackColor={tokens.semantic.color.ink} />
          <View style={styles.signalCopy}>
            <Text style={styles.signalWord}>signal: {signalLabel}</Text>
            <Text style={styles.signalVisibility}>signal + receipts are public · anyone on a cast can see this</Text>
          </View>
        </View>

        <View style={styles.rows}>
          <Row
            title="receipts"
            sub={live ? `${receipts} plans made real` : `${receipts} plans made real · last: badminton, tuesday`}
            right={<Tag label="→" tone="line" />}
            onPress={() => router.push('/receipts')}
          />
          <Row
            title="circles"
            sub={circlesSub}
            right={<Tag label="→" tone="line" />}
            onPress={() => router.push('/circles')}
          />
          <Row title="areas" sub={areasLine} right={<Tag label="→" tone="line" />} onPress={() => router.push('/areas')} />

          {/* quiet hours: an on-toggle + tappable start/end */}
          <View style={styles.quietBlock}>
            <View style={styles.quietHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>quiet hours</Text>
                <Text style={styles.rowSub}>{quiet.start} to {quiet.end}</Text>
              </View>
              <Switch
                accessibilityLabel="quiet hours"
                value={quiet.on}
                onValueChange={(on) => {
                  haptic('selection');
                  setQuietHours({ on });
                }}
                trackColor={{ true: tokens.semantic.color.accent, false: tokens.semantic.color.hairlineOnCream }}
              />
            </View>
            {quiet.on && Platform.OS === 'ios' ? (
              // iOS: Apple's own compact time field. It shows the value as a
              // tappable pill and opens its editor in a popover that dismisses
              // itself — there is no persistent picker to sit in "edit mode".
              <View style={styles.quietTimes}>
                <View style={styles.timeChip}>
                  <Text style={styles.timeLabel}>start</Text>
                  <DateTimePicker
                    accessibilityLabel="quiet hours start"
                    mode="time"
                    display="compact"
                    minuteInterval={5}
                    value={timeToDate(quiet.start)}
                    themeVariant="light"
                    accentColor={tokens.semantic.color.accent}
                    onChange={(_, date) => {
                      if (date) setQuietHours({ start: dateToTime(date) });
                    }}
                  />
                </View>
                <View style={styles.timeChip}>
                  <Text style={styles.timeLabel}>end</Text>
                  <DateTimePicker
                    accessibilityLabel="quiet hours end"
                    mode="time"
                    display="compact"
                    minuteInterval={5}
                    value={timeToDate(quiet.end)}
                    themeVariant="light"
                    accentColor={tokens.semantic.color.accent}
                    onChange={(_, date) => {
                      if (date) setQuietHours({ end: dateToTime(date) });
                    }}
                  />
                </View>
              </View>
            ) : null}
            {quiet.on && Platform.OS !== 'ios' ? (
              // Android: a compact field opens a dialog as soon as it mounts,
              // so keep tap-to-open — the value shows as a chip, tapping it
              // brings up the picker, which commits and closes on "done".
              <View style={styles.quietTimes}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="edit start time"
                  onPress={() => {
                    setTempTime(timeToDate(quiet.start));
                    setOpenPicker('start');
                  }}
                  style={styles.timeChip}
                >
                  <Text style={styles.timeLabel}>start</Text>
                  <Text style={styles.timeValue}>{quiet.start}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="edit end time"
                  onPress={() => {
                    setTempTime(timeToDate(quiet.end));
                    setOpenPicker('end');
                  }}
                  style={styles.timeChip}
                >
                  <Text style={styles.timeLabel}>end</Text>
                  <Text style={styles.timeValue}>{quiet.end}</Text>
                </Pressable>
              </View>
            ) : null}
            {Platform.OS !== 'ios' && openPicker ? (
              <View style={styles.pickerBlock}>
                <View style={styles.pickerHead}>
                  <Text style={styles.pickerTitle}>quiet hours · {openPicker}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="done"
                    hitSlop={10}
                    onPress={() => {
                      const commit = tempTime ?? timeToDate(openPicker === 'start' ? quiet.start : quiet.end);
                      setQuietHours(
                        openPicker === 'start' ? { start: dateToTime(commit) } : { end: dateToTime(commit) },
                      );
                      setOpenPicker(null);
                      setTempTime(null);
                    }}
                  >
                    <Text style={styles.pickerDone}>done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  mode="time"
                  display="spinner"
                  minuteInterval={5}
                  value={tempTime ?? timeToDate(openPicker === 'start' ? quiet.start : quiet.end)}
                  themeVariant="light"
                  accentColor={tokens.semantic.color.accent}
                  onChange={(_, date) => {
                    if (date) setTempTime(date);
                  }}
                />
              </View>
            ) : null}
          </View>

          <Row title="blocked" sub={blockedLine} right={<Tag label="→" tone="line" />} onPress={() => router.push('/blocked')} />
          <Row
            title={`${recap.month} recap`}
            sub={recap.headline}
            right={<Tag label="→" tone="line" />}
            onPress={() => router.push('/recap')}
          />
          <Row title="terms + privacy" sub="what stays private · how blocks work" right={<Tag label="→" tone="line" />} onPress={() => router.push('/legal/privacy')} />
          <Row title="community guidelines" sub="what gets you removed" right={<Tag label="→" tone="line" />} onPress={() => router.push('/legal/guidelines')} />
        </View>

        <SheetNote>{meFixture.privacy}</SheetNote>
        <View style={styles.signOut}>
          <QuietAction
            label="delete account"
            color={tokens.semantic.color.textMutedOnCream}
            onPress={() => router.push('/delete-account')}
          />
          <QuietAction
            label="sign out"
            color={tokens.semantic.color.ink}
            onPress={() =>
              Alert.alert('sign out?', 'you can sign back in with the same email.', [
                { text: 'never mind' },
                {
                  text: 'sign out',
                  style: 'destructive',
                  onPress: () => {
                    void signOut().finally(() => router.replace('/signin'));
                  },
                },
              ])
            }
          />
        </View>
      </ScrollView>
    </SheetShell>
  );
}

function timeToDate(label: string): Date {
  const match = label.match(/(\d+):(\d+)\s*(am|pm)/i);
  const now = new Date();
  now.setSeconds(0, 0);
  if (!match) return now;
  let hours = Number.parseInt(match[1], 10) % 12;
  const minutes = Number.parseInt(match[2], 10);
  if (match[3].toLowerCase() === 'pm') hours += 12;
  now.setHours(hours, minutes);
  return now;
}

function dateToTime(date: Date): string {
  const minutes = date.getMinutes();
  let hours = date.getHours();
  const suffix = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
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
  line: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  vouchLine: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 6 },
  signalBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 26 },
  signalCopy: { flex: 1 },
  signalWord: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.45, color: tokens.semantic.color.ink },
  signalVisibility: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  rows: { marginTop: 24 },
  rowTitle: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  rowSub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 3 },
  quietBlock: {
    minHeight: 64,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
  },
  quietHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  quietTimes: { flexDirection: 'row', gap: 10, marginTop: 12 },
  timeChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  timeLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  timeValue: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.ink },
  pickerBlock: {
    marginTop: 8,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  pickerTitle: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  pickerDone: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.accent },
  signOut: { marginTop: 20, alignItems: 'center' },
});
