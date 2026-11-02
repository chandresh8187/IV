import React, { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getMonthlyReportApi } from '../../api/monthlyReportApi';
import { downloadMonthlyDetailReport } from '../../utils/serverMonthlyReport';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { COLORS, UI } from '../../assets/Colors';
import ZincTransactionCard from '../../components/ZincTransactionCard';

const TITLES = { purchases: 'Zinc Purchase', zinc: 'Zinc Transactions', planning: 'Plannings', materials: 'Material Productions' };
const num = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default function MonthlyReportDetailScreen({ route, navigation }) {
  const { type, month, financial_year_id: yearId } = route.params || {};
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'monthly_reports.view');
  const canPdf = hasPermission(user, 'monthly_reports.report');
  const valid = Object.prototype.hasOwnProperty.call(TITLES, type) && Number.isInteger(month) && month >= 1 && month <= 12 && Number(yearId) > 0;
  const { contentMaxWidth } = useResponsive();
  const [generating, setGenerating] = useState(false);
  const query = useQuery({ queryKey: ['monthly-report', yearId, month], queryFn: () => getMonthlyReportApi({ month, financial_year_id: yearId }), enabled: canView && valid, retry: false });
  const report = query.data?.data;
  const generate = async () => {
    setGenerating(true);
    try {
      const pdf = await downloadMonthlyDetailReport(type, { month, financial_year_id: yearId });
      navigation.navigate('PdfViewer', { ...pdf, title: `${TITLES[type]} · ${report.period.label}` });
    } catch (error) { Alert.alert('Could not generate PDF', error?.response?.data?.message || error?.message || 'Please try again.'); }
    finally { setGenerating(false); }
  };
  if (!canView || !valid) return <View style={styles.center}><Text style={styles.muted}>{!canView ? 'You do not have monthly reports access.' : 'Select a list from Monthly Reports.'}</Text></View>;
  const rows = type === 'purchases' ? report?.zinc_purchases || [] : type === 'zinc' ? report?.zinc_movements || [] : type === 'planning' ? report?.planning || [] : report?.materials || [];
  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
    <Text style={styles.title}>{TITLES[type]}</Text>
    {report && <Text style={styles.muted}>{report.period.label} · Financial year {report.financial_year.name}</Text>}
    {type === 'zinc' && report && <TouchableOpacity style={styles.button} onPress={() => navigation.push('MonthlyReportDetail', { type: 'purchases', month, financial_year_id: yearId })}><Text style={styles.buttonText}>Zinc Purchase</Text></TouchableOpacity>}
    {type === 'purchases' && report && hasPermission(user, 'zinc_stock.view') && <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ZincStock', { tab: 'purchases', month: report.period.from.slice(0,7) })}><Text style={styles.buttonText}>Manage Zinc Purchases</Text></TouchableOpacity>}
    {canPdf && <TouchableOpacity accessibilityRole="button" style={styles.button} disabled={!report || generating || query.isFetching} onPress={generate}>{generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate {TITLES[type]} PDF</Text>}</TouchableOpacity>}
    {query.isLoading ? <ActivityIndicator color={COLORS.accent} /> : query.isError ? <TouchableOpacity style={styles.card} onPress={query.refetch}><Text style={styles.error}>{query.error?.response?.data?.message || 'Could not load this list. Tap to retry.'}</Text></TouchableOpacity> : rows.length ? rows.map((row, index) => ['zinc', 'purchases'].includes(type)
      ? <ZincTransactionCard key={row.id} row={row} />
      : type === 'planning' ? <View key={row.id} style={styles.card}>
        <Text style={styles.heading}>{row.challan_no || 'Challan'} · {row.party_name || '—'}</Text><Text style={styles.muted}>{row.material_description}</Text>
        <Text style={styles.heading}>{num(row.produced_qty)} / {num(row.planned_qty)} NOS produced</Text><Text style={styles.muted}>Status: {row.status || '—'}</Text>
      </View> : <View key={`${row.material}-${index}`} style={styles.card}>
        <Text style={styles.heading}>{row.material || 'Unspecified'}</Text><Text style={styles.muted}>{num(row.entry_count)} entries · {num(row.quantity)} NOS</Text>
        <Text style={styles.heading}>MS: {num(row.ms_kg)} kg · GI: {num(row.gi_kg)} kg</Text>
      </View>) : <View style={styles.card}><Text style={styles.muted}>No records for this month.</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 14, paddingBottom: 50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800' }, heading: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 }, error: { color: COLORS.danger },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 18, gap: 8 },
  button: { minHeight: 48, backgroundColor: COLORS.accent, borderRadius: UI.radiusSmall, padding: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700' },
});
