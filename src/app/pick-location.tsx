import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { sendLocationMessage } from '@/features/chat/chat';

/**
 * Pick a spot to share into a chat, the same way you place an area in
 * onboarding: a map with a draggable pin, not just "send my current
 * location". You are often planning a place you are not standing in —
 * the café, the gate, the court — so the pin has to move.
 *
 * The pin opens on your current location as a starting point, then goes
 * wherever you drag or tap. The shared coordinate is rounded server-side
 * to ~11m, the same as every location share; this only chooses which
 * approximate spot to send.
 */
export default function PickLocationScreen() {
  const insets = useSafeAreaInsets();
  const { conversation } = useLocalSearchParams<{ conversation: string }>();
  const mapRef = useRef<MapView>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [region] = useState<Region>({
    latitude: 12.9719,
    longitude: 77.6412,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  async function resolveLabel(coord: LatLng) {
    try {
      const addresses = await Location.reverseGeocodeAsync(coord);
      const a = addresses[0];
      const name = [a?.name, a?.district || a?.subregion || a?.city].filter(Boolean).join(', ');
      setLabel(name || null);
    } catch {
      setLabel(null);
    }
  }

  // open on the person's current location as a starting point
  useEffect(() => {
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setPin(coord);
        mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
        void resolveLabel(coord);
      } catch {
        // best-effort: the person can still tap the map to drop a pin
      }
    })();
  }, []);


  function move(coord: LatLng) {
    setPin(coord);
    void resolveLabel(coord);
  }

  async function send() {
    if (!pin || !conversation) return;
    setSending(true);
    haptic('light');
    try {
      await sendLocationMessage(conversation, pin.latitude, pin.longitude, label ?? undefined);
      router.back();
    } catch {
      setSending(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>SHARE A SPOT</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={12} onPress={() => router.back()}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.title}>where, exactly?</Text>
        <Text style={styles.hint}>drag the pin or tap the map. approximate, and only shared with this chat.</Text>

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            style={styles.map}
            onPress={(e) => move(e.nativeEvent.coordinate)}
            showsUserLocation
          >
            {pin ? (
              <Marker
                coordinate={pin}
                draggable
                pinColor={tokens.semantic.color.accent}
                onDragEnd={(e) => move(e.nativeEvent.coordinate)}
              />
            ) : null}
          </MapView>
        </View>

        {label ? <Text style={styles.label}>{label}</Text> : null}

        <View style={styles.actions}>
          <BarButton
            label={sending ? 'sending…' : 'send this spot'}
            variant="onOrange"
            onPress={send}
            disabled={!pin || sending}
            loading={sending}
            loadingLabel="sending…"
          />
          <QuietAction label="never mind" color={tokens.semantic.color.ink} onPress={() => router.back()} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 20 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  close: { fontFamily: fontFamily.text, fontSize: 26, lineHeight: 28, color: tokens.semantic.color.ink },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginTop: 8,
  },
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 8 },
  mapWrap: {
    flex: 1,
    marginTop: 14,
    borderRadius: tokens.primitive.radius.control,
    overflow: 'hidden',
    backgroundColor: tokens.semantic.color.backgroundSubtle,
  },
  map: { flex: 1 },
  label: {
    ...tokens.typography.meta,
    color: tokens.semantic.color.ink,
    marginTop: 12,
    marginBottom: 2,
  },
  actions: { marginTop: 12, gap: 2, paddingBottom: 8 },
});
