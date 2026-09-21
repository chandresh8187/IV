import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ArrowRightLeft, Factory, Package, Settings } from 'lucide-react-native';
import { getZincByproductsApi, getZincStockApi, saveZincByproductApi, saveZincMovementApi } from '../../api/zincStockApi';
import ZincTankVisual from '../../components/ZincTankVisual';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { parseZincAmount, zincKg, zincTransferPreview } from '../../utils/zincStock';

const requestId = () => `zinc_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; };
const money = value => Math.round(Number(value || 0) * 100) / 100;

export default function ZincStockScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canReceive = hasPermission(user, 'zinc_stock.receive');
  const canTransfer = hasPermission(user, 'zinc_stock.transfer');
  const canAdjust = hasPermission(user, 'zinc_stock.adjust');
  const canManageByproducts = hasPermission(user, 'zinc_byproduct.manage');
  const { contentMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [tab, setTab] = useState('stock');
  const [selected, setSelected] = useState('plant');
  const [action, setAction] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ashWeight, setAshWeight] = useState(''); const [ashRate, setAshRate] = useState('');
  const [drossWeight, setDrossWeight] = useState(''); const [drossRate, setDrossRate] = useState('');
  const [byproductNote, setByproductNote] = useState(''); const [byproductError, setByproductError] = useState('');
  const pendingRequest = useRef(null);
  const stockQuery = useQuery({ queryKey: ['zinc-stock'], queryFn: getZincStockApi, enabled: canView, retry: false });
  const byproductQuery = useQuery({ queryKey: ['zinc-byproducts', currentMonth()], queryFn: () => getZincByproductsApi({ month: currentMonth() }), enabled: canView && tab === 'byproducts' });
  const stock = stockQuery.data?.data;
  const summary = byproductQuery.data?.summary || {};
  const refetchStock = stockQuery.refetch;
  const refetchByproducts = byproductQuery.refetch;
  const refresh = () => { client.invalidateQueries({ queryKey: ['zinc-stock'] }); client.invalidateQueries({ queryKey: ['zinc-stock-movements'] }); client.invalidateQueries({ queryKey: ['zinc-byproducts'] }); };
  useFocusEffect(useCallback(() => {
    if (canView) {
      refetchStock();
      if (tab === 'byproducts') refetchByproducts();
    }
  }, [canView, refetchStock, refetchByproducts, tab]));
  const movement = useMutation({ mutationFn: saveZincMovementApi, retry: false,
    onSuccess: response => { Keyboard.dismiss(); client.setQueryData(['zinc-stock'], response); pendingRequest.current = null; setAction(null); setAmount(''); setNote(''); setError(''); setSuccess(response.message); refresh(); },
    onError: failure => { setError(failure?.response?.data?.message || 'Could not save zinc stock.'); if (failure?.response?.status === 409) pendingRequest.current = null; },
  });
  const byproduct = useMutation({ mutationFn: saveZincByproductApi,
    onSuccess: response => { setSuccess(response.message); setAshWeight(''); setAshRate(''); setDrossWeight(''); setDrossRate(''); setByproductNote(''); setByproductError(''); refresh(); client.invalidateQueries({ queryKey: ['dashboard'] }); },
    onError: failure => setByproductError(failure?.response?.data?.message || 'Could not save ash and dross entry.'),
  });
  const preview = action === 'transfer' && amount && stock ? zincTransferPreview(stock, amount) : null;
  const saveMovement = () => {
    const kg = parseZincAmount(amount);
    if (kg == null) return setError('Enter kilograms greater than zero, with up to 3 decimal places.');
    if (action === 'transfer' && preview?.error) return setError(preview.error);
    const payload = { action, amount_kg: kg, note: note.trim() }; const signature = JSON.stringify(payload);
    if (pendingRequest.current?.signature !== signature) pendingRequest.current = { signature, body: { ...payload, expected_revision: stock.revision, request_id: requestId() } };
    movement.mutate(pendingRequest.current.body);
  };
  const currentRate = Number(stock?.current_zinc_rate || 0);
  const ashBase = money(Number(ashWeight || 0) * Number(ashRate || 0)); const drossBase = money(Number(drossWeight || 0) * Number(drossRate || 0));
  const ashGst = money(ashBase * 0.18); const drossGst = money(drossBase * 0.18); const total = money(ashBase + ashGst + drossBase + drossGst);
  const recovered = currentRate > 0 ? total / currentRate : 0;
  if (!canView) return <View style={styles.center}><Text style={styles.muted}>You do not have zinc stock access.</Text></View>;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
  <ScrollView style={styles.page} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]} refreshControl={<RefreshControl refreshing={stockQuery.isRefetching || byproductQuery.isRefetching} onRefresh={refresh} />}>
    <View style={styles.titleRow}><View><Text style={styles.title}>Zinc Management</Text><Text style={styles.muted}>Stock, ash and dross recovery</Text></View>{(canAdjust || canManageByproducts) && <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('ZincStockSettings')}><Settings size={18} color={COLORS.white} /><Text style={styles.buttonText}>Settings</Text></TouchableOpacity>}</View>
    <View style={styles.tabs}><TouchableOpacity style={[styles.tab, tab === 'stock' && styles.activeTab]} onPress={() => setTab('stock')}><Text style={[styles.tabText, tab === 'stock' && styles.activeTabText]}>Zinc Stock</Text></TouchableOpacity><TouchableOpacity style={[styles.tab, tab === 'byproducts' && styles.activeTab]} onPress={() => setTab('byproducts')}><Text style={[styles.tabText, tab === 'byproducts' && styles.activeTabText]}>Ash & Dross</Text></TouchableOpacity></View>
    {success ? <Text style={styles.success}>{success}</Text> : null}
    {stockQuery.isLoading ? <ActivityIndicator color={COLORS.accent} /> : stockQuery.isError ? <View style={styles.card}><Text style={styles.error}>Could not load zinc stock.</Text><TouchableOpacity onPress={refresh}><Text style={styles.link}>Retry stock</Text></TouchableOpacity></View> : tab === 'stock' ? <>
      <TouchableOpacity style={styles.reportButton} onPress={() => navigation.navigate('ZincStockReport')}><Text style={styles.reportButtonText}>View Zinc Transactions</Text></TouchableOpacity>
      <View style={styles.options}>{[{ key: 'plant', title: 'Stock in Plant', Icon: Factory, kg: stock.plant_kg }, { key: 'kettle', title: 'Stock in Kettle', Icon: Package, kg: stock.kettle_kg }].map(({ key, title, Icon, kg: value }) => <TouchableOpacity key={key} style={[styles.stockCard, selected === key && styles.selectedCard]} onPress={() => setSelected(key)}><Icon size={24} color={COLORS.accent} /><Text style={styles.heading}>{title}</Text><Text style={styles.balance}>{stock.initialized ? `${zincKg(value)} kg` : 'Not set'}</Text></TouchableOpacity>)}</View>
      {!stock.initialized ? <View style={styles.card}><Text style={styles.heading}>Opening stock is not set</Text><Text style={styles.muted}>Use Settings to enter opening plant and kettle stock.</Text></View> : <>
        {!action && ((selected === 'plant' && canReceive) || (selected === 'kettle' && canTransfer)) && <TouchableOpacity style={styles.button} onPress={() => { setAction(selected === 'plant' ? 'receive' : 'transfer'); setAmount(''); setError(''); }}><ArrowRightLeft size={18} color={COLORS.white} /><Text style={styles.buttonText}>{selected === 'plant' ? 'Add zinc to plant' : 'Add zinc to kettle'}</Text></TouchableOpacity>}
        {action && <View style={styles.card}><Text style={styles.heading}>{action === 'receive' ? 'Receive zinc in plant' : 'Transfer zinc to kettle'}</Text><TextInput mode="outlined" label="Zinc amount (kg)" value={amount} onChangeText={value => { setAmount(value); setError(''); pendingRequest.current = null; }} keyboardType="decimal-pad" /><TextInput mode="outlined" label="Note (optional)" value={note} onChangeText={setNote} maxLength={255} />{preview && !preview.error ? <View style={styles.preview}><Text style={styles.heading}>Plant: {zincKg(preview.plant_kg)} kg</Text><Text style={styles.heading}>Kettle: {zincKg(preview.kettle_kg)} kg</Text><Text style={styles.muted}>Estimated fill: {preview.level_mm.toFixed(1)} mm</Text></View> : null}{preview?.error || error ? <Text style={styles.error}>{preview?.error || error}</Text> : null}<View style={styles.row}><TouchableOpacity style={styles.secondary} onPress={() => setAction(null)}><Text style={styles.link}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.button} onPress={saveMovement}><Text style={styles.buttonText}>{movement.isPending ? 'Saving…' : action === 'receive' ? 'Save plant receipt' : 'Confirm transfer'}</Text></TouchableOpacity></View></View>}
        <View style={styles.card}><View style={styles.row}><Text style={styles.heading}>Kettle tank</Text><Text style={styles.muted}>5 m × 1 m × 1.25 m</Text></View><ZincTankVisual initialized={stock.initialized} levelMm={stock.level_mm || 0} depthMm={stock.tank.depth_mm} /><Text style={styles.balance}>{Number(stock.level_mm).toFixed(1)} mm · {zincKg(stock.kettle_kg)} kg</Text></View>
      </>}
    </> : <>
      <TouchableOpacity style={styles.reportButton} onPress={() => navigation.navigate('AshDrossReport')}><Text style={styles.reportButtonText}>View Ash & Dross Transactions</Text></TouchableOpacity><Text style={styles.heading}>Collected this month</Text>
      {byproductQuery.isLoading ? <ActivityIndicator color={COLORS.accent} /> : <View style={styles.options}><View style={styles.stockCard}><Text style={styles.heading}>Ash</Text><Text style={styles.balance}>{zincKg(summary.ash_weight_kg)} kg</Text></View><View style={styles.stockCard}><Text style={styles.heading}>Dross</Text><Text style={styles.balance}>{zincKg(summary.dross_weight_kg)} kg</Text></View><View style={styles.stockCard}><Text style={styles.heading}>Recovered zinc</Text><Text style={styles.balance}>{zincKg(summary.recovered_zinc_kg)} kg</Text></View></View>}
      <View style={styles.card}><Text style={styles.heading}>Current zinc rate</Text><Text style={styles.balance}>{currentRate ? `₹${currentRate.toFixed(2)} / kg` : 'Not set in Settings'}</Text></View>
      {canManageByproducts && <View style={styles.card}><Text style={styles.heading}>Record ash and dross</Text><TextInput mode="outlined" label="Ash weight (kg)" value={ashWeight} onChangeText={setAshWeight} keyboardType="decimal-pad" style={styles.fullInput} /><TextInput mode="outlined" label="Ash sell rate / kg" value={ashRate} onChangeText={setAshRate} keyboardType="decimal-pad" style={styles.fullInput} /><TextInput mode="outlined" label="Dross weight (kg)" value={drossWeight} onChangeText={setDrossWeight} keyboardType="decimal-pad" style={styles.fullInput} /><TextInput mode="outlined" label="Dross sell rate / kg" value={drossRate} onChangeText={setDrossRate} keyboardType="decimal-pad" style={styles.fullInput} /><TextInput mode="outlined" label="Note (optional)" value={byproductNote} onChangeText={setByproductNote} maxLength={255} style={styles.fullInput} /><View style={styles.preview}><Text style={styles.muted}>Ash GST: ₹{ashGst.toFixed(2)} · Dross GST: ₹{drossGst.toFixed(2)}</Text><Text style={styles.heading}>Total with GST: ₹{total.toFixed(2)}</Text><Text style={styles.heading}>Recovered zinc: {recovered.toFixed(3)} kg</Text></View>{byproductError ? <Text style={styles.error}>{byproductError}</Text> : null}<TouchableOpacity style={styles.button} disabled={byproduct.isPending} onPress={() => { if (!currentRate) return setByproductError('Set the current zinc rate in Settings first.'); byproduct.mutate({ ash_weight_kg: ashWeight || 0, ash_rate: ashRate || 0, dross_weight_kg: drossWeight || 0, dross_rate: drossRate || 0, note: byproductNote.trim() }); }}><Text style={styles.buttonText}>{byproduct.isPending ? 'Saving…' : 'Save ash & dross entry'}</Text></TouchableOpacity></View>}
    </>}
  </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 16, paddingBottom: 120 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, title: { color: COLORS.text, fontSize: 25, fontWeight: '700' }, heading: { color: COLORS.text, fontSize: 16, fontWeight: '700', flexShrink: 1 }, balance: { color: COLORS.text, fontSize: 22, fontWeight: '700' }, muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 }, settingsButton: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: COLORS.primary, padding: 12, borderRadius: UI.radiusSmall }, tabs: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 5, borderRadius: UI.radius }, tab: { flex: 1, padding: 13, borderRadius: UI.radiusSmall, alignItems: 'center' }, activeTab: { backgroundColor: COLORS.accent }, tabText: { color: COLORS.muted, fontWeight: '700' }, activeTabText: { color: COLORS.white }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stockCard: { flexGrow: 1, flexBasis: 145, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: UI.radius, padding: 18, gap: 10 }, selectedCard: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft }, card: { backgroundColor: COLORS.white, padding: 18, gap: 14, borderRadius: UI.radius }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, fullInput: { width: '100%' }, button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: UI.radiusSmall, padding: 15, minHeight: 48 }, buttonText: { color: COLORS.white, fontWeight: '700' }, secondary: { padding: 15, borderRadius: UI.radiusSmall, backgroundColor: COLORS.accentSoft }, link: { color: COLORS.accent, fontWeight: '600' }, reportButton: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: UI.radiusSmall, minHeight: 44, paddingHorizontal: 18, justifyContent: 'center' }, reportButtonText: { color: COLORS.white, fontWeight: '700' }, preview: { padding: 14, gap: 7, backgroundColor: COLORS.accentSoft, borderRadius: UI.radiusSmall }, error: { color: COLORS.danger, fontSize: 14 }, success: { color: COLORS.success, fontWeight: '600' },
});
