import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { GlassIconButton } from '@/design-system/components/glass-icon-button';
import { PlanRow } from '@/design-system/components/plan-row';
import { PrimaryPlanCTA } from '@/design-system/components/primary-plan-cta';
import { PrivacyStrip } from '@/design-system/components/privacy-strip';
import { ReachDial } from '@/design-system/components/reach-dial';
import { ReasonLine } from '@/design-system/components/reason-line';
import { SheetHeader } from '@/design-system/components/sheet-header';
import { OfflineBanner, StatePanel } from '@/design-system/components/state-panel';
import { ThemeProvider, useTheme } from '@/design-system/theme';
import type { ReachLevel } from '@/features/plans/domain/enums';
import { planCta } from '@/features/plans/domain/planCta';

// Design-system gallery, available in development builds or when
// EXPO_PUBLIC_DESIGN_GALLERY=1 is set at build time (never in store builds). Sample values below are
// labelled as samples and never reach a production build.
const now = new Date();
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const sample = {
  id: 'sample',
  emoji: '🏸',
  title: 'Badminton (sample)',
  categoryGroup: 'Sport',
  areaName: 'Sector 8',
  startsAt: inHours(8),
  endsAt: inHours(10),
  distanceMeters: 2600,
  goingCount: 2,
  goingPreview: [{ firstName: 'Sample' }, { firstName: 'Person' }],
  reason: 'Near you · Badminton',
};
const ctaBase = {
  isHost: false, planType: 'plan' as const, planStatus: 'live' as const, myStatus: 'none' as const,
  capacity: 4, goingCount: 2, eligibility: { ok: true } as const, viewerRestricted: false, offline: false,
  hostFirstName: 'Sample',
};

function Gallery({ onToggle }: { onToggle: () => void }) {
  const { colors, scheme, tokens } = useTheme();
  const [reach, setReach] = useState<ReachLevel>('nearby');
  const section = (title: string) => (
    <Text style={[tokens.type.micro, styles.section, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
  );
  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: colors.backgroundApp }}>
      <Text style={[tokens.type.displayLarge, { color: colors.textPrimary }]}>truegoing</Text>
      <Pressable accessibilityRole="button" onPress={onToggle}>
        <Text style={[tokens.type.bodyStrong, { color: colors.actionPrimary }]}>{`Theme: ${scheme} (tap to switch)`}</Text>
      </Pressable>
      {section('Plan row')}
      <View style={[styles.card, { backgroundColor: colors.backgroundSurface }]}>
        <PlanRow now={now} onNotForMe={() => {}} onPress={() => {}} plan={sample} timeZone="Asia/Kolkata" unit="km" />
      </View>
      {section('Reason and privacy')}
      <ReasonLine onNotForMe={() => {}} reason="Near you · Badminton" variant="box" />
      <PrivacyStrip state={{ kind: 'locked' }} />
      {section('Primary action states')}
      <PrimaryPlanCTA cta={planCta(ctaBase)} onPrimary={() => {}} />
      <PrimaryPlanCTA cta={planCta({ ...ctaBase, myStatus: 'going' })} onPrimary={() => {}} onSecondary={() => {}} />
      <PrimaryPlanCTA cta={planCta({ ...ctaBase, eligibility: { ok: false, code: 'women_only_required' } })} onPrimary={() => {}} />
      <PrimaryPlanCTA cta={planCta({ ...ctaBase, planStatus: 'ended' })} onPrimary={() => {}} />
      {section('Who sees it')}
      <ReachDial city="Chandigarh" estimates={{ friends: 'few', friends_of_friends: 40, nearby: 210, city: null }} onChange={setReach} value={reach} />
      {section('Sheet header and map button')}
      <View style={[styles.card, { backgroundColor: colors.backgroundSurface }]}>
        <SheetHeader confirmDisabledReason="Choose a reason first" onClose={() => {}} onConfirm={() => {}} title="Report plan" />
      </View>
      <View style={styles.rowGap}>
        <GlassIconButton icon="search" label="Search" onPress={() => {}} />
        <GlassIconButton icon="recenter" label="Show my area" onPress={() => {}} />
      </View>
      {section('States')}
      <OfflineBanner lastUpdated="10:42 am" />
      <StatePanel state={{ kind: 'empty', title: 'Nothing near you yet', body: 'Post the first plan in Sector 8.', actionLabel: 'Post the first plan', onAction: () => {} }} />
      <StatePanel state={{ kind: 'loading', rows: 2 }} />
      <StatePanel state={{ kind: 'notAvailable' }} />
      <Button disabled label="Next" onPress={() => {}} reason="Add a few words about the plan" />
    </ScrollView>
  );
}

export default function DesignSystemScreen() {
  const [dark, setDark] = useState(false);
  if (!__DEV__ && process.env.EXPO_PUBLIC_DESIGN_GALLERY !== '1') return <Redirect href="/" />;
  return (
    <ThemeProvider appearance={dark ? 'dark' : 'light'}>
      <Gallery onToggle={() => setDark((value) => !value)} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  section: { marginTop: 16, letterSpacing: 1 },
  card: { borderRadius: 20, paddingHorizontal: 16 },
  rowGap: { flexDirection: 'row', gap: 12 },
});
