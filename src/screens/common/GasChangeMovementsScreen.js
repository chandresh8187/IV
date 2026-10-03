import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import { getGasDashboardApi } from '../../api/gasManagementApi';
import { downloadGasReport } from '../../utils/serverGasReport';
import { formatDisplayDateTime } from '../../utils/format';

const plantDateTime = value => {
  if (!value) return 'Running';
  return formatDisplayDateTime(value);
};

const duration = (start, finish) => {
  if (!finish) return 'Running';
  const seconds = Math.max(0, Math.floor((new Date(finish) - new Date(start)) / 1000));
  if (!Number.isFinite(seconds)) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds % 60}s`;
};
const secondsDuration = seconds => {
  if (seconds == null) return '-';
  const value = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m ${value % 60}s`;
};

const nextBottle = run => {
  if (!run.finished_at || !run.note) return '-';
  const number = String(run.note).match(/bottle (\d+) started/i)?.[1];
  return number ? `GAS-${number}` : '-';
};

export default function GasChangeMovementsScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canReport = hasPermission(user, 'gas.report');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['gas-management'], queryFn: getGasDashboardApi });

  useEffect(() => {
    const refresh = () => client.invalidateQueries({ queryKey: ['gas-management'] });
    socket.on('gas_management_updated', refresh);
    return () => socket.off('gas_management_updated', refresh);
  }, [client]);

  if (query.isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  const runs = query.data?.data?.runs || [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Gas Change Movements</Text>
      <Text style={styles.muted}>Bottle finish time, running duration, production, and the next started bottle.</Text>
      {canReport && <TouchableOpacity style={styles.button} onPress={async () => {
        try {
          navigation.navigate('PdfViewer', { ...(await downloadGasReport()), title: 'Gas Stock Report' });
        } catch (error) {
          Alert.alert('Could not generate PDF', error.message);
        }
      }}><Text style={styles.buttonText}>Generate PDF report</Text></TouchableOpacity>}
      {query.isError && <TouchableOpacity style={styles.card} onPress={() => query.refetch()}><Text style={styles.muted}>Could not load gas movements. Tap to retry.</Text></TouchableOpacity>}
      {runs.map(run => (
        <View style={styles.card} key={run.id}>
          <Text style={styles.heading}>GAS-{run.position_no || '-'} · {run.finished_at ? run.end_reason === 'paused' ? 'Paused' : 'Finished' : 'Running'}</Text>
          <Text style={styles.muted}>Started: {plantDateTime(run.started_at)}</Text>
          <Text style={styles.muted}>Ended: {plantDateTime(run.finished_at)}</Text>
          <Text style={styles.muted}>Bottle connected time: {run.elapsed_seconds == null ? duration(run.started_at, run.finished_at) : secondsDuration(run.elapsed_seconds)}</Text>
          <Text style={styles.muted}>Production stopped time: {secondsDuration(run.stopped_seconds)}</Text>
          <Text style={styles.muted}>Production-active time: {secondsDuration(run.production_active_seconds)}</Text>
          <Text style={styles.muted}>Filled weight: {run.filled_weight_kg == null ? '-' : `${run.filled_weight_kg} kg`}</Text>
          <Text style={styles.muted}>Empty weight: {run.empty_weight_kg == null ? run.finished_at && run.consumed_gas_kg == null ? 'Pending' : '-' : `${run.empty_weight_kg} kg`}</Text>
          <Text style={styles.muted}>Production: {run.production_ton == null ? '-' : `${run.production_ton} ton`}</Text>
          <Text style={styles.muted}>Gas used: {run.consumed_gas_kg == null ? run.finished_at ? 'Pending' : '-' : `${run.consumed_gas_kg} kg`}</Text>
          <Text style={styles.muted}>Gas kg/ton: {run.gas_kg_per_ton == null ? '-' : run.gas_kg_per_ton}</Text>
          <Text style={styles.muted}>Next bottle: {nextBottle(run)}</Text>
        </View>
      ))}
      {!runs.length && !query.isError && <Text style={styles.muted}>No gas change movements recorded yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 14, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  heading: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  muted: { color: COLORS.muted, lineHeight: 20 },
  button: { backgroundColor: COLORS.accent, padding: 14, borderRadius: UI.radiusSmall },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  card: { backgroundColor: COLORS.white, padding: 16, gap: 7, borderRadius: UI.radius },
});
