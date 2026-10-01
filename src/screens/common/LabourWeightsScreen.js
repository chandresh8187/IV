import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Plus, Pencil, X, LogOut, Settings } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { getLabourWeightsApi, getLabourWeightModeApi, setLabourWeightModeApi, saveLabourWeightApi, toggleLabourTimerApi } from '../../api/labourWeightsApi';
import { hasPermission } from '../../utils/permissions';
import { formatDisplayDateTime } from '../../utils/format';
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
  const [editing, setEditing] = useState(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [ms, setMs] = useState('');
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');
  const [timerBusy, setTimerBusy] = useState('');
  const [now, setNow] = useState(Date.now());
  const query = useQuery({ queryKey: ['labour-weights'], queryFn: () => getLabourWeightsApi(false) });
  const modeQuery = useQuery({ queryKey: ['labour-weight-mode'], queryFn: getLabourWeightModeApi, enabled: role !== 'labour' });
  const modeMutation = useMutation({ mutationFn: setLabourWeightModeApi, onSuccess: () => { client.invalidateQueries({ queryKey: ['labour-weight-mode'] }); setSettingsVisible(false); }, onError: e => setError(e?.response?.data?.message || 'Could not update weight mode.') });
  useEffect(() => { const refreshMode = () => client.invalidateQueries({ queryKey: ['labour-weight-mode'] }); socket.on('labour_weight_mode_changed', refreshMode); return () => socket.off('labour_weight_mode_changed', refreshMode); }, [client]);

  useEffect(() => {
    const refresh = () => client.invalidateQueries({ queryKey: ['labour-weights'] });
    const interval = setInterval(() => setNow(Date.now()), 250);
    let date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dateInterval = setInterval(() => {
      const current = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      if (current !== date) { date = current; refresh(); }
    }, 30000);
    socket.on('labour_weights_updated', refresh);
    return () => { clearInterval(interval); clearInterval(dateInterval); socket.off('labour_weights_updated', refresh); };
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
    setError('');
  };
  const save = () => mutation.mutate({ id: editing?.id, ms_weight: Number(ms), dipping_qty: Number(qty) });
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
    const allowed = entry.can_run_timer;
    if (!allowed) return <Text key={process} style={styles.muted}>{label}: {started ? `Running · ${formatDuration(elapsed)}` : '—'}</Text>;
    return <TouchableOpacity key={process} style={[styles.timerButton, started && styles.timerRunning]} disabled={!!timerBusy} onPress={() => toggleTimer(entry, process, started ? 'stop' : 'start', Date.now())}><Text style={styles.timerButtonText}>{started ? `Stop ${label} · ${formatDuration(elapsed)}` : `Start ${label}`}</Text></TouchableOpacity>;
  };

  return <View style={styles.page}>
    <View style={styles.header}>
      <View style={styles.headerCopy}><Text style={styles.title}>MS Weight Queue</Text><Text style={styles.muted}>Entries are used in this order for production.</Text></View>
      <View style={styles.headerActions}>
        {canAdd && <TouchableOpacity style={styles.add} onPress={() => open(null)}><Plus color={COLORS.white} /></TouchableOpacity>}
        {role !== 'labour' && <TouchableOpacity accessibilityLabel="Labour weight settings" style={styles.logout} onPress={() => setSettingsVisible(true)}><Settings size={21} color={COLORS.primary} /></TouchableOpacity>}
        {role === 'labour' && <TouchableOpacity accessibilityLabel="Logout" style={styles.logout} onPress={logout}><LogOut size={21} color={COLORS.danger} /></TouchableOpacity>}
      </View>
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <ScrollView contentContainerStyle={styles.list}>
      {query.isLoading ? <ActivityIndicator /> : (query.data?.data || []).map(item => <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}><View style={styles.cardCopy}>
          <Text style={styles.number}>Dip #{item.dip_number} · Weight #{item.id} · {item.status.toUpperCase()}</Text>
          <Text style={styles.value}>{item.ms_weight} kg · {item.dipping_qty} NOS</Text>
          {Number(item.consumed_qty) > 0 && <Text style={styles.muted}>{item.remaining_qty} NOS remaining</Text>}
          <Text style={styles.muted}>{item.labour_name} · {formatDisplayDateTime(item.created_at)}</Text>
        </View>{canEdit && <TouchableOpacity accessibilityLabel="Edit weight" onPress={() => open(item)}><Pencil size={20} color={COLORS.primary} /></TouchableOpacity>}</View>
        <View style={styles.timers}>{TIMERS.map(([process, label]) => renderTimer(item, process, label))}</View>
      </View>)}
    </ScrollView>
    <Modal transparent visible={editing !== null} animationType="fade" onRequestClose={() => setEditing(null)}><View style={styles.overlay}><View style={styles.modal}>
      <TouchableOpacity style={styles.close} onPress={() => setEditing(null)}><X /></TouchableOpacity>
      <Text style={styles.title}>{editing?.id ? 'Edit' : 'Add'} weight</Text>
      <TextInput mode="outlined" label="MS Weight 1 Nos (kg)" value={ms} onChangeText={setMs} keyboardType="decimal-pad" />
      <TextInput mode="outlined" label="Dip Qty" value={qty} onChangeText={setQty} keyboardType="number-pad" />
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  logout: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  list: { gap: 10, paddingVertical: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radiusSmall, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
