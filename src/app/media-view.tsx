import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily, tokens } from '@/design-system/tokens';
import { useMediaUrl } from '@/features/chat/use-media-url';

/**
 * Full-screen viewer for a shared photo or GIF.
 *
 * A picture in a bubble is a thumbnail; tapping it should show the whole
 * thing. The bucket is private, so the path is re-signed here through the
 * same hook the bubble uses. On ink, edge to edge, one tap to close.
 */
export default function MediaViewScreen() {
  const insets = useSafeAreaInsets();
  const { path, kind } = useLocalSearchParams<{ path?: string; kind?: string }>();
  const url = useMediaUrl(path ? decodeURIComponent(path) : undefined);

  return (
    <View style={styles.screen}>
      <Pressable style={styles.fill} accessibilityRole="button" accessibilityLabel="close" onPress={() => router.back()}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={styles.fill}
            contentFit="contain"
            accessibilityLabel={kind === 'gif' ? 'a GIF' : 'a photo'}
          />
        ) : (
          <View style={[styles.fill, styles.center]}>
            <ActivityIndicator color={tokens.semantic.color.cream} />
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close"
        hitSlop={12}
        onPress={() => router.back()}
        style={[styles.close, { top: insets.top + 8 }]}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0A08' },
  fill: { flex: 1, width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 18, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fontFamily.text, fontSize: 30, lineHeight: 32, color: tokens.semantic.color.cream },
});
