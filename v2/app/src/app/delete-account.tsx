import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarButton, QuietAction } from '@/design-system/components/button';
import { SheetNote, SheetShell } from '@/design-system/components/sheet';
import { haptic } from '@/design-system/haptics';
import { fontFamily, tokens } from '@/design-system/tokens';
import { signOut, useMe } from '@/features/me/me-store';

const CONFIRM_WORD = 'delete';

/**
 * account deletion. the privacy page promises this, so it has to be
 * real and it has to be honest about what survives.
 *
 * the honesty matters: we cannot claw a message back out of someone
 * else's chat history, and a receipt is a shared fact about a plan
 * two people both confirmed — erasing one side of it would rewrite
 * the other person's record. So we say exactly that rather than
 * implying a clean erase.
 *
 * production: this posts a deletion request, the server tombstones
 * the profile immediately (so you vanish from every feed and
 * caster sheet on the next read) and hard-deletes within 30 days.
 * here it wipes the device and returns to signin.
 */
export default function DeleteAccountScreen() {
  const me = useMe();
  const [typed, setTyped] = useState('');
  const [working, setWorking] = useState(false);

  const armed = typed.trim().toLowerCase() === CONFIRM_WORD;

  function confirm() {
    if (!armed) return;
    Alert.alert(
      'delete your account?',
      'this cannot be undone. your casts come down and your profile is gone.',
      [
        { text: 'never mind', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: () => {
            setWorking(true);
            haptic('warning');
            // signOut wipes every persisted store and resets in-memory
            // state — the same guarantee deletion needs on-device.
            setTimeout(() => {
              signOut();
              router.replace('/signin');
            }, 400);
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <SheetShell title="delete account">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.flex}>
          <Text style={styles.lead}>
            {me.email ? `${me.email}. ` : ''}this removes your profile and takes down everything you have out.
          </Text>

          <Section h="WHAT GOES">
            <Item>your profile, photo, name, and areas</Item>
            <Item>every cast you have posted, live or draft</Item>
            <Item>your circles, and every vouch you made</Item>
            <Item>your quiet hours, blocks, and interests</Item>
          </Section>

          <Section h="WHAT STAYS, AND WHY">
            <Item>
              messages you sent stay in the other person&apos;s chat. we cannot reach into someone else&apos;s history and
              edit it, but your name comes off them.
            </Item>
            <Item>
              receipts stay on the plans they belong to. a receipt is a fact two people confirmed together; deleting your
              half would rewrite the other person&apos;s record.
            </Item>
          </Section>

          <Text style={styles.confirmLabel}>TYPE {CONFIRM_WORD.toUpperCase()} TO CONFIRM</Text>
          <TextInput
            accessibilityLabel="type delete to confirm"
            value={typed}
            onChangeText={setTyped}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={tokens.semantic.color.hairlineOnCream}
            selectionColor={tokens.semantic.color.accent}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <SheetNote>
            if you just want a break, quiet hours or signing out both work and keep everything where it is.
          </SheetNote>
        </ScrollView>

        <View style={styles.actions}>
          <BarButton
            label="delete my account"
            variant="onOrange"
            onPress={confirm}
            disabled={!armed || working}
            loading={working}
          />
          <QuietAction label="keep my account" color={tokens.semantic.color.ink} onPress={() => router.back()} />
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h}>{h}</Text>
      {children}
    </View>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.itemText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lead: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink, marginTop: 4 },
  section: { marginTop: 22 },
  h: { ...tokens.typography.tagSmall, color: tokens.semantic.color.accent, marginBottom: 10 },
  itemRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dot: { ...tokens.typography.meta, color: tokens.semantic.color.textMutedOnCream, width: 8 },
  itemText: { fontFamily: fontFamily.text, fontSize: 15, lineHeight: 22, color: tokens.semantic.color.ink, flex: 1 },
  confirmLabel: { ...tokens.typography.tagSmall, color: tokens.semantic.color.textMutedOnCream, marginTop: 26, marginBottom: 8 },
  input: {
    minHeight: 52,
    borderRadius: tokens.primitive.radius.control,
    borderWidth: 1.5,
    borderColor: tokens.semantic.color.accent,
    paddingHorizontal: 14,
    fontFamily: fontFamily.text,
    fontSize: 17,
    color: tokens.semantic.color.ink,
  },
  actions: { marginTop: 18, gap: 2 },
});
