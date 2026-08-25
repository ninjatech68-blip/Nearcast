import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '@/design-system/tokens';

export default function YouScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.largeTitle}>You</Text>
        <View style={styles.group}>
          <Text style={styles.title}>Profile is not set up yet</Text>
          <Text style={styles.body}>Your profile, preferences, privacy controls, and safety settings will appear here as we build the account flow.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.semantic.color.backgroundCanvas },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  largeTitle: { fontFamily: 'Manrope_700Bold', fontSize: 34, lineHeight: 41, color: tokens.semantic.color.textPrimary },
  group: { marginTop: 24, padding: 16, borderWidth: 1, borderColor: tokens.semantic.color.borderDefault, borderRadius: 14, backgroundColor: tokens.semantic.color.backgroundSurface },
  title: { fontFamily: 'Manrope_600SemiBold', fontSize: 17, lineHeight: 23, color: tokens.semantic.color.textPrimary },
  body: { marginTop: 6, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 21, color: tokens.semantic.color.textSecondary },
});
