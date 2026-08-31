import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { Group, ScreenTitle, Section, SymbolIcon } from '@/features/native-demo/native-ui';

type Confirming = 'none' | 'signOut' | 'delete';

/**
 * `photo` and `save` come from the route while this screen is fixture-backed,
 * so the permission-denied and partial-save paths stay reachable. They are
 * replaced by the real permission and mutation results once those land.
 */
export default function EditProfileScreen() {
  const params = useLocalSearchParams<{ photo?: string; save?: string }>();
  const photoDenied = params.photo === 'denied';
  const partialSave = params.save === 'partial';

  const [name, setName] = useState('Piyush Sharma');
  const [area, setArea] = useState('Indiranagar');
  const [interests, setInterests] = useState('Badminton, long walks, filter coffee');
  const [confirming, setConfirming] = useState<Confirming>('none');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
        <ScreenTitle>Edit profile</ScreenTitle>

        {partialSave ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>Some changes were not saved</Text>
            <Text style={styles.warningBody}>
              Approximate home area could not be updated. Everything else saved.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.warningAction}>
              <Text style={styles.warningActionText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        <Section title="Profile">
          <Group>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>PS</Text></View>
              <View style={styles.avatarCopy}>
                <Pressable accessibilityRole="button" onPress={() => undefined}>
                  <Text style={styles.linkAction}>Change photo</Text>
                </Pressable>
                {photoDenied ? (
                  <Text style={styles.fieldError}>
                    Nearcast cannot reach your photos. Allow photo access in Settings to change your picture.
                  </Text>
                ) : (
                  <Text style={styles.fieldHint}>People see this next to your casts.</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <Text nativeID="name-label" style={styles.fieldLabel}>Display name</Text>
              <TextInput
                accessibilityLabel="Display name"
                maxLength={60}
                onChangeText={setName}
                style={styles.input}
                value={name}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Approximate home area</Text>
              <TextInput
                accessibilityLabel="Approximate home area"
                maxLength={60}
                onChangeText={setArea}
                style={styles.input}
                value={area}
              />
              <Text style={styles.fieldHint}>
                Only the area is shown. Your exact address is never stored here.
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Interests</Text>
              <TextInput
                accessibilityLabel="Interests"
                maxLength={200}
                multiline
                onChangeText={setInterests}
                style={[styles.input, styles.inputMultiline]}
                value={interests}
              />
              <Text style={styles.fieldHint}>Used to explain why a cast reached you.</Text>
            </View>
          </Group>
        </Section>

        <Section title="Privacy">
          <Group>
            <View style={styles.privacyRow}>
              <SymbolIcon fallback="P" name="person.crop.circle" size={16} />
              <Text style={styles.privacyText}>
                People can see your first name and approximate area.
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.privacyRow}>
              <SymbolIcon fallback="L" name="lock" size={16} />
              <Text style={styles.privacyText}>
                Only accepted respondents can see the exact location.
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.privacyRow}>
              <SymbolIcon fallback="G" name="person.2.badge.key" size={16} />
              <Text style={styles.privacyText}>
                Your originating group and its members remain private.
              </Text>
            </View>
          </Group>
        </Section>

        <Section title="Account">
          <Group>
            <Pressable
              accessibilityHint="Download everything Nearcast holds about you."
              accessibilityLabel="Export your data"
              accessibilityRole="button"
              onPress={() => undefined}
              style={styles.accountRow}>
              <Text style={styles.accountLabel}>Export your data</Text>
              <Text style={styles.accountHint}>Download everything Nearcast holds about you.</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirming(confirming === 'signOut' ? 'none' : 'signOut')}
              style={styles.accountRow}>
              <Text style={styles.accountLabel}>Sign out</Text>
            </Pressable>

            {confirming === 'signOut' ? (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmTitle}>Sign out of Nearcast?</Text>
                <Text style={styles.confirmBody}>
                  Your drafts stay on this device. You will need your invitation to sign back in.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable accessibilityRole="button" onPress={() => setConfirming('none')} style={styles.confirmCancel}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.confirmProceed}>
                    <Text style={styles.confirmProceedText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.divider} />

            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirming(confirming === 'delete' ? 'none' : 'delete')}
              style={styles.accountRow}>
              <Text style={styles.destructiveLabel}>Delete account</Text>
            </Pressable>

            {confirming === 'delete' ? (
              <View style={styles.destructiveBlock}>
                <Text style={styles.destructiveTitle}>Delete your account?</Text>
                <Text style={styles.destructiveBody}>
                  This permanently removes your profile, casts, and messages. It cannot be undone.
                </Text>
                <Text style={styles.destructiveBody}>
                  Export your data first if you want to keep a copy.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable accessibilityRole="button" onPress={() => setConfirming('none')} style={styles.confirmCancel}>
                    <Text style={styles.confirmCancelText}>Keep my account</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => undefined} style={styles.destructiveProceed}>
                    <Text style={styles.destructiveProceedText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Group>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.semantic.color.trustSurface },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: tokens.semantic.color.trustText },
  avatarCopy: { flex: 1, gap: 4 },
  linkAction: { minHeight: 24, fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.actionPrimary },
  fieldRow: { padding: 16, gap: 8 },
  fieldLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, lineHeight: 18, color: tokens.semantic.color.textSecondary },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary, backgroundColor: tokens.semantic.color.backgroundSurface },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  fieldHint: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  fieldError: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.dangerText },
  divider: { height: 1, marginLeft: 16, backgroundColor: tokens.semantic.color.borderDefault },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16 },
  privacyText: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 20, color: tokens.semantic.color.textSecondary },
  accountRow: { minHeight: 56, justifyContent: 'center', gap: 2, padding: 16 },
  accountLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  accountHint: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  destructiveLabel: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.dangerText },
  confirmBlock: { gap: 8, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSubtle },
  confirmTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textPrimary },
  confirmBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.textSecondary },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmCancel: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 12, backgroundColor: tokens.semantic.color.backgroundSurface },
  confirmCancelText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: tokens.semantic.color.textPrimary },
  confirmProceed: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tokens.semantic.color.actionPrimary },
  confirmProceedText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#FFFFFF' },
  destructiveBlock: { gap: 8, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: tokens.semantic.color.dangerText, backgroundColor: tokens.semantic.color.dangerSurface },
  destructiveTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.dangerText },
  destructiveBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.dangerText },
  destructiveProceed: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: tokens.semantic.color.dangerText },
  destructiveProceedText: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: '#FFFFFF' },
  warningBanner: { gap: 6, marginTop: 18, padding: 14, borderRadius: 12, backgroundColor: tokens.semantic.color.warningSurface },
  warningTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.warningText },
  warningBody: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.warningText },
  warningAction: { minHeight: 44, justifyContent: 'center' },
  warningActionText: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: tokens.semantic.color.warningText },
});
