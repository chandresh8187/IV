import React, { useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { PlayCircle, Square } from 'lucide-react-native';
import { changePlantStatusApi, getPlantStatusApi, getPlantStatusHistoryApi } from '../../api/plantStatusApi';
import { COLORS } from '../../assets/Colors';
import { formatDisplayDateTime } from '../../utils/format';
import { hasPermission } from '../../utils/permissions';

const displayDuration = minutes => {
  const total = Math.max(0, Number(minutes) || 0);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  return [days && `${days}d`, hours && `${hours}h`, `${total % 60}m`].filter(Boolean).join(' ');
};

export default function PlantControlScreen() {
  const user = useSelector(state => state.auth.user);
  const canControl = hasPermission(user, 'production.status');
  const client = useQueryClient();
  const statusQuery = useQuery({ queryKey: ['plant-status'], queryFn: getPlantStatusApi });
  const historyQuery = useQuery({ queryKey: ['plant-status-history'], queryFn: getPlantStatusHistoryApi });
  const [reason, setReason] = useState('');
  const [eventTime, setEventTime] = useState(new Date());
  const [timeEdited, setTimeEdited] = useState(false);
  const [picker, setPicker] = useState(null);
  const status = statusQuery.data?.data;
  const stopped = status?.status !== 'running';
  const change = useMutation({
    mutationFn: changePlantStatusApi,
    onSuccess: async response => {
      setReason(''); setEventTime(new Date()); setTimeEdited(false);
      await Promise.all(['plant-status', 'plant-status-history', 'shift-status', 'dashboard'].map(key => client.invalidateQueries({ queryKey: [key] })));
      Alert.alert('Production status', response?.message || 'Status updated.');
    },
    onError: error => Alert.alert('Could not change status', error?.response?.data?.message || 'Please try again.'),
  });
  const save = () => {
    if (!stopped && !reason.trim()) return Alert.alert('Reason required', 'Enter why production stopped.');
    const effectiveTime = timeEdited ? eventTime : new Date();
    Alert.alert(stopped ? 'Resume production?' : 'Stop production?', `Recorded time: ${moment(effectiveTime).format('DD/MM/YYYY, hh:mm A')}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => change.mutate({ status: stopped ? 'running' : 'stopped', message: stopped ? null : reason.trim(), occurred_at: moment(effectiveTime).format('YYYY-MM-DD HH:mm:ss') }) },
    ]);
  };
  const onPickerChange = (event, value) => {
    if (event.type !== 'set' || !value) return setPicker(null);
    const next = new Date(eventTime);
    if (picker === 'date') { next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate()); setEventTime(next); setTimeEdited(true); setPicker('time'); }
    else { next.setHours(value.getHours(), value.getMinutes(), 0, 0); setEventTime(next); setTimeEdited(true); setPicker(null); }
  };
  const refresh = () => Promise.all([statusQuery.refetch(), historyQuery.refetch()]);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={statusQuery.isRefetching || historyQuery.isRefetching} onRefresh={refresh} />}>
    <Text style={styles.title}>Production status</Text>
    <Text style={styles.help}>Production continues across shifts until a stop is recorded.</Text>
    {statusQuery.isLoading ? <ActivityIndicator color={COLORS.primary} /> : <View style={[styles.card, stopped && styles.stopped]}>
      <View style={styles.row}>{stopped ? <Square color={COLORS.danger} /> : <PlayCircle color={COLORS.success} />}<Text style={styles.status}>{stopped ? 'STOPPED' : 'RUNNING'}</Text></View>
      <Text style={styles.help}>{stopped ? status?.message || 'Production is paused.' : 'Production is running.'}</Text>
      <Text style={styles.help}>Since {formatDisplayDateTime(status?.started_at || status?.updated_at)}</Text>
    </View>}
    {canControl && <View style={styles.card}>
      <Text style={styles.heading}>{stopped ? 'Resume production' : 'Stop production'}</Text>
      {!stopped && <TextInput mode="outlined" label="Reason for stop" value={reason} onChangeText={setReason} multiline />}
      <Text style={styles.help}>Uses the current time unless you choose an earlier actual time.</Text>
      <TouchableOpacity style={styles.timeButton} onPress={() => { if (!timeEdited) setEventTime(new Date()); setPicker('date'); }}><Text style={styles.timeText}>{stopped ? 'Resume' : 'Stop'} time: {timeEdited ? moment(eventTime).format('DD/MM/YYYY, hh:mm A') : 'Current time (tap to change)'}</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.action, stopped ? styles.resume : styles.stop]} disabled={change.isPending} onPress={save}><Text style={styles.actionText}>{change.isPending ? 'Saving…' : stopped ? 'Resume production' : 'Stop production'}</Text></TouchableOpacity>
    </View>}
    <Text style={styles.heading}>Production stop records</Text>
    <Text style={styles.help}>These intervals help review downtime, holidays and gas-bottle active time.</Text>
    {(historyQuery.data?.data || []).map(record => <View key={record.id} style={styles.card}>
      <Text style={styles.recordReason}>{record.message || record.title || 'Production stopped'}{record.status === 'maintenance' ? ' (earlier maintenance record)' : ''}</Text>
      <Text style={styles.help}>Stopped: {formatDisplayDateTime(record.started_at)} · {record.started_by_name || 'System'}</Text>
      <Text style={styles.help}>Resumed: {record.ended_at ? formatDisplayDateTime(record.ended_at) : 'Still stopped'}{record.ended_by_name ? ` · ${record.ended_by_name}` : ''}</Text>
      <Text style={styles.help}>Duration: {displayDuration(record.duration_minutes)}</Text>
      <Text style={styles.help}>Recorded at: {formatDisplayDateTime(record.created_at)}</Text>
    </View>)}
    {historyQuery.isLoading && <ActivityIndicator color={COLORS.primary} />}
    {picker && <DateTimePicker value={eventTime} mode={picker} is24Hour={false} maximumDate={new Date()} onChange={onPickerChange} />}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 23, fontWeight: '800', color: COLORS.text }, heading: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  help: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  card: { padding: 16, backgroundColor: COLORS.white, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  stopped: { borderColor: COLORS.danger }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, status: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  timeButton: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }, timeText: { color: COLORS.primary, fontWeight: '700' },
  action: { padding: 14, borderRadius: 8, alignItems: 'center' }, stop: { backgroundColor: COLORS.danger }, resume: { backgroundColor: COLORS.success }, actionText: { color: COLORS.white, fontWeight: '800' },
  recordReason: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
});
