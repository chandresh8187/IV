import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Plus, Pencil, Trash2, X, LogOut, Settings } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { getLabourWeightsApi, getArchivedLabourWeightsApi, deleteLabourWeightApi, getLabourWeightModeApi, setLabourWeightModeApi, saveLabourWeightApi, toggleLabourTimerApi } from '../../api/labourWeightsApi';
import { hasPermission } from '../../utils/permissions';
import { formatDateForApi, formatDisplayDate, formatDisplayDateTime, parseDateForPicker } from '../../utils/format';
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import { logoutApi } from '../../api/authApi';
import { clearAuth } from '../../redux/slices/authSlice';

const TIMERS = [['pickling', 'Pickling'], ['flux', 'Flux'], ['hot_drier', 'Hot drier'], ['zinc_kettle', 'Zinc kettle']];
const MODES = [['manual', 'Manual weight'], ['auto', 'Auto weight'], ['selection', 'Selection weight']];
const formatDuration = value => {
  if (value == null) return '—';
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours && `${hours}h`, minutes && `${minutes}m`, `${seconds % 60}s`].filter(Boolean).join(' ');
};

export default function LabourWeightsScreen() {
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const client = useQueryClient();
  const role = String(user?.role || '').trim().toLowerCase();
  const canAdd = hasPermission(user, 'labour_weights.create');
  const canEdit = hasPermission(user, 'labour_weights.edit') && ['supervisor', 'superadmin'].includes(role);
  const canDelete = hasPermission(user, 'labour_weights.delete');
  const canViewPast = ['superadmin', 'plant_manager'].includes(role);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDate, setArchiveDate] = useState(() => formatDateForApi(new Date()));
  const [archiveShift, setArchiveShift] = useState('day');
  const [archive, setArchive] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const openArchiveDatePicker = () => {
    setArchiveOpen(false);
    setTimeout(() => {
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: parseDateForPicker(archiveDate),
          mode: 'date',
          maximumDate: new Date(),
          onChange: (event, selectedDate) => {
            if (event.type === 'set' && selectedDate) setArchiveDate(formatDateForApi(selectedDate));
            setTimeout(() => setArchiveOpen(true), 250);
          },
        });
      } else {
        setPickerDate(parseDateForPicker(archiveDate));
        setDatePickerOpen(true);
      }
    }, 400);
  };
  const [editing, setEditing] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [ms, setMs] = useState('');
  const [qty, setQty] = useState('');
  const [weightStatus, setWeightStatus] = useState('pending');
  const [error, setError] = useState('');
  const [timerBusy, setTimerBusy] = useState('');
  const [now, setNow] = useState(Date.now());
  const query = useQuery({ queryKey: ['labour-weights', archive?.date, archive?.shift], queryFn: () => archive ? getArchivedLabourWeightsApi(archive.date, archive.shift) : getLabourWeightsApi(false), refetchInterval: archive ? false : 30000 });
  const modeQuery = useQuery({ queryKey: ['labour-weight-mode'], queryFn: getLabourWeightModeApi, enabled: role !== 'labour' });
  const modeMutation = useMutation({ mutationFn: setLabourWeightModeApi, onSuccess: () => { client.invalidateQueries({ queryKey: ['labour-weight-mode'] }); setSettingsVisible(false); }, onError: e => setError(e?.response?.data?.message || 'Could not update weight mode.') });
  useEffect(() => { const refreshMode = () => client.invalidateQueries({ queryKey: ['labour-weight-mode'] }); socket.on('labour_weight_mode_changed', refreshMode); return () => socket.off('labour_weight_mode_changed', refreshMode); }, [client]);

  useEffect(() => {
    const refresh = () => client.invalidateQueries({ queryKey: ['labour-weights'] });
    const interval = setInterval(() => setNow(Date.now()), 250);
    socket.on('labour_weights_updated', refresh);
    return () => { clearInterval(interval); socket.off('labour_weights_updated', refresh); };
  }, [client]);

  const mutation = useMutation({
    mutationFn: saveLabourWeightApi,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['labour-weights'] });
      setEditing(null); setMs(''); setQty('');
    },
    onError: e => setError(e?.response?.data?.message || 'Could not save entry.'),
  });

  const open = item => {
    setEditing(item || {});
    setMs(item ? String(item.ms_weight) : '');
    setQty(item ? String(item.dipping_qty) : '');
    setWeightStatus(item?.status || 'pending');
    setError('');
  };
  const save = () => mutation.mutate({ id: editing?.id, ms_weight: Number(ms), dipping_qty: Number(qty), ...(editing?.id && role === 'superadmin' ? { status: weightStatus } : {}) });
  const deleteWeight = entry => Alert.alert('Delete unused weight', `Delete Dip #${entry.dip_number} · Weight #${entry.id}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await deleteLabourWeightApi(entry.id); await client.invalidateQueries({ queryKey: ['labour-weights'] }); }
      catch (e) { setError(e?.response?.data?.message || 'Could not delete weight.'); }
    } },
  ]);
  const toggleTimer = async (entry, process, action, tappedAtMs) => {
    setTimerBusy(`${entry.id}:${process}`); setError('');
    try {
      const result = await toggleLabourTimerApi(entry.id, process, action, tappedAtMs);
      await client.invalidateQueries({ queryKey: ['labour-weights'] });
      if (action === 'stop' && result?.data?.duration_source === 'server') setError('Device clock differed from the plant timer; the server elapsed time was saved.');
    } catch (e) { setError(e?.response?.data?.message || 'Could not update the timer.'); }
    finally { setTimerBusy(''); }
  };
  const logout = () => Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { await logoutApi(); dispatch(clearAuth()); } },
  ]);

  const renderTimer = (entry, process, label) => {
    const duration = entry[`${process}_duration_seconds`];
    if (duration != null) return <View key={process} style={styles.timerDone}><Text style={styles.timerDoneText}>{label}: {formatDuration(duration)}</Text></View>;
    const started = entry[`${process}_started_at`];
    const startMs = Number(entry[`${process}_client_started_at_ms`]) || Date.parse(started);
    const elapsed = started ? Math.min(Number(entry[`${process}_limit_seconds`]) || Infinity, Math.max(0, Math.floor((now - startMs) / 1000))) : 0;
    const allowed = !archive && entry.can_run_timer;
    if (!allowed) return <Text key={process} style={styles.muted}>{label}: {started ? `Running · ${formatDuration(elapsed)}` : '—'}</Text>;
    return <TouchableOpacity key={process} style={[styles.timerButton, started && styles.timerRunning]} disabled={!!timerBusy} onPress={() => toggleTimer(entry, process, started ? 'stop' : 'start', Date.now())}><Text style={styles.timerButtonText}>{started ? `Stop ${label} · ${formatDuration(elapsed)}` : `Start ${label}`}</Text></TouchableOpacity>;
  };

  return <View style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerCopy}><Text style={styles.title}>MS Weight Queue</Text><Text style={styles.muted}>{query.data?.shift ? `${query.data.shift.name === 'night' ? 'Night' : 'Day'} shift · ${formatDisplayDate(query.data.shift.date)} · ` : ''}{archive ? role === 'superadmin' ? 'Past shift weights' : 'Past shift weights (read-only)' : 'Current shift weights only'}</Text></View>
      <View style={styles.headerActions}>
        {canAdd && <TouchableOpacity style={styles.add} onPress={() => open(null)}><Plus color={COLORS.white} /></TouchableOpacity>}
        {role !== 'labour' && <TouchableOpacity accessibilityLabel="Labour weight settings" style={styles.logout} onPress={() => setSettingsVisible(true)}><Settings size={21} color={COLORS.primary} /></TouchableOpacity>}
        {role === 'labour' && <TouchableOpacity accessibilityLabel="Logout" style={styles.logout} onPress={logout}><LogOut size={21} color={COLORS.danger} /></TouchableOpacity>}
      </View>
    </View>
    {canViewPast && <View style={styles.archiveActions}><TouchableOpacity style={styles.archiveButton} onPress={() => setArchiveOpen(true)}><Text style={styles.archiveButtonText}>View past shift</Text></TouchableOpacity>{archive && <TouchableOpacity style={styles.archiveButton} onPress={() => setArchive(null)}><Text style={styles.archiveButtonText}>Current shift</Text></TouchableOpacity>}</View>}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <ScrollView contentContainerStyle={styles.list}>
      {query.isLoading ? <ActivityIndicator /> : (query.data?.data || []).map(item => <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}><View style={styles.cardCopy}>
          <Text style={styles.number}>Dip #{item.dip_number} · Weight #{item.id} · {item.status.toUpperCase()}</Text>
          <Text style={styles.value}>{item.ms_weight} kg · {item.dipping_qty} NOS</Text>
          {Number(item.consumed_qty) > 0 && <Text style={styles.muted}>{item.remaining_qty} NOS remaining</Text>}
          <Text style={styles.muted}>{item.labour_name} · {formatDisplayDateTime(item.created_at)}</Text>
        </View>{(!archive || role === 'superadmin') && <View style={styles.itemActions}>{canEdit && <TouchableOpacity accessibilityLabel="Edit weight" onPress={() => open(item)}><Pencil size={20} color={COLORS.primary} /></TouchableOpacity>}{!archive && canDelete && item.status === 'pending' && Number(item.consumed_qty) === 0 && !item.production_entry_id && <TouchableOpacity accessibilityLabel="Delete weight" onPress={() => deleteWeight(item)}><Trash2 size={20} color={COLORS.danger} /></TouchableOpacity>}</View>}</View>
        <View style={styles.timers}>{TIMERS.map(([process, label]) => renderTimer(item, process, label))}</View>
      </View>)}
    </ScrollView>
    <Modal transparent visible={archiveOpen} animationType="fade" onRequestClose={() => setArchiveOpen(false)}><View style={styles.overlay}><View style={styles.modal}><TouchableOpacity style={styles.close} onPress={() => setArchiveOpen(false)}><X /></TouchableOpacity><Text style={styles.title}>View past shift weights</Text><TouchableOpacity style={styles.archiveButton} onPress={openArchiveDatePicker}><Text style={styles.archiveButtonText}>Production date: {formatDisplayDate(archiveDate)}</Text></TouchableOpacity><Text style={styles.muted}>Shift</Text><View style={styles.archiveActions}>{[['day', 'Day shift'], ['night', 'Night shift']].map(([value, label]) => <TouchableOpacity key={value} style={[styles.archiveButton, archiveShift === value && styles.modeSelected]} onPress={() => setArchiveShift(value)}><Text style={styles.archiveButtonText}>{label}</Text></TouchableOpacity>)}</View><TouchableOpacity style={styles.save} onPress={() => { setArchive({ date: archiveDate, shift: archiveShift }); setArchiveOpen(false); }}><Text style={styles.saveText}>View weights</Text></TouchableOpacity></View></View></Modal>
    {Platform.OS === 'ios' && <Modal transparent visible={datePickerOpen} animationType="fade" onRequestClose={() => { setDatePickerOpen(false); setArchiveOpen(true); }}><View style={styles.overlay}><View style={styles.modal}><Text style={styles.title}>Select production date</Text><DateTimePicker value={pickerDate} mode="date" display="spinner" maximumDate={new Date()} onChange={(_event, value) => { if (value) setPickerDate(value); }} /><View style={styles.archiveActions}><TouchableOpacity style={styles.archiveButton} onPress={() => { setDatePickerOpen(false); setArchiveOpen(true); }}><Text style={styles.archiveButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.save} onPress={() => { setArchiveDate(formatDateForApi(pickerDate)); setDatePickerOpen(false); setArchiveOpen(true); }}><Text style={styles.saveText}>Use date</Text></TouchableOpacity></View></View></View></Modal>}
    <Modal transparent visible={editing !== null} animationType="fade" onRequestClose={() => setEditing(null)}><View style={styles.overlay}><View style={styles.modal}>
      <TouchableOpacity style={styles.close} onPress={() => setEditing(null)}><X /></TouchableOpacity>
      <Text style={styles.title}>{editing?.id ? 'Edit' : 'Add'} weight</Text>
      <TextInput mode="outlined" label="MS Weight 1 Nos (kg)" value={ms} onChangeText={setMs} keyboardType="decimal-pad" />
      <TextInput mode="outlined" label="Dip Qty" value={qty} onChangeText={setQty} keyboardType="number-pad" />
      {editing?.status === 'used' && role === 'superadmin' && <><Text style={styles.muted}>Status</Text><View style={styles.archiveActions}>{[['used', 'Used'], ['pending', 'Pending']].map(([value, label]) => <TouchableOpacity key={value} style={[styles.archiveButton, weightStatus === value && styles.modeSelected]} onPress={() => setWeightStatus(value)}><Text style={styles.archiveButtonText}>{label}</Text></TouchableOpacity>)}</View>{weightStatus === 'pending' && <Text style={styles.muted}>Recorded production stays linked. If this weight was used in production, increase dip quantity above the used quantity to leave a pending balance.</Text>}</>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.save} disabled={mutation.isPending} onPress={save}><Text style={styles.saveText}>{mutation.isPending ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
    </View></View></Modal>
    <Modal transparent visible={settingsVisible} animationType="fade" onRequestClose={() => setSettingsVisible(false)}><View style={styles.overlay}><View style={styles.modal}>
      <TouchableOpacity style={styles.close} onPress={() => setSettingsVisible(false)}><X /></TouchableOpacity>
      <Text style={styles.title}>Production weight mode</Text>
      <Text style={styles.muted}>Manual lets the supervisor enter weights. Auto uses the first pending labour weight. Selection lets the supervisor choose the current dip.</Text>
      {MODES.map(([value, label]) => <TouchableOpacity key={value} style={[styles.modeOption, modeQuery.data?.data?.mode === value && styles.modeSelected]} disabled={modeMutation.isPending} onPress={() => modeMutation.mutate(value)}><Text style={styles.value}>{label}{modeQuery.data?.data?.mode === value ? ' ✓' : ''}</Text></TouchableOpacity>)}
    </View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1 }, headerActions: { flexDirection: 'row', gap: 8 },
  archiveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  archiveButton: { padding: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: UI.radiusSmall, backgroundColor: COLORS.white },
  archiveButtonText: { color: COLORS.primary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  logout: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  list: { gap: 10, paddingVertical: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radiusSmall, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardCopy: { flex: 1, paddingRight: 10 }, number: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  value: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 5 },
  timers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerButton: { backgroundColor: '#eef4ff', borderColor: COLORS.primary, borderWidth: 1, borderRadius: 8, padding: 9 },
  timerRunning: { backgroundColor: '#fff3dd', borderColor: '#c98b2f' },
  timerButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  timerDone: { backgroundColor: '#eaf6ee', borderRadius: 8, padding: 9 },
  timerDoneText: { color: '#255d3e', fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 420, backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 20, gap: 14 },
  close: { alignSelf: 'flex-end' },
  save: { backgroundColor: COLORS.accent, padding: 14, borderRadius: UI.radiusSmall, alignItems: 'center' },
  saveText: { color: COLORS.white, fontWeight: '700' }, error: { color: COLORS.danger },
  modeOption: { padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  modeSelected: { borderColor: COLORS.primary, backgroundColor: '#eef4ff' },
});
