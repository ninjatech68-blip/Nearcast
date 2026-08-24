import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/design-system/tokens';

export default function PreviewIntentScreen() {
  const { primitive = 'request', statement = '' } = useLocalSearchParams<{ primitive?: string; statement?: string }>();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>PRIVATE DRAFT</Text>
      <View style={styles.card}>
        <View style={styles.metaRow}>
          <Text style={styles.primitive}>{primitive.toUpperCase()}</Text>
          <Text style={styles.expiry}>Expires in 24 hours</Text>
        </View>
        <Text style={styles.statement}>{statement}</Text>
        <View style={styles.provenance}>
          <Text style={styles.provenanceTitle}>Origin only</Text>
          <Text style={styles.provenanceBody}>No one can see this until you publish. Reach will never expand automatically.</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Before publishing</Text>
      <Text style={styles.body}>Phase 1 adds structured details, expiry selection, privacy review, and the genuine-confirmation share link. This preview intentionally does not publish incomplete data.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, backgroundColor: tokens.semantic.color.backgroundCanvas, flexGrow: 1 },
  label: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.3, color: tokens.semantic.color.textMuted },
  card: { marginTop: 12, padding: 18, borderRadius: tokens.component.intentCard.radius, borderWidth: 1, borderColor: tokens.component.intentCard.border, backgroundColor: tokens.component.intentCard.background },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  primitive: { fontFamily: 'Manrope_700Bold', fontSize: 12, color: tokens.semantic.color.actionPrimary },
  expiry: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: tokens.semantic.color.warningText },
  statement: { marginTop: 18, fontFamily: 'Manrope_600SemiBold', fontSize: 21, lineHeight: 29, color: tokens.semantic.color.textPrimary },
  provenance: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: tokens.semantic.color.trustSurface },
  provenanceTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: tokens.semantic.color.trustText },
  provenanceBody: { marginTop: 3, fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, color: tokens.semantic.color.trustText },
  sectionTitle: { marginTop: 28, fontFamily: 'Manrope_700Bold', fontSize: 17, color: tokens.semantic.color.textPrimary },
  body: { marginTop: 8, fontFamily: 'Manrope_400Regular', fontSize: 15, lineHeight: 23, color: tokens.semantic.color.textSecondary },
});
