import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design-system/components/button';
import { tokens } from '@/design-system/tokens';
import { GENERIC_SIGN_IN_ERROR } from '@/features/auth/domain/membership';
import { fetchPlaces, setHomePlace, type Place } from '@/features/location/data/places-repository';

/**
 * The last step of joining: naming an area.
 *
 * Discovery measures from this, so a member without one is eligible for
 * nothing. It is chosen from a list rather than read from the device: the area
 * is what someone is willing to be found near, which is not the same as where
 * they happen to be standing, and the product never needs the latter.
 */
export function AreaForm({ onChosen }: { onChosen: () => Promise<void> | void }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchPlaces()
      .then((loaded) => {
        if (!cancelled) setPlaces(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setPlaces([]);
          setError('We could not load the areas. Check your connection and try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm() {
    if (selected === null) return;

    setIsBusy(true);
    setError(null);

    try {
      await setHomePlace(selected);
      await onChosen();
    } catch {
      setError(GENERIC_SIGN_IN_ERROR);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.hint}>
        Nearcast shows you intents near this area, and shows your area to people
        who receive yours. Your exact location is never shared.
      </Text>

      {places === null && (
        <ActivityIndicator color={tokens.semantic.color.actionPrimary} />
      )}

      {places?.map((place) => {
        const isSelected = selected === place.id;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={place.name}
            accessibilityState={{ selected: isSelected }}
            key={place.id}
            onPress={() => setSelected(place.id)}
            style={[styles.option, isSelected && styles.optionSelected]}>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {place.name}
            </Text>
            <Text style={styles.region}>{place.region}</Text>
          </Pressable>
        );
      })}

      {places?.length === 0 && error === null && (
        <Text style={styles.hint}>No areas are available yet.</Text>
      )}

      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      <Button
        disabled={selected === null || isBusy}
        label={isBusy ? 'Saving' : 'Use this area'}
        onPress={() => void confirm()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.primitive.space[2] },
  hint: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  option: {
    backgroundColor: tokens.semantic.color.backgroundSurface,
    borderColor: tokens.semantic.color.borderDefault,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.primitive.space[4],
    paddingVertical: tokens.primitive.space[3],
  },
  optionSelected: {
    backgroundColor: tokens.semantic.color.trustSurface,
    borderColor: tokens.semantic.color.trustText,
  },
  optionText: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.body.fontSize,
  },
  optionTextSelected: { color: tokens.semantic.color.trustText },
  region: {
    color: tokens.semantic.color.textMuted,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.caption.fontSize,
  },
  error: {
    color: tokens.semantic.color.dangerText,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
  },
});
