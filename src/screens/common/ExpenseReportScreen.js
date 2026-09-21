import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getExpenseReportApi } from '../../api/expenseReportApi';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { downloadExpenseReport } from '../../utils/serverExpenseReport';

const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = value => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const monthTitle = month => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const EXPENSES = [
  ['salary_per_day', 'Salary per day'], ['hardware_per_day', 'Hardware expense per day'], ['maintenance_per_day', 'Maintenance per day'],
  ['zinc_spray_per_day', 'Zinc spray per day'], ['electricity_per_day', 'Electricity bill per day'], ['gas_per_day', 'Gas expense per day'],
  ['chemicals_per_day', 'Chemicals per day'], ['ms_wire_per_day', 'MS wire per day'], ['rent_expense', 'Rent expense'],
  ['acid_expense', 'Acid expense'], ['crane_expense', 'Crane expense'], ['other_expense', 'Other expense'],
];

export default function ExpenseReportScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'expense_report.view');
  const canSettings = hasPermission(user, 'expense_report.settings');
  const canReport = hasPermission(user, 'expense_report.report');
  const { contentMaxWidth } = useResponsive();
  const month = currentMonth();
  const [generating, setGenerating] = useState(false);
  const query = useQuery({ queryKey: ['expense-report', month], queryFn: () => getExpenseReportApi({ month }), enabled: canView, retry: false });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => { if (canView) refetch(); }, [canView, refetch]));
  const report = query.data?.data; const totals = report?.totals || {};
  const generate = async () => {
    setGenerating(true);
    try { const pdf = await downloadExpenseReport(month); navigation.navigate('PdfViewer', { ...pdf, title: `Expense Report · ${monthTitle(month)}` }); }
    catch (error) { Alert.alert('Could not generate PDF', error?.response?.data?.message || error?.message || 'Please try again.'); }
    finally { setGenerating(false); }
  };
  if (!canView) return <View style={styles.center}><Text style={styles.muted}>You do not have expense report access.</Text></View>;
  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={refetch} />}>
    <View style={styles.header}><View><Text style={styles.title}>Expense Report</Text><Text style={styles.muted}>{monthTitle(month)} · Current month</Text></View>{canSettings && <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('ExpenseSettings')}><Text style={styles.buttonText}>Settings</Text></TouchableOpacity>}</View>
    {query.isLoading ? <ActivityIndicator color={COLORS.accent} /> : query.isError ? <TouchableOpacity style={styles.card} onPress={refetch}><Text style={styles.error}>{query.error?.response?.data?.message || 'Could not load expense report. Tap to retry.'}</Text></TouchableOpacity> : <>
      <View style={styles.hero}><Text style={styles.heroLabel}>RUNNING PLANT COST</Text><Text style={styles.heroValue}>₹{money(totals.running_plant_cost)}</Text><Text style={styles.heroUnit}>per kg · based on average daily production</Text></View>
      <View style={styles.metricGrid}>
        <Metric label="Total daily expense" value={`₹${money(totals.total_expense)}`} />
        <Metric label="Plant zinc stock" value={`${number(totals.plant_zinc_stock_kg)} kg`} />
        <Metric label="Purchased zinc this month" value={`${number(totals.purchased_zinc_kg)} kg`} />
        <Metric label="Monthly MS production" value={`${number(Number(totals.total_ms_production_kg) / 1000)} ton`} />
        <Metric label="Average production per day" value={`${number(Number(totals.average_ms_production_per_day_kg) / 1000)} ton`} detail={`${totals.production_days || 0} production days`} />
        <Metric label="Average zinc consumption" value={`${number(totals.average_zinc_consumption_percent)}%`} detail={`${number(totals.net_zinc_consumed_kg)} kg net zinc`} />
      </View>
      <View style={styles.card}><Text style={styles.sectionTitle}>All expenses</Text>{EXPENSES.map(([key, label]) => <View key={key} style={styles.expenseRow}><Text style={styles.expenseLabel}>{label}</Text><Text style={styles.expenseValue}>₹{money(report.expenses?.[key])}</Text></View>)}<View style={[styles.expenseRow, styles.totalRow]}><Text style={styles.totalLabel}>Total expense</Text><Text style={styles.totalValue}>₹{money(totals.total_expense)}</Text></View></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Zinc consumption details</Text><Text style={styles.muted}>Gross consumption: {number(totals.gross_zinc_consumed_kg)} kg</Text><Text style={styles.muted}>Ash & dross recovery: {number(totals.recovered_zinc_kg)} kg</Text><Text style={styles.value}>Net consumption: {number(totals.net_zinc_consumed_kg)} kg</Text></View>
      {canReport && <TouchableOpacity style={styles.pdfButton} disabled={generating} onPress={generate}>{generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate PDF Report</Text>}</TouchableOpacity>}
    </>}
  </ScrollView>;
}

function Metric({ label, value, detail }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 16, paddingBottom: 60 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, title: { color: COLORS.text, fontSize: 25, fontWeight: '700' }, muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  settingsButton: { backgroundColor: COLORS.primary, borderRadius: UI.radiusSmall, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' }, buttonText: { color: COLORS.white, fontWeight: '700' },
  hero: { backgroundColor: COLORS.primary, borderRadius: UI.radiusLarge, padding: 24, minHeight: 150, justifyContent: 'center', ...UI.shadow }, heroLabel: { color: COLORS.onHero, fontWeight: '700', fontSize: 13, letterSpacing: 1 }, heroValue: { color: COLORS.white, fontSize: 40, lineHeight: 50, fontWeight: '800' }, heroUnit: { color: COLORS.onHero, fontSize: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, metric: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16, minHeight: 108, flexGrow: 1, flexBasis: 155, borderWidth: 1, borderColor: COLORS.border }, metricLabel: { color: COLORS.muted, fontSize: 12, lineHeight: 17 }, metricValue: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 8 }, metricDetail: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 18, gap: 10, ...UI.shadow }, sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 4 }, expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }, expenseLabel: { color: COLORS.muted, fontSize: 13, flex: 1 }, expenseValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' }, totalRow: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: COLORS.primary, marginTop: 5, paddingTop: 14 }, totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '800' }, totalValue: { color: COLORS.primary, fontSize: 19, fontWeight: '800' }, value: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  pdfButton: { backgroundColor: COLORS.accent, minHeight: 50, borderRadius: UI.radiusSmall, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, error: { color: COLORS.danger, lineHeight: 20 },
});
