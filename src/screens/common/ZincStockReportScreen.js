import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getZincMovementsApi } from '../../api/zincStockApi';
import ZincTransactionCard from '../../components/ZincTransactionCard';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { downloadZincStockReport } from '../../utils/serverZincStockReport';

export default function ZincStockReportScreen({ navigation }) {
  const [generating, setGenerating] = useState(false);
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const [page, setPage] = useState(1);
  const transactions = useQuery({ queryKey: ['zinc-stock-movements', page], queryFn: () => getZincMovementsApi({ page }), enabled: canView });
  const refetch = transactions.refetch;
  useFocusEffect(useCallback(() => { if (canView) refetch(); }, [canView, refetch]));
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

  if (!canView) return <View style={styles.page}><Text>You do not have zinc stock access.</Text></View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><View style={styles.card}>
    <Text style={styles.title}>Zinc Transactions</Text>
    <Text style={styles.muted}>Production usage is grouped by operating date and shift, with corrections and returns included. Each usage shows the receipt batches and invoice numbers consumed, oldest first (FIFO).</Text>
    {canGeneratePdf ? <TouchableOpacity accessibilityRole="button" style={[styles.button, generating && styles.disabled]} disabled={generating} onPress={generatePdf}>{generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate PDF Report</Text>}</TouchableOpacity> : <Text style={styles.error}>You do not have permission to generate this report.</Text>}
  </View>
    {transactions.isLoading ? <ActivityIndicator color={COLORS.primary} /> : transactions.isError ? <View style={styles.card}><Text style={styles.error}>Could not load transactions.</Text><TouchableOpacity onPress={() => refetch()}><Text>Retry</Text></TouchableOpacity></View> : <>
      {(transactions.data?.data || []).map(row => <ZincTransactionCard key={row.id} row={row} />)}
      {!transactions.data?.data?.length ? <Text style={styles.muted}>No transactions found.</Text> : null}
      <View style={styles.pagination}><TouchableOpacity disabled={page === 1} onPress={() => setPage(value => value - 1)} style={[styles.button, styles.pageButton, page === 1 && styles.disabled]}><Text style={styles.buttonText}>Previous</Text></TouchableOpacity><Text>Page {page}</Text><TouchableOpacity disabled={!transactions.data?.pagination?.has_more} onPress={() => setPage(value => value + 1)} style={[styles.button, styles.pageButton, !transactions.data?.pagination?.has_more && styles.disabled]}><Text style={styles.buttonText}>Next</Text></TouchableOpacity></View>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, paddingBottom: 60, gap: 14, alignItems: 'center' },
  heading: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  pagination: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pageButton: { paddingHorizontal: 18 },
  card: { width: '100%', maxWidth: 900, backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 22, gap: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 50, borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700' }, error: { color: COLORS.danger, lineHeight: 20 }, disabled: { opacity: 0.6 },
});
