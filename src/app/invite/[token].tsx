import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';
import { InviteForm } from '@/features/auth/ui/invite-form';
import { useSession } from '@/features/auth/ui/session-provider';

/**
 * Invitation deep link. The code arrives prefilled, but redemption still
 * requires a signed-in identity, so an anonymous visitor is sent to sign-in by
 * the membership redirect and returns here afterwards.
 */
export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { membership, refresh } = useSession();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>You have been invited</Text>

        {membership === 'signed_out' ? (
          <Text style={styles.body}>
            Sign in first, then this invitation will be waiting for you.
          </Text>
        ) : (
          <>
            <Text style={styles.body}>
              Confirm the code and choose the name others will see.
            </Text>
            <InviteForm initialToken={token ?? ''} onRedeemed={refresh} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: {
    gap: tokens.primitive.space[4],
    paddingHorizontal: tokens.primitive.space[5],
    paddingTop: tokens.primitive.space[8],
    paddingBottom: tokens.primitive.space[6],
  },
  title: {
    color: tokens.semantic.color.textPrimary,
    fontFamily: 'Manrope_700Bold',
    fontSize: tokens.typography.title1.fontSize,
    lineHeight: tokens.typography.title1.lineHeight,
  },
  body: {
    color: tokens.semantic.color.textSecondary,
    fontFamily: 'Manrope_400Regular',
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
  },
});
