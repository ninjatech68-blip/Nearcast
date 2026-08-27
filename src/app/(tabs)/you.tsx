import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import {
  Avatar,
  DetailRow,
  DividerHairline,
  Group,
  ScreenHeader,
  Section,
  StatusBanner,
  SymbolIcon,
} from '@/features/native-demo/native-ui';

export default function YouScreen() {
  const [approxLocation, setApproxLocation] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader
        title="You"
        actionIcon="gearshape"
        actionFallback="⚙"
        actionLabel="Settings"
        onAction={() => undefined}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Group padded>
          <View style={styles.identityRow}>
            <Avatar initials="PS" size={72} />
            <View style={styles.identityCopy}>
              <Text style={styles.name}>Piyush</Text>
              <Text style={styles.handle}>Indiranagar area · Private alpha</Text>
              <View style={styles.trustPill}>
                <SymbolIcon color={tokens.semantic.color.trustText} fallback="🛡" name="checkmark.shield" size={14} />
                <Text style={styles.trustPillText}>Origin verified</Text>
              </View>
            </View>
          </View>
        </Group>

        <Section title="Privacy">
          <Group>
            <View style={styles.rowPadded}>
              <View style={styles.settingRow}>
                <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="📍" name="mappin.and.ellipse" size={20} />
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>Approximate location</Text>
                  <Text style={styles.settingBody}>Only your neighborhood area is shared with matches.</Text>
                </View>
                <Switch
                  accessibilityLabel="Toggle approximate location"
                  value={approxLocation}
                  onValueChange={setApproxLocation}
                  trackColor={{ true: tokens.semantic.color.actionPrimary, false: tokens.semantic.color.borderStrong }}
                />
              </View>
            </View>
            <DividerHairline inset={16} />
            <View style={styles.rowPadded}>
              <View style={styles.settingRow}>
                <SymbolIcon color={tokens.semantic.color.actionPrimary} fallback="🌙" name="moon" size={20} />
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>Quiet hours</Text>
                  <Text style={styles.settingBody}>Pause deliveries between 10 PM and 7 AM.</Text>
                </View>
                <Switch
                  accessibilityLabel="Toggle quiet hours"
                  value={quietHours}
                  onValueChange={setQuietHours}
                  trackColor={{ true: tokens.semantic.color.actionPrimary, false: tokens.semantic.color.borderStrong }}
                />
              </View>
            </View>
          </Group>
        </Section>

        <Section title="Network">
          <Group padded>
            <DetailRow
              icon="person.2"
              fallback="👥"
              label="Trusted circles"
              value="3 circles · 24 people"
              onPress={() => undefined}
            />
            <DetailRow
              icon="mappin.and.ellipse"
              fallback="📍"
              label="Approved neighborhoods"
              value="Indiranagar, Koramangala"
              onPress={() => undefined}
            />
            <DetailRow
              icon="hand.raised"
              fallback="✋"
              label="Blocked and muted"
              value="Nothing blocked"
              onPress={() => undefined}
            />
          </Group>
        </Section>

        <Section title="Account">
          <Group padded>
            <DetailRow icon="bell" fallback="🔔" label="Notifications" onPress={() => undefined} />
            <DetailRow icon="doc.text" fallback="📄" label="Privacy policy" onPress={() => undefined} />
            <DetailRow icon="questionmark.circle" fallback="?" label="Help and feedback" onPress={() => undefined} />
          </Group>
        </Section>

        <Section>
          <StatusBanner
            tone="info"
            title="Private by design"
            body="Origins, exact places, and contact details stay hidden until permission changes."
            icon="lock"
            fallback="🔒"
          />
        </Section>

        <Section>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => undefined}
            style={styles.signOut}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30 },
  identityRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  identityCopy: { flex: 1 },
  name: { fontFamily: 'Manrope_700Bold', fontSize: 24, lineHeight: 30, color: tokens.semantic.color.textPrimary },
  handle: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 13, color: tokens.semantic.color.textMuted },
  trustPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: tokens.semantic.color.trustSurface,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  trustPillText: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: tokens.semantic.color.trustText },
  rowPadded: { paddingHorizontal: 14 },
  settingRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingCopy: { flex: 1 },
  settingTitle: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: tokens.semantic.color.textPrimary },
  settingBody: { marginTop: 2, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 17, color: tokens.semantic.color.textMuted },
  signOut: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: tokens.semantic.color.backgroundSurface,
  },
  signOutText: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: tokens.semantic.color.dangerText },
});
