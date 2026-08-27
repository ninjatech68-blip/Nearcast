import { router } from 'expo-router';
import { Pressable, Share, StyleSheet, Text } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Poster } from '@/design-system/components/poster';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { recap } from '@/features/casts/fixtures';

/**
 * recap: a cast about your month, reusing the poster verbatim.
 * no comparisons, no rank, no percentile.
 */
export default function RecapScreen() {
  async function share() {
    haptic('light');
    try {
      await Share.share({ message: `${recap.month}: ${recap.headline} ${recap.meta}` });
    } catch {
      // sharing is optional; a dismissed share sheet is not an error state
    }
  }

  return (
    <Poster
      cast={{
        id: 'recap',
        verb: 'got',
        text: recap.headline,
        area: recap.meta,
        vouches: '',
        expiry: '',
        why: '',
      }}
      reserveRail={false}
      tagLabel="MARCH RECAP"
      topRight={
        <Pressable accessibilityRole="button" accessibilityLabel="close" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.close}>×</Text>
        </Pressable>
      }
    >
      <Text style={styles.why}>{recap.why}</Text>
      <BarButton label="share the poster" variant="onCream" onPress={share} />
      <QuietAction label="keep it" color={tokens.semantic.color.cream} onPress={() => router.back()} />
    </Poster>
  );
}

const styles = StyleSheet.create({
  close: { fontFamily: fontFamily.text, fontSize: 26, lineHeight: 28, color: tokens.semantic.color.cream },
  why: { ...tokens.typography.metaSmall, color: 'rgba(244,239,228,0.62)', marginBottom: 14 },
});
