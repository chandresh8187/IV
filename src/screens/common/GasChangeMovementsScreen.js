import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import { getGasDashboardApi } from '../../api/gasManagementApi';
import { downloadGasReport } from '../../utils/serverGasReport';

const duration = (start, finish) => { if (!finish) return 'Running'; const minutes = Math.max(0, (new Date(finish) - new Date(start)) / 60000); return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`; };
export default function GasChangeMovementsScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canReport = hasPermission(user, 'gas.report');
  const client = useQueryClient(); const query = useQuery({ queryKey: ['gas-management'], queryFn: getGasDashboardApi });
  useEffect(() => { const refresh = () => client.invalidateQueries({ queryKey: ['gas-management'] }); socket.on('gas_management_updated', refresh); return () => socket.off('gas_management_updated', refresh); }, [client]);
  if (query.isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  const runs = query.data?.data?.runs || [];
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>Gas Change Movements</Text><Text style={styles.muted}>Bottle finish time, running duration, production, and the next started bottle.</Text>{canReport && <TouchableOpacity style={styles.button} onPress={async () => { if (!canReport) return; try { navigation.navigate('PdfViewer', { ...(await downloadGasReport()), title: 'Gas Bottle Report' }); } catch (error) { Alert.alert('Could not generate PDF', error.message); } }}><Text style={styles.buttonText}>Generate PDF report</Text></TouchableOpacity>}{runs.map(run => <View style={styles.card} key={run.id}><Text style={styles.heading}>GAS-{run.position_no || '-'} · {run.finished_at ? 'Finished' : 'Running'}</Text><Text style={styles.muted}>Started: {run.started_at}</Text><Text style={styles.muted}>Finished: {run.finished_at || 'Running'}</Text><Text style={styles.muted}>Running time: {duration(run.started_at, run.finished_at)}</Text><Text style={styles.muted}>Filled weight: {run.filled_weight_kg == null ? "-" : `${run.filled_weight_kg} kg`}</Text><Text style={styles.muted}>Empty weight: {run.empty_weight_kg == null ? "-" : `${run.empty_weight_kg} kg`}</Text><Text style={styles.muted}>Production: {run.production_ton == null ? '-' : `${run.production_ton} ton`}</Text><Text style={styles.muted}>Gas used: {run.consumed_gas_kg == null ? '-' : `${run.consumed_gas_kg} kg`}</Text><Text style={styles.muted}>Gas kg/ton: {run.gas_kg_per_ton == null ? "-" : run.gas_kg_per_ton}</Text></View>)}{!runs.length && <Text style={styles.muted}>No gas change movements recorded yet.</Text>}</ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 14, paddingBottom: 80 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 26, fontWeight: '800', color: COLORS.text }, heading: { fontSize: 17, fontWeight: '700', color: COLORS.text }, muted: { color: COLORS.muted, lineHeight: 20 }, button: { backgroundColor: COLORS.accent, padding: 14, borderRadius: UI.radiusSmall }, buttonText: { color: COLORS.white, fontWeight: '700' }, card: { backgroundColor: COLORS.white, padding: 16, gap: 7, borderRadius: UI.radius } });
