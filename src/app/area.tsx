import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
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
import {
  areasNearMe,
  makeSessionToken,
  resolveSuggestion,
  searchAreas,
  suggestAreas,
  type AreaSuggestion,
} from '@/features/casts/area-lookup';
import * as NativePlaces from '@/features/casts/native-places';
import { placesEnabled } from '@/features/casts/places-api';
import { setDraftArea } from '@/features/casts/store';
import { addApprovedArea, setHomeAreaFromOnboarding } from '@/features/me/me-store';

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
 * name lights up in the list.
 *
 * The pin travels with the name. Delivery measures distance between
 * area centres, so a name with no point behind it can only be matched
 * as a string — which quietly stops working the moment two people
 * spell the same place differently. The point is always approximate:
 * the server rounds it before storing, and nothing here ever asks
 * where the person actually is.
 *
 * One screen serves three callers, chosen by `?target=`:
 *   cast  (default) — hands the answer to the compose draft
 *   home            — the onboarding home-area step
 *   areas           — an approved neighbourhood, from onboarding or settings
 */
type Target = 'cast' | 'home' | 'areas';

export default function AreaScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ target?: string }>();
  const target: Target =
    params.target === 'home' ? 'home' : params.target === 'areas' ? 'areas' : 'cast';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly string[]>([]);
  const [suggestions, setSuggestions] = useState<readonly AreaSuggestion[]>([]);
  // one session token across a typing session — costs less with the
  // Google Places billing model. regenerated after a pick.
  const [sessionToken, setSessionToken] = useState<string>(() => makeSessionToken());
  const [status, setStatus] = useState<Status>('idle');
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  // set when the search field is filled from a pick, so the typeahead
  // effect below doesn't turn that address straight back into a search.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    void locate();
  }, []);

  /**
   * live typeahead: after the user pauses for 250ms, fetch richer
   * geocoded SUGGESTIONS (name + full formatted address) and populate
   * the list. cancelled if they keep typing.
   */
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const typed = query.trim();
    if (typed.length < 2) {
      // clear on the next tick so the effect body doesn't setState during commit
      const cleared = setTimeout(() => setSuggestions([]), 0);
      return () => clearTimeout(cleared);
    }
    const handle = setTimeout(async () => {
      setStatus('searching');
      const next = await suggestAreas(query, sessionToken, {
        latitude: region.latitude,
        longitude: region.longitude,
        span: Math.max(region.latitudeDelta, region.longitudeDelta),
      });
      setSuggestions(next);
      setStatus('idle');
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sessionToken]);

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

  function backendLabel(): string {
    // one-line hint of which suggestion backend is providing rows.
    // tap-through to confirm: MapKit = native module linked; Places
    // = google key set; geocode = neither, using expo-location.
    if (NativePlaces.isAvailable()) return 'via Apple Maps';
    if (placesEnabled()) return 'via Google Places';
    return 'via geocode (limited)';
  }

  async function tapSuggestion(s: AreaSuggestion) {
    haptic('selection');
    // the SHORT name is what we store and pin and confirm — casts carry
    // the neighbourhood, never a full street address. the field shows
    // the full address so you can see what you picked; the button stays
    // a fixed "use this area".
    setSelected(s.name);
    skipNextSearch.current = true;
    setQuery(s.full || s.name);
    setSuggestions([]);
    const coord = await resolveSuggestion(s);
    if (coord) {
      const next: Region = { ...coord, latitudeDelta: 0.03, longitudeDelta: 0.03 };
      setRegion(next);
      setPin(coord);
      mapRef.current?.animateToRegion(next, 350);
    }
    // fresh session token for the next autocomplete run — Places
    // bills per (autocomplete+details) session, so rotating after a
    // pick starts a new billable session.
    setSessionToken(makeSessionToken());
  }

  function choose(area: string) {
    haptic('success');
    const point = pin ? { latitude: pin.latitude, longitude: pin.longitude } : null;
    const name = area.trim().toLowerCase();

    if (target === 'home') {
      // your home area is always one of your approved areas — casts
      // near where you live have to be able to reach you — and it
      // replaces the demo seed, which would otherwise keep delivering
      // another city's casts.
      setHomeAreaFromOnboarding(name, point);
    } else if (target === 'areas') {
      addApprovedArea(name, point);
    } else {
      setDraftArea(area, point);
    }
    router.back();
  }

  /**
   * Resolve a pin to an area name. Shared by a tap on the map, a drag of
   * the marker, and the auto-drop on open — anywhere the pin moves, its
   * neighbourhood is fetched and selected so the person does not have to
   * name the spot they just pointed at.
   */
  async function resolvePin(coord: LatLng) {
    setPin(coord);
    try {
      const addresses = await Location.reverseGeocodeAsync(coord);
      const address = addresses[0];
      const name = (address?.district || address?.subregion || address?.city)?.trim().toLowerCase();
      if (name) {
        setSelected(name);
        setResults((prev) => (prev.includes(name) ? prev : [name, ...prev]));
      }
    } catch {
      // silent — the pin is on the map, that's enough
    }
  }

  function dropPin(event: { nativeEvent: { coordinate: LatLng } }) {
    void resolvePin(event.nativeEvent.coordinate);
  }

  // Auto-fetch on open: if we arrived without a pin, drop one at the
  // person's current location and resolve its name, so the map opens
  // already pointing somewhere real instead of waiting for a tap.
  const autoDropped = useRef(false);
  useEffect(() => {
    if (autoDropped.current || pin) return;
    autoDropped.current = true;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coord = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const next: Region = { ...coord, latitudeDelta: 0.03, longitudeDelta: 0.03 };
        setRegion(next);
        mapRef.current?.animateToRegion(next, 400);
        await resolvePin(coord);
      } catch {
        // best-effort: the person can still tap or search
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                draggable
                onDragEnd={(e) => void resolvePin(e.nativeEvent.coordinate)}
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
          <Text style={styles.section}>
            {suggestions.length > 0 ? 'SUGGESTIONS' : status === 'searching' ? 'MATCHES' : 'NEARBY'}
          </Text>
          <Text style={styles.backend}>{backendLabel()}</Text>
          {busy ? <ActivityIndicator color={tokens.semantic.color.accent} size="small" /> : null}
        </View>

        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {suggestions.length > 0
            ? suggestions.map((s) => (
                <Row
                  key={`${s.name}-${s.full}`}
                  title={s.name}
                  sub={s.full !== s.name ? s.full : 'tap to pin · tap use it to choose'}
                  onPress={() => tapSuggestion(s)}
                />
              ))
            : results.map((area) => (
                <Row
                  key={area}
                  title={area}
                  sub={selected === area ? 'pinned · drag to fine-tune, then use it below' : 'tap to pin · tap use it to choose'}
                  onPress={() => tap(area)}
                />
              ))}
          {suggestions.length === 0 && results.length === 0 && !busy ? (
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
            <Text style={styles.useText}>use this area</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.privacy, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          casts show the neighbourhood only. an exact spot is never stored.
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
  backend: { ...tokens.typography.metaSmall, color: tokens.semantic.color.accent, flex: 1, textAlign: 'right' },
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
