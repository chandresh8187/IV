import React, { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getZincByproductsApi } from '../../api/zincStockApi';
import { downloadZincByproductReport } from '../../utils/serverZincStockReport';
import { hasPermission } from '../../utils/permissions';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/format';

const kg = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AshDrossReportScreen({ navigation }) {
  const [generating, setGenerating] = useState(false);
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canReport = hasPermission(user, 'zinc_stock.report');
  const { contentMaxWidth } = useResponsive();
  const query = useQuery({ queryKey: ['zinc-byproducts'], queryFn: () => getZincByproductsApi(), enabled: canView });
  const summary = query.data?.summary || {};
  const generate = async () => {
    setGenerating(true);
    try {
      const pdf = await downloadZincByproductReport();
      navigation.navigate('PdfViewer', { ...pdf, title: 'Ash & Dross Report' });
    } catch (error) {
      Alert.alert('Could not generate PDF', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally { setGenerating(false); }
  };
  if (!canView) return <View style={styles.center}><Text style={styles.muted}>You do not have zinc stock access.</Text></View>;
  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      <Text style={styles.title}>Ash & Dross Transactions</Text>
      <View style={styles.summary}>
        <View><Text style={styles.value}>{kg(summary.ash_weight_kg)} kg</Text><Text style={styles.muted}>Total ash</Text></View>
        <View><Text style={styles.value}>{kg(summary.dross_weight_kg)} kg</Text><Text style={styles.muted}>Total dross</Text></View>
        <View><Text style={styles.value}>{kg(summary.recovered_zinc_kg)} kg</Text><Text style={styles.muted}>Recovered zinc</Text></View>
        <View><Text style={styles.value}>₹{money(summary.total_with_gst)}</Text><Text style={styles.muted}>Value with GST</Text></View>
      </View>
      {canReport && <TouchableOpacity style={styles.button} disabled={generating || query.isLoading} onPress={generate}>
        {generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate PDF Report</Text>}
      </TouchableOpacity>}
      {query.isLoading ? <ActivityIndicator color={COLORS.accent} /> : query.isError ? (
        <TouchableOpacity style={styles.card} onPress={query.refetch}><Text style={styles.error}>Could not load transactions. Tap to retry.</Text></TouchableOpacity>
      ) : (query.data?.data || []).length ? query.data.data.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={styles.row}><Text style={styles.heading}>{formatDisplayDate(item.transaction_date)}</Text><Text style={styles.heading}>{kg(item.recovered_zinc_kg)} kg recovered</Text></View>
          <Text style={styles.muted}>Ash: {kg(item.ash_weight_kg)} kg × ₹{money(item.ash_rate)} = ₹{money(Number(item.ash_base_amount) + Number(item.ash_gst_amount))} with GST</Text>
          <Text style={styles.muted}>Dross: {kg(item.dross_weight_kg)} kg × ₹{money(item.dross_rate)} = ₹{money(Number(item.dross_base_amount) + Number(item.dross_gst_amount))} with GST</Text>
          <Text style={styles.heading}>Total ₹{money(item.total_with_gst)} · Zinc rate ₹{money(item.zinc_rate_snapshot)}/kg</Text>
          <Text style={styles.muted}>
            {item.actor_name || 'User'} · {formatDisplayDateTime(item.created_at)}
          </Text>
          {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
        </View>
      )) : <View style={styles.card}><Text style={styles.muted}>No ash or dross transactions recorded.</Text></View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16 },
  value: { color: COLORS.text, fontSize: 18, fontWeight: '700' }, muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16, gap: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  heading: { color: COLORS.text, fontSize: 14, fontWeight: '700', flexShrink: 1 }, note: { color: COLORS.text, fontSize: 13 }, error: { color: COLORS.danger },
  button: { alignSelf: 'flex-start', minHeight: 46, paddingHorizontal: 18, borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary, justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700' },
});
