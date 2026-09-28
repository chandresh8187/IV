import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { downloadZincStockReport } from '../../utils/serverZincStockReport';

export default function ZincStockReportScreen({ navigation }) {
  const [generating, setGenerating] = useState(false);
  const user = useSelector(state => state.auth.user);
  const canGeneratePdf = hasPermission(user, 'zinc_stock.report');

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const pdf = await downloadZincStockReport();
      navigation.navigate('PdfViewer', { ...pdf, title: 'Zinc Stock Transactions' });
    } catch (error) {
      Alert.alert('Could not generate PDF', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return <View style={styles.page}><View style={styles.card}>
    <Text style={styles.title}>Zinc Transactions PDF</Text>
    <Text style={styles.muted}>Generate a complete report explaining every receipt, plant-to-kettle transfer, production use, restoration, and stock correction.</Text>
    {canGeneratePdf ? <TouchableOpacity accessibilityRole="button" style={[styles.button, generating && styles.disabled]} disabled={generating} onPress={generatePdf}>{generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate PDF Report</Text>}</TouchableOpacity> : <Text style={styles.error}>You do not have permission to generate this report.</Text>}
  </View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg, padding: 18, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 520, backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 22, gap: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 50, borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700' }, error: { color: COLORS.danger, lineHeight: 20 }, disabled: { opacity: 0.6 },
});
