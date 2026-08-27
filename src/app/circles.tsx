import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarButton } from '@/design-system/components/button';
import { Face } from '@/design-system/components/face';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { facePhotos } from '@/features/casts/faces';
import { createCircle, people, useCircles } from '@/features/trust/circles';

/**
 * circles: the named groups you build from people you have met. this is
 * where trust comes from — the graph runs on this membership. your
 * members are visible to you; membership is never visible outside.
 */
export default function CirclesScreen() {
  const circles = useCircles();
  const [open, setOpen] = useState<string | null>(null);

  function newCircle() {
    // a real text-entry sheet lands with the create-circle flow; the
    // prompt keeps the fixture build honest without a stray input screen
    Alert.prompt?.('name the circle', 'e.g. climbing crew', (name?: string) => {
      if (name && name.trim()) {
        haptic('selection');
        createCircle(name);
      }
    });
  }

  const total = circles.reduce((n, c) => n + c.memberIds.length, 0);

  return (
    <SheetShell title="circles">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <Text style={styles.lead}>
          {circles.length} circles · {total} people you trust
        </Text>

        {circles.map((circle) => {
          const expanded = open === circle.id;
          return (
            <View key={circle.id}>
              <Row
                title={circle.name}
                sub={`${circle.memberIds.length} ${circle.memberIds.length === 1 ? 'person' : 'people'}`}
                right={<Tag label={expanded ? 'hide' : 'see'} tone="line" />}
                onPress={() => setOpen(expanded ? null : circle.id)}
              />
              {expanded ? (
                <View style={styles.members}>
                  {circle.memberIds.length === 0 ? (
                    <Text style={styles.empty}>no one here yet. add people from their profile.</Text>
                  ) : (
                    circle.memberIds.map((id) => {
                      const person = people[id];
                      if (!person) return null;
                      return (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={person.name}
                          onPress={() => router.push(`/caster/${id}`)}
                          style={styles.member}
                        >
                          <Face photo={facePhotos[id]} initials={person.name.slice(0, 2).toUpperCase()} size={32} label="" />
                          <Text style={styles.memberName}>{person.name}</Text>
                          <Text style={styles.memberArea}>{person.area}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        })}

        <SheetNote>you add people you have met through the app. they are never told which circle.</SheetNote>
      </ScrollView>

      <View style={styles.actions}>
        <BarButton label="new circle" variant="onInk" onPress={newCircle} />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  lead: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 4, marginBottom: 8 },
  members: { paddingLeft: 4, paddingBottom: 12, gap: 10 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  memberName: { fontFamily: fontFamily.displaySemi, fontSize: 15, color: tokens.semantic.color.ink },
  memberArea: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream, marginLeft: 'auto' },
  empty: { ...tokens.typography.metaSmall, color: tokens.semantic.color.textMutedOnCream },
  actions: { marginTop: 14 },
});
