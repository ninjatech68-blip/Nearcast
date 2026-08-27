import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, type LatLng, type MapPressEvent, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row } from '@/design-system/components/row';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { areasNearMe, searchAreas } from '@/features/casts/area-lookup';
import { setDraftArea } from '@/features/casts/store';

type Status = 'idle' | 'locating' | 'searching' | 'no-permission' | 'not-found';
type Mode = 'list' | 'map';

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * the area picker. two ways in: NAMES (list) and MAP (drop a pin). the
 * pin resolves to a NEIGHBORHOOD NAME — no coordinates ever leave the
 * screen or land on a cast. field pinned at top, results scroll under.
 */
export default function AreaScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('list');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinName, setPinName] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    void locate();
  }, []);

  async function locate() {
    setStatus('locating');
    const result = await areasNearMe();
    if (result.ok) {
      setResults(result.areas);
      setStatus('idle');
      // if we have the raw coord, center the map on it too
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          };
          setRegion(next);
          mapRef.current?.animateToRegion(next, 400);
        }
      } catch {
        // map centring is best-effort
      }
    } else {
      setResults([]);
      setStatus(result.reason === 'permission' ? 'no-permission' : 'not-found');
    }
  }

  async function search(text: string) {
    const typed = text.trim().toLowerCase();
    if (typed.length < 2) return;
    setStatus('searching');
    const result = await searchAreas(text);
    if (result.ok) {
      setResults(result.areas);
      setStatus('idle');
      // try to center the map on the first geocode too
      try {
        const matches = await Location.geocodeAsync(text);
        if (matches[0]) {
          const next = {
            latitude: matches[0].latitude,
            longitude: matches[0].longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(next);
          mapRef.current?.animateToRegion(next, 400);
        }
      } catch {
        // best-effort
      }
    } else {
      setResults([typed]);
      setStatus('not-found');
    }
  }

  function choose(area: string) {
    haptic('selection');
    setDraftArea(area);
    router.back();
  }

  async function dropPin(event: MapPressEvent) {
    const coord = event.nativeEvent.coordinate;
    setPin(coord);
    setPinName('resolving…');
    try {
      const addresses = await Location.reverseGeocodeAsync(coord);
      const address = addresses[0];
      const name = address?.district || address?.subregion || address?.city;
      setPinName(name?.trim().toLowerCase() ?? null);
    } catch {
      setPinName(null);
    }
  }

  const busy = status === 'locating' || status === 'searching';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>AREA</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="cancel" hitSlop={12} onPress={() => router.back()} style={styles.closeTarget}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.title}>where, roughly?</Text>

        <View style={styles.tabs}>
          <Tab label="names" on={mode === 'list'} onPress={() => setMode('list')} />
          <Tab label="map" on={mode === 'map'} onPress={() => setMode('map')} />
        </View>

        {mode === 'list' ? (
          <>
            <TextInput
              accessibilityLabel="search area by name"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => search(query)}
              placeholder="type an area, or use nearby"
              placeholderTextColor={tokens.semantic.color.hairlineOnCream}
              selectionColor={tokens.semantic.color.accent}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="use my location" onPress={locate} style={styles.locate}>
              <Text style={styles.locateText}>◉ use my location</Text>
            </Pressable>

            <View style={styles.resultsHead}>
              <Text style={styles.section}>{status === 'searching' ? 'MATCHES' : 'NEARBY'}</Text>
              {busy ? <ActivityIndicator color={tokens.semantic.color.accent} size="small" /> : null}
            </View>

            <ScrollView
              style={styles.flex}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {results.map((area) => (
                <Row key={area} title={area} sub="stays approximate" onPress={() => choose(area)} />
              ))}
              {results.length === 0 && !busy ? (
                <Text style={styles.note}>
                  {status === 'no-permission'
                    ? 'location is off. type an area name instead.'
                    : 'nothing nearby yet. type an area name.'}
                </Text>
              ) : null}
              {status === 'not-found' && results.length > 0 ? (
                <Text style={styles.note}>nothing matched nearby. the name still works.</Text>
              ) : null}
            </ScrollView>
          </>
        ) : (
          <View style={styles.flex}>
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                initialRegion={region}
                style={styles.map}
                onPress={dropPin}
                showsUserLocation
                showsMyLocationButton={false}
              />
              {pin ? (
                <View pointerEvents="none" style={styles.pinLayer}>
                  {/* an unmovable pin at the touched coord is enough
                      visually; MapView.Marker adds overhead we don't need */}
                </View>
              ) : null}
            </View>
            <Text style={styles.mapHint}>tap the map to drop a pin. we turn it into an area name — never coordinates.</Text>
            <View style={styles.pinRow}>
              {pinName ? (
                <>
                  <View style={styles.flex}>
                    <Text style={styles.pinLabel}>your pin resolves to</Text>
                    <Text style={styles.pinName}>{pinName}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`use ${pinName}`}
                    onPress={() => choose(pinName)}
                    style={styles.useBtn}
                  >
                    <Text style={styles.useText}>use it</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.pinLabel}>{pin ? 'resolving…' : 'no pin yet.'}</Text>
              )}
            </View>
          </View>
        )}

        <Text style={[styles.privacy, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          casts show the area only. the exact spot stays hidden.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

function Tab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.tab, on && styles.tabOn]}
    >
      <Text style={[styles.tabText, on && styles.tabTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.semantic.color.cream, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  wordmark: { ...tokens.typography.tag, color: tokens.semantic.color.textMutedOnCream },
  closeTarget: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  close: { fontFamily: fontFamily.text, fontSize: 28, lineHeight: 30, color: tokens.semantic.color.ink },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: tokens.semantic.color.ink,
    marginTop: 6,
    marginBottom: 14,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: tokens.primitive.radius.pill,
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: tokens.semantic.color.ink, borderColor: tokens.semantic.color.ink },
  tabText: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  tabTextOn: { color: tokens.semantic.color.cream },
  input: {
    minHeight: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.displaySemi,
    fontSize: 17,
    color: tokens.semantic.color.ink,
  },
  locate: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  locateText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  resultsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 2 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  note: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 18 },
  mapWrap: {
    flex: 1,
    borderRadius: tokens.primitive.radius.control,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
  },
  map: { flex: 1 },
  pinLayer: { position: 'absolute', inset: 0 },
  mapHint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 10 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, minHeight: 52 },
  pinLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  pinName: { fontFamily: fontFamily.displaySemi, fontSize: 17, color: tokens.semantic.color.ink, marginTop: 2 },
  useBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useText: { fontFamily: fontFamily.display, fontSize: 15, color: tokens.semantic.color.ink },
  privacy: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, paddingTop: 10 },
});
