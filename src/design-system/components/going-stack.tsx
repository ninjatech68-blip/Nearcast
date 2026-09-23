import { StyleSheet, Text, View } from 'react-native';

import { goingLabel } from '@/features/plans/domain/counts';

import { useTheme } from '../theme';
import { Avatar } from './avatar';

type Person = { firstName: string; avatarUrl?: string | null };

/**
 * Up to three real avatars and the real count (06 §7.3). Renders nothing when
 * nobody is going: never placeholder faces.
 */
export function GoingStack({ people, count }: { people: Person[]; count: number }) {
  const { colors, tokens } = useTheme();
  const label = goingLabel(count);
  if (!label) return null;
  const shown = people.slice(0, Math.min(3, count));
  return (
    <View accessibilityLabel={label} accessible style={styles.row}>
      <View style={styles.stack}>
        {shown.map((person, index) => (
          <View key={`${person.firstName}-${index}`} style={[styles.item, index > 0 && styles.overlap, { borderColor: colors.backgroundSurface }]}>
            <Avatar name={person.firstName} size={24} uri={person.avatarUrl} />
          </View>
        ))}
      </View>
      <Text style={[tokens.type.caption, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stack: { flexDirection: 'row' },
  item: { borderWidth: 1.5, borderRadius: 14 },
  overlap: { marginLeft: -8 },
});
