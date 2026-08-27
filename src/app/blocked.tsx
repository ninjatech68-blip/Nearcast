import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { casters } from '@/features/casts/fixtures';
import { unblockCaster, useMe } from '@/features/me/me-store';

/**
 * blocked list. shows every caster you have blocked, with unblock
 * beside each. blocking is one-tap and silent to the blocked person;
 * unblocking is a confirm because it opens delivery again.
 */
export default function BlockedScreen() {
  const me = useMe();
  const rows = me.blocked.map((id) => ({
    id,
    person: casters.find((c) => c.id === id),
  }));

  function unblock(id: string, name: string) {
    Alert.alert(`unblock ${name}?`, `their casts can reach you again.`, [
      { text: 'never mind' },
      {
        text: 'unblock',
        onPress: () => {
          haptic('selection');
          unblockCaster(id);
        },
      },
    ]);
  }

  return (
    <SheetShell title="blocked">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>
        <Text style={styles.hint}>blocking is silent — they see nothing change. their casts never reach you again.</Text>

        {rows.length === 0 ? (
          <Text style={styles.empty}>nobody blocked. good — this list should stay short.</Text>
        ) : (
          <View style={styles.rows}>
            {rows.map(({ id, person }) => (
              <View key={id} style={styles.row}>
                <Face
                  photo={facePhotos[id]}
                  initials={(person?.name ?? id).slice(0, 2).toUpperCase()}
                  size={44}
                  label={`photo of ${person?.name ?? id}`}
                />
                <View style={styles.rowMid}>
                  <Text style={styles.name}>{person?.name ?? id}</Text>
                  <Text style={styles.area}>{person?.area ?? 'unknown area'}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`unblock ${person?.name ?? id}`}
                  onPress={() => unblock(id, person?.name ?? id)}
                  style={styles.unblockTap}
                >
                  <Tag label="unblock" tone="line" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <SheetNote>blocks always win. even a friend-of-a-friend cast from a blocked person never reaches you.</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton label="done" variant="onCream" onPress={() => router.back()} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4 },
  rows: { marginTop: 18 },
  row: {
    minHeight: 64,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tokens.semantic.color.hairlineOnCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMid: { flex: 1 },
  name: { fontFamily: fontFamily.displaySemi, fontSize: 17, color: tokens.semantic.color.ink },
  area: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 2 },
  unblockTap: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  empty: { ...tokens.typography.meta, color: tokens.semantic.color.ink, marginTop: 20 },
  actions: { marginTop: 18, gap: 2 },
});
