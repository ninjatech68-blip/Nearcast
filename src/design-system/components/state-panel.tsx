import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './button';
import { Icon } from './icon';

export type PanelState =
  | { kind: 'loading'; rows?: number }
  | { kind: 'empty'; title: string; body: string; actionLabel?: string; onAction?: () => void }
  | { kind: 'error'; onRetry: () => void; message?: string }
  | { kind: 'restricted' }
  | { kind: 'notAvailable' };

/** Loading, empty, error, restricted and not-available states (04 G1). */
export function StatePanel({ state }: { state: PanelState }) {
  const { colors, tokens } = useTheme();

  if (state.kind === 'loading') {
    return (
      <View accessibilityLabel="Loading" accessible style={styles.skeleton}>
        {Array.from({ length: state.rows ?? 4 }, (_, index) => (
          <View key={index} style={styles.skeletonRow} testID="skeleton-row">
            <View style={[styles.skeletonTile, { backgroundColor: colors.backgroundSurfaceMuted }]} />
            <View style={styles.skeletonLines}>
              <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.backgroundSurfaceMuted }]} />
              <View style={[styles.skeletonLine, { width: '45%', backgroundColor: colors.backgroundSurfaceMuted }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  const content =
    state.kind === 'empty'
      ? { title: state.title, body: state.body, icon: null }
      : state.kind === 'error'
        ? { title: "Couldn't load", body: state.message ?? 'Check your connection and try again.', icon: 'error' as const }
        : state.kind === 'restricted'
          ? { title: 'Limited', body: 'Your account is limited right now. Contact support.', icon: 'safety' as const }
          : { title: "This isn't available", body: "It may have ended or isn't shared with you.", icon: 'spotLocked' as const };

  return (
    <View style={styles.panel}>
      {content.icon ? <Icon color="textSecondary" label={null} name={content.icon} size={28} /> : null}
      <Text accessibilityRole="header" style={[tokens.type.display, styles.center, { color: colors.textPrimary }]}>
        {content.title}
      </Text>
      <Text style={[tokens.type.body, styles.center, { color: colors.textSecondary }]}>{content.body}</Text>
      {state.kind === 'empty' && state.actionLabel && state.onAction ? (
        <Button label={state.actionLabel} onPress={state.onAction} />
      ) : null}
      {state.kind === 'error' ? <Button label="Retry" onPress={state.onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function OfflineBanner({ lastUpdated }: { lastUpdated?: string }) {
  const { colors, tokens } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: colors.backgroundWarning }]}>
      <Icon color="statusWarning" label={null} name="offline" size={16} />
      <View style={styles.bannerText}>
        <Text style={[tokens.type.caption, { color: colors.textPrimary }]}>You&apos;re offline. We&apos;ll send this when you&apos;re back.</Text>
        {lastUpdated ? (
          <Text style={[tokens.type.caption, { color: colors.textSecondary }]}>{`Last updated ${lastUpdated}`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', gap: 12, padding: 24 },
  center: { textAlign: 'center' },
  skeleton: { gap: 16, padding: 16 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonTile: { width: 44, height: 44, borderRadius: 22 },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 12, borderRadius: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  bannerText: { flex: 1 },
});
