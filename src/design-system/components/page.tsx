import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Refreshing } from '@/design-system/components/refreshing';
import { fontFamily, tokens } from '@/design-system/tokens';

/**
 * One of the cream destinations behind the dock: chats, alerts, you.
 *
 * It owns three things the pages kept re-deriving: the title, the
 * bottom reserve so a list never ends underneath the dock, and the
 * footer fade.
 *
 * THE FADE is why this exists rather than a plain ScrollView. The dock
 * has no surface of its own — the poster's colour runs unbroken beneath
 * it — which is right on a poster, where the reserve keeps that band
 * empty, and wrong on a list, where rows scroll under the marks and
 * collide with them. So the ground fades up into the marks instead:
 * six steps of the page's own cream, which is invisible against the
 * page and opaque enough at the bottom to keep a row off the labels.
 * No gradient dependency, and no second shade.
 */
export function Page({
  title,
  accessory,
  refreshing = false,
  onRefresh,
  refreshLabel,
  children,
}: {
  title: string;
  accessory?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshLabel?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.page, { width, paddingTop: insets.top + 20 }]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {accessory}
      </View>

      <View style={styles.body}>
        <View style={styles.refreshSlot} pointerEvents="none">
          <Refreshing visible={refreshing} label={refreshLabel} />
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: tokens.component.posterBottomReserve + 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.semantic.color.accent} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        <FooterFade />
      </View>
    </View>
  );
}

/** the ground fading up into the marks. same cream, never a second shade. */
export function FooterFade() {
  const insets = useSafeAreaInsets();
  const solid = tokens.component.dock.control + insets.bottom;
  return (
    <View pointerEvents="none" style={[styles.fade, { height: solid + FADE_STEPS.length * STEP }]}>
      {FADE_STEPS.map((opacity, index) => (
        <View
          key={opacity}
          style={{
            height: STEP,
            opacity,
            backgroundColor: tokens.semantic.color.cream,
          }}
          // the top step is the faintest; by the last one the ground is
          // solid and the block below it carries the rest.
          testID={index === 0 ? 'footer-fade' : undefined}
        />
      ))}
      <View style={{ flex: 1, backgroundColor: tokens.semantic.color.cream }} />
    </View>
  );
}

const STEP = 7;
const FADE_STEPS = [0.08, 0.2, 0.36, 0.55, 0.76, 0.92];

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 24 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, minHeight: 44 },
  title: { ...tokens.typography.screenTitle, color: tokens.semantic.color.ink },
  body: { flex: 1, marginTop: 4 },
  refreshSlot: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  fade: { position: 'absolute', left: -24, right: -24, bottom: 0, justifyContent: 'flex-end' },
});

/** a group heading inside a page. */
export function GroupLabel({ label, count, hot = false }: { label: string; count?: number; hot?: boolean }) {
  return (
    <Text style={[styles2.group, hot ? styles2.groupHot : null]}>
      {label.toUpperCase()}
      {count && count > 0 ? <Text style={styles2.groupCount}> · {count}</Text> : null}
    </Text>
  );
}

/** the line a page shows when a group, or the whole page, is empty. */
export function Quiet({ head, sub }: { head: string; sub: string }) {
  return (
    <View style={styles2.quiet}>
      <Text style={styles2.quietHead}>{head}</Text>
      <Text style={styles2.quietSub}>{sub}</Text>
    </View>
  );
}

const styles2 = StyleSheet.create({
  group: {
    ...tokens.typography.tagSmall,
    color: tokens.semantic.color.textMutedOnCream,
    textTransform: 'uppercase',
    marginTop: 26,
    marginBottom: 10,
  },
  groupHot: { color: tokens.semantic.color.accent },
  groupCount: { fontFamily: fontFamily.mono, color: tokens.semantic.color.textMutedOnCream },
  quiet: { paddingTop: 60 },
  quietHead: { ...tokens.typography.screenTitle, color: tokens.semantic.color.ink },
  quietSub: {
    ...tokens.typography.metaSmall,
    color: tokens.semantic.color.textMutedOnCream,
    marginTop: 12,
    maxWidth: 300,
  },
});
