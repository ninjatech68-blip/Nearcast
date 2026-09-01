import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { QuietAction } from '@/design-system/components/button';
import { Row } from '@/design-system/components/row';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { Tag } from '@/design-system/components/tag';
import { tokens } from '@/design-system/tokens';
import { signOut } from '@/features/auth/auth';
import { useMe } from '@/features/me/me-store';

/**
 * Edit profile: who you are, where you cast, and the paperwork.
 *
 * The split from the profile hub runs along a sharper line than "often
 * used / rarely used". The hub keeps the things that change what the
 * app DOES to you — who your casts reach, when it may interrupt you,
 * who it must keep away from you — because each of those is rarely
 * touched and expensive to get wrong, and burying them by frequency
 * would put blocking below a monthly recap.
 *
 * What is left here is identity and paperwork: the name and email other
 * people see, the areas you cast into, the two legal pages, and the two
 * ways to leave. None of it changes how a cast travels.
 *
 * Your photo is NOT here. It is edited by tapping the photo, on the hub,
 * because the object and its control should be the same object.
 */
export default function ProfileEditScreen() {
  const me = useMe();
  const areasLine = `${me.approvedAreas.join(', ')} · always approximate`;

  return (
    <SheetShell title="edit profile">
      <View style={styles.rows}>
        <Row
          title="name & email"
          sub={me.email ? `${me.name} · ${me.email}` : me.name}
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/name')}
        />
        <Row title="area" sub={areasLine} right={<Tag label="→" tone="line" />} onPress={() => router.push('/areas')} />
        <Row
          title="terms + privacy"
          sub="what stays private · how blocks work"
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/legal/privacy')}
        />
        <Row
          title="community guidelines"
          sub="what gets you removed"
          right={<Tag label="→" tone="line" />}
          onPress={() => router.push('/legal/guidelines')}
        />
      </View>

      <SheetNote>nearcast never shows your exact location, your email, or which circle vouched for you.</SheetNote>

      {/* last, behind everything else, and off the hub entirely. */}
      <View style={styles.leave}>
        <QuietAction
          label="delete account"
          color={tokens.semantic.color.textMutedOnCream}
          onPress={() => router.push('/delete-account')}
        />
        <QuietAction
          label="sign out"
          color={tokens.semantic.color.ink}
          onPress={() =>
            Alert.alert('sign out?', 'you can sign back in with the same email.', [
              { text: 'never mind' },
              {
                text: 'sign out',
                style: 'destructive',
                onPress: () => {
                  void signOut().finally(() => router.replace('/signin'));
                },
              },
            ])
          }
        />
      </View>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  rows: { marginTop: 18 },
  leave: { marginTop: 'auto', paddingTop: 24, alignItems: 'center' },
});
