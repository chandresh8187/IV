import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { socket } from '../../socket/socket';
import { changeGasBottleApi, fillGasPositionApi, getGasDashboardApi, receiveGasBottlesApi, startGasBottleApi, updateGasPositionStartTimeApi, updateGasPositionWeightApi } from '../../api/gasManagementApi';

export default function GasManagementScreen({ navigation }) {
  const user = useSelector(state => state.auth.user); const client = useQueryClient();
  const canManage = hasPermission(user, 'gas.manage');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ bottle_count: '', rate_per_kg: '' });
  const [filledWeight, setFilledWeight] = useState('');
  const [emptyWeight, setEmptyWeight] = useState('');
  const [startTime, setStartTime] = useState(new Date());
  const [nextPosition, setNextPosition] = useState(null);
  const [startWithPlacement, setStartWithPlacement] = useState(false);
  const [picker, setPicker] = useState(null);
  const query = useQuery({ queryKey: ['gas-management'], queryFn: getGasDashboardApi });
  const summary = query.data?.data?.summary || {}; const positions = query.data?.data?.positions || []; const pendingWeights = query.data?.data?.pending_empty_weights || [];
  useEffect(() => { const refresh = () => client.invalidateQueries({ queryKey: ['gas-management'] }); socket.on('gas_management_updated', refresh); return () => socket.off('gas_management_updated', refresh); }, [client]);
  const success = result => { setDialog(null); client.invalidateQueries({ queryKey: ['gas-management'] }); Alert.alert('Saved', result.message); };
  const failure = error => Alert.alert('Could not save', error?.response?.data?.message || 'Please try again.');
  const receive = useMutation({ mutationFn: receiveGasBottlesApi, onSuccess: result => { setForm({ bottle_count: '', rate_per_kg: '' }); success(result); }, onError: failure });
  const fill = useMutation({ mutationFn: ({ position, weight, oldEmptyWeight, startedAt }) => fillGasPositionApi(position, weight, oldEmptyWeight, startedAt), onSuccess: result => { setFilledWeight(''); setEmptyWeight(''); success(result); }, onError: failure });
  const correctWeight = useMutation({ mutationFn: ({ position, weight }) => updateGasPositionWeightApi(position, weight), onSuccess: success, onError: failure });
  const start = useMutation({ mutationFn: startGasBottleApi, onSuccess: success, onError: failure });
  const saveStartTime = useMutation({ mutationFn: ({ position, startedAt }) => updateGasPositionStartTimeApi(position, startedAt), onSuccess: success, onError: failure });
  const pause = useMutation({ mutationFn: changeGasBottleApi, onSuccess: success, onError: failure });
  const busy = receive.isPending || fill.isPending || correctWeight.isPending || start.isPending || saveStartTime.isPending || pause.isPending;
  const pickTime = (kind, mode = 'date') => setPicker({ kind, mode });
  const onPicked = (event, value) => {
    if (event.type !== 'set' || !value) { setPicker(null); return; }
    const current = startTime;
    const updated = new Date(current);
    if (picker.mode === 'date') updated.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    else updated.setHours(value.getHours(), value.getMinutes(), 0, 0);
    setStartTime(updated);
    setPicker(picker.mode === 'date' ? { kind: picker.kind, mode: 'time' } : null);
  };
  if (query.isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  const startTimeControl = <View style={styles.timeControls}>
    <TouchableOpacity style={styles.secondary} onPress={() => pickTime('start')}><Text style={styles.link}>Gas supply start: {moment(startTime).format('DD MMM YYYY, hh:mm A')}</Text></TouchableOpacity>
  </View>;
  return <><ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Gas Stock</Text><Text style={styles.muted}>Receive filled bottles and prepare GAS-1 to GAS-4.</Text>
    {summary.low_stock ? <View style={styles.alert}><Text style={styles.alertText}>Low gas stock: only {summary.filled_bottles} filled bottle{Number(summary.filled_bottles) === 1 ? '' : 's'} remain. Receive new bottles soon.</Text></View> : null}
    <View style={styles.grid}><View style={styles.metric}><Text style={styles.muted}>Filled bottles in plant</Text><Text style={styles.value}>{summary.filled_bottles || 0}</Text></View><View style={styles.metric}><Text style={styles.muted}>Current gas rate per kg</Text><Text style={styles.value}>₹{Number(summary.current_gas_rate || 0).toFixed(2)}</Text></View></View>
    <Text style={styles.muted}>Unassigned filled bottles: {summary.stored_filled_bottles || 0}</Text>
    <View style={styles.actions}>{canManage && <TouchableOpacity style={styles.button} onPress={() => setDialog({ type: 'receive' })}><Text style={styles.buttonText}>Add new bottle stock</Text></TouchableOpacity>}<TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('GasChangeMovements')}><Text style={styles.link}>Gas change movements</Text></TouchableOpacity></View>
    <View style={styles.positions}>{[1, 2, 3, 4].map(number => { const bottle = positions.find(item => Number(item.position_no) === number); const pending = pendingWeights.find(item => Number(item.position_no) === number); return <TouchableOpacity key={number} disabled={!canManage} style={[styles.position, bottle?.status === 'running' && styles.running]} onPress={() => { setFilledWeight(bottle?.filled_weight_kg == null ? '' : String(bottle.filled_weight_kg)); setEmptyWeight(''); setStartTime(bottle?.started_at ? new Date(bottle.started_at) : new Date()); setNextPosition(null); setStartWithPlacement(!summary.running_bottle_number); setDialog({ type: 'position', number, bottle, pending }); }}><Text style={styles.positionTitle}>GAS-{number}</Text><Text style={styles.positionStatus}>{bottle?.status === 'running' ? 'Running' : bottle?.status === 'ready' ? bottle.was_paused ? 'Partly used · ready to resume' : 'Ready to start' : 'Empty slot'}</Text><Text style={styles.muted}>{bottle ? `${bottle.bottle_code} · Filled weight: ${bottle.filled_weight_kg ?? 'Not set'} kg` : pending ? `Previous ${pending.bottle_code}: empty weight required before refill` : 'Tap to place a filled bottle'}</Text></TouchableOpacity>; })}</View>
  </ScrollView><Modal transparent visible={dialog !== null} animationType="fade" onRequestClose={() => !busy && setDialog(null)}><View style={styles.overlay}><ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
    {dialog?.type === 'receive' ? <><Text style={styles.heading}>Add new bottle stock</Text><TextInput mode="outlined" label="Number of bottles received" keyboardType="number-pad" value={form.bottle_count} onChangeText={value => setForm({ ...form, bottle_count: value })} /><TextInput mode="outlined" label="Rate per kg ₹" keyboardType="decimal-pad" value={form.rate_per_kg} onChangeText={value => setForm({ ...form, rate_per_kg: value })} /><Text style={styles.muted}>Nominal capacity: 425 kg. Price per bottle: ₹{(425 * Number(form.rate_per_kg || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}.</Text><TouchableOpacity style={styles.button} disabled={busy} onPress={() => receive.mutate({ bottle_count: Number(form.bottle_count), rate_per_kg: Number(form.rate_per_kg) })}><Text style={styles.buttonText}>{busy ? 'Saving…' : 'Add new bottle stock'}</Text></TouchableOpacity></>
      : <>
        <Text style={styles.heading}>GAS-{dialog?.number}</Text>
        {dialog?.bottle ? <>
          <Text style={styles.muted}>{dialog.bottle.bottle_code}</Text>
          <TextInput mode="outlined" label="Filled bottle weight (kg)" keyboardType="decimal-pad" value={filledWeight} onChangeText={setFilledWeight} />
          <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => correctWeight.mutate({ position: dialog.number, weight: Number(filledWeight) })}><Text style={styles.link}>Save filled weight</Text></TouchableOpacity>
          <Text style={styles.positionStatus}>{dialog.bottle.status}</Text>
          {dialog.bottle.status === 'ready' && !summary.running_bottle_number && <>
            {startTimeControl}
            <TouchableOpacity style={styles.button} disabled={busy} onPress={() => start.mutate({ position_no: dialog.number, started_at: moment(startTime).format('YYYY-MM-DD HH:mm:ss') })}><Text style={styles.buttonText}>{busy ? 'Starting…' : 'Start gas supply'}</Text></TouchableOpacity>
          </>}
          {dialog.bottle.status === 'running' && <>
            {startTimeControl}
            <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => saveStartTime.mutate({ position: dialog.number, startedAt: moment(startTime).format('YYYY-MM-DD HH:mm:ss') })}><Text style={styles.link}>Save start time</Text></TouchableOpacity>
            <Text style={styles.muted}>Pause this partly used bottle and switch to another ready position. It can be resumed later.</Text>
            <Text style={styles.muted}>Start another bottle:</Text>
            <View style={styles.actions}>{positions.filter(item => item.status === 'ready' && Number(item.position_no) !== dialog.number).map(item => <TouchableOpacity key={item.position_no} style={nextPosition === Number(item.position_no) ? styles.button : styles.secondary} onPress={() => setNextPosition(Number(item.position_no))}><Text style={nextPosition === Number(item.position_no) ? styles.buttonText : styles.link}>GAS-{item.position_no}</Text></TouchableOpacity>)}</View>
            <TouchableOpacity style={styles.button} disabled={busy || !nextPosition} onPress={() => pause.mutate({ bottle_number: nextPosition, changed_at: moment().format('YYYY-MM-DD HH:mm:ss'), finish_reason: 'paused' })}><Text style={styles.buttonText}>{busy ? 'Saving…' : 'Pause bottle and switch'}</Text></TouchableOpacity>
          </>}
        </> : <>
          <Text style={styles.muted}>Place the next unassigned filled bottle in this slot.</Text>
          {dialog?.pending ? <><Text style={styles.muted}>First record the empty weight of previous {dialog.pending.bottle_code} (filled: {dialog.pending.filled_weight_kg} kg).</Text><TextInput mode="outlined" label="Previous empty bottle weight (kg)" keyboardType="decimal-pad" value={emptyWeight} onChangeText={setEmptyWeight} /></> : null}
          <TextInput mode="outlined" label="New filled bottle weight (kg)" keyboardType="decimal-pad" value={filledWeight} onChangeText={setFilledWeight} />
          {!summary.running_bottle_number && <><TouchableOpacity style={styles.secondary} onPress={() => setStartWithPlacement(!startWithPlacement)}><Text style={styles.link}>{startWithPlacement ? '✓ Start gas supply with this bottle' : 'Start gas supply with this bottle'}</Text></TouchableOpacity>{startWithPlacement && startTimeControl}</>}
          <TouchableOpacity style={styles.button} disabled={busy || !filledWeight || (dialog?.pending && !emptyWeight)} onPress={() => fill.mutate({ position: dialog.number, weight: Number(filledWeight), oldEmptyWeight: dialog.pending ? Number(emptyWeight) : undefined, startedAt: startWithPlacement ? moment(startTime).format('YYYY-MM-DD HH:mm:ss') : undefined })}><Text style={styles.buttonText}>{busy ? 'Saving…' : startWithPlacement ? 'Place and start gas supply' : 'Place filled bottle'}</Text></TouchableOpacity>
        </>}
      </>}
    <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => setDialog(null)}><Text style={styles.link}>Close</Text></TouchableOpacity>
  </ScrollView></View></Modal>{picker && <DateTimePicker value={startTime} mode={picker.mode} is24Hour={false} onChange={onPicked} />}</>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 14, paddingBottom: 80 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 26, fontWeight: '800', color: COLORS.text }, heading: { fontSize: 19, fontWeight: '700', color: COLORS.text }, muted: { color: COLORS.muted, lineHeight: 20 }, alert: { backgroundColor: '#fff1e8', borderColor: '#ed9a54', borderWidth: 1, borderRadius: 10, padding: 13 }, alertText: { color: '#8a3b0a', fontWeight: '700' }, grid: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, padding: 15, gap: 5, backgroundColor: COLORS.white, borderRadius: UI.radiusSmall }, value: { fontSize: 20, fontWeight: '800', color: COLORS.text }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, button: { backgroundColor: COLORS.accent, padding: 14, borderRadius: UI.radiusSmall, alignItems: 'center' }, buttonText: { color: COLORS.white, fontWeight: '700' }, secondary: { backgroundColor: COLORS.accentSoft, padding: 14, borderRadius: UI.radiusSmall, alignItems: 'center' }, link: { color: COLORS.accent, fontWeight: '700' }, timeControls: { gap: 8 }, positions: { gap: 10 }, position: { backgroundColor: COLORS.white, padding: 18, borderRadius: UI.radiusSmall, gap: 6, borderWidth: 1, borderColor: COLORS.border }, running: { borderColor: '#219b74', borderWidth: 2, backgroundColor: '#e9f8f2' }, positionTitle: { color: COLORS.accent, fontWeight: '800', fontSize: 15 }, positionStatus: { color: COLORS.text, fontSize: 20, fontWeight: '800' }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center', padding: 20 }, modal: { backgroundColor: COLORS.white, borderRadius: UI.radius, maxHeight: '85%' }, modalContent: { padding: 20, gap: 14 } });
