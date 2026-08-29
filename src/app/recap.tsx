import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { Poster } from '@/design-system/components/poster';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { useRecap } from '@/features/casts/use-recap';

/**
 * recap: a cast about your month, reusing the poster verbatim. sharing
 * captures the entire card as an image and hands it to the native share
 * sheet — the poster is the artifact, not a caption.
 */
export default function RecapScreen() {
  const shotRef = useRef<View>(null);
  const recap = useRecap();

  async function share() {
    haptic('light');
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${recap.month} recap` });
      }
    } catch {
      // capture or share failure is silent: a dismissed share sheet is not an error state
    }
  }

  return (
    <View style={styles.frame}>
      <View ref={shotRef} collapsable={false} style={styles.captureBox}>
        <Poster
          cast={{
            id: 'recap',
            category: 'travel',
            text: recap.headline,
            area: recap.meta,
            vouches: '',
            expiry: '',
            why: '',
          }}
          reserveRail={false}
          tagLabel={recap.tag}
          topRight={
            <Pressable accessibilityRole="button" accessibilityLabel="close" hitSlop={12} onPress={() => router.back()}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          }
        >
          <Text style={styles.why}>{recap.why}</Text>
          {/* nothing to share in a month with no receipts — offering the
              button would hand someone an empty poster of themselves. */}
          {recap.hasData ? <BarButton label="share the poster" variant="onCream" onPress={share} /> : null}
          <QuietAction
            label={recap.hasData ? 'keep it' : 'close'}
            color={tokens.semantic.color.cream}
            onPress={() => router.back()}
          />
        </Poster>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: tokens.semantic.color.ink },
  captureBox: { flex: 1 },
  close: { fontFamily: fontFamily.text, fontSize: 26, lineHeight: 28, color: tokens.semantic.color.cream },
  why: { ...tokens.typography.metaSmall, color: 'rgba(244,239,228,0.62)', marginBottom: 14 },
});
