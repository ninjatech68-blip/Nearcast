import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { dateToTime, timeToDate } from '@/features/me/quiet-time';
import { setQuietHours, useQuietHours } from '@/features/me/me-store';

/**
 * When the app may wake you, on its own screen.
 *
 * It used to be an inline block in the middle of the profile list: a
 * switch, two time fields and, on Android, a spinner that expanded and
 * pushed every row below it down. A settings row that changes the
 * height of the page under your thumb is a row people learn to avoid,
 * and it was the reason the profile could not simply be a list.
 *
 * Push is the surface this app lives or dies on, so the control for it
 * is worth a screen.
 */
export default function QuietHoursScreen() {
  const quiet = useQuietHours();
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);

  return (
    <SheetShell title="quiet hours">
      <Text style={styles.sub}>
        {quiet.on ? 'nothing pings you between these hours.' : 'a ping can arrive at any hour.'}
      </Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>quiet hours</Text>
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
        // iOS: Apple's own compact field. It shows the value as a
        // tappable pill and opens its editor in a popover that dismisses
        // itself, so there is no persistent picker sitting in edit mode.
        <View style={styles.times}>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>from</Text>
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
          <View style={[styles.timeRow, styles.timeRowLast]}>
            <Text style={styles.timeLabel}>to</Text>
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
        // Android: a compact field opens its dialog the moment it mounts,
        // so the value stays a chip and tapping it brings up the picker.
        <View style={styles.times}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="edit start time"
            onPress={() => {
              setTempTime(timeToDate(quiet.start));
              setOpenPicker('start');
            }}
            style={styles.timeRow}
          >
            <Text style={styles.timeLabel}>from</Text>
            <Text style={styles.timeValue}>{quiet.start}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="edit end time"
            onPress={() => {
              setTempTime(timeToDate(quiet.end));
              setOpenPicker('end');
            }}
            style={[styles.timeRow, styles.timeRowLast]}
          >
            <Text style={styles.timeLabel}>to</Text>
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
                setQuietHours(openPicker === 'start' ? { start: dateToTime(commit) } : { end: dateToTime(commit) });
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

      <SheetNote>a request that arrives while you are quiet still lands in alerts. it just does not make a sound.</SheetNote>

      <View style={styles.actions}>
        <BarButton label="done" variant="onCream" onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  sub: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    minHeight: 64,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
  },
  switchLabel: { fontFamily: fontFamily.displaySemi, fontSize: 17, letterSpacing: -0.2, color: tokens.semantic.color.ink },
  times: {
    marginTop: 16,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    paddingHorizontal: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: tokens.semantic.color.hairlineOnCream,
  },
  timeRowLast: { borderBottomWidth: 0 },
  timeLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  timeValue: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.ink },
  pickerBlock: {
    marginTop: 8,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.backgroundSubtle,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  pickerTitle: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  pickerDone: { fontFamily: fontFamily.displaySemi, fontSize: 16, color: tokens.semantic.color.accent },
  actions: { marginTop: 'auto', paddingTop: 18 },
});
