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
import MapView, { Marker, PROVIDER_DEFAULT, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row } from '@/design-system/components/row';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { areasNearMe, searchAreas } from '@/features/casts/area-lookup';
import { setDraftArea } from '@/features/casts/store';

type Status = 'idle' | 'locating' | 'searching' | 'no-permission' | 'not-found';

const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * the area picker. one view: a map on top with a pin at the currently
 * selected area, a list of nearby names below. tapping a name moves
 * the pin to that place. tapping the map drops a pin and the resolved
 * name lights up in the list. the pin is a visual hint of what "area"
 * means — the cast still stores the NAME only, never coordinates.
 */
export default function AreaScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
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
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          const next: Region = { ...coord, latitudeDelta: 0.03, longitudeDelta: 0.03 };
          setRegion(next);
          setPin(coord);
          mapRef.current?.animateToRegion(next, 400);
        }
      } catch {
        // map centering is best-effort
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
    } else {
      setResults([typed]);
      setStatus('not-found');
    }
  }

  /** move the pin to a named area (geocode → coord). */
  async function highlight(area: string) {
    setSelected(area);
    try {
      const matches = await Location.geocodeAsync(area);
      const match = matches[0];
      if (match) {
        const coord = { latitude: match.latitude, longitude: match.longitude };
        const next: Region = { ...coord, latitudeDelta: 0.03, longitudeDelta: 0.03 };
        setRegion(next);
        setPin(coord);
        mapRef.current?.animateToRegion(next, 350);
      }
    } catch {
      // pin move is best-effort — the name is still the answer
    }
  }

  function tap(area: string) {
    haptic('selection');
    void highlight(area);
  }

  function choose(area: string) {
    haptic('success');
    setDraftArea(area);
    router.back();
  }

  /** drop a pin on the map → resolve to a name and light up the list. */
  async function dropPin(event: { nativeEvent: { coordinate: LatLng } }) {
    const coord = event.nativeEvent.coordinate;
    setPin(coord);
    try {
      const addresses = await Location.reverseGeocodeAsync(coord);
      const address = addresses[0];
      const name = (address?.district || address?.subregion || address?.city)?.trim().toLowerCase();
      if (name) {
        setSelected(name);
        // put the name at the top of the list if it's not already there
        setResults((prev) => (prev.includes(name) ? prev : [name, ...prev]));
      }
    } catch {
      // silent — the pin is on the map, that's enough
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

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            initialRegion={region}
            style={styles.map}
            onPress={dropPin}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {pin ? (
              <Marker
                coordinate={pin}
                title={selected ?? undefined}
                pinColor={tokens.semantic.color.accent}
              />
            ) : null}
          </MapView>
        </View>

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
            <Row
              key={area}
              title={area}
              sub={selected === area ? 'pinned on the map — tap use it below' : 'tap to pin · tap use it to choose'}
              onPress={() => tap(area)}
            />
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

        {selected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`use ${selected}`}
            onPress={() => choose(selected)}
            style={styles.useBtn}
          >
            <Text style={styles.useText}>use {selected}</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.privacy, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          casts show the area only. the exact spot stays hidden.
        </Text>
      </KeyboardAvoidingView>
    </View>
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
    marginBottom: 12,
  },
  mapWrap: {
    height: 200,
    borderRadius: tokens.primitive.radius.control,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.semantic.color.hairlineOnCream,
    marginBottom: 14,
  },
  map: { flex: 1 },
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
  locate: { minHeight: 44, justifyContent: 'center', marginTop: 4 },
  locateText: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.accent },
  resultsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 },
  section: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream },
  note: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 18 },
  useBtn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: tokens.primitive.radius.control,
    backgroundColor: tokens.semantic.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  useText: { fontFamily: fontFamily.display, fontSize: 17, color: tokens.semantic.color.ink },
  privacy: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, paddingTop: 10 },
});
