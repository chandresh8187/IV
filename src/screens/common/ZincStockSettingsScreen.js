import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getZincStockApi, saveZincMovementApi } from '../../api/zincStockApi';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { parseZincAmount, zincKgToMm, zincMmToKg, ZINC_DEPTH_MM, ZINC_KG_PER_MM } from '../../utils/zincStock';

const requestId = () => `zinc_settings_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export default function ZincStockSettingsScreen() {
  const user = useSelector(state => state.auth.user);
  const canAdjust = hasPermission(user, 'zinc_stock.adjust');
  const client = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const [plant, setPlant] = useState(''); const [kettle, setKettle] = useState(''); const [kettleMm, setKettleMm] = useState('');
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const pending = useRef(null);
  const query = useQuery({ queryKey: ['zinc-stock'], queryFn: getZincStockApi, enabled: canAdjust, retry: false });
  const stock = query.data?.data;
  useEffect(() => { if (stock) { const kettleKg = Number(stock.kettle_kg ?? 0); setPlant(String(stock.plant_kg ?? 0)); setKettle(String(kettleKg)); setKettleMm(String(zincKgToMm(kettleKg))); } }, [stock]);
  const changeKettleKg = value => {
    setKettle(value);
    const kg = parseZincAmount(value, true);
    if (kg != null) setKettleMm(String(zincKgToMm(kg)));
    else if (!value.trim()) setKettleMm('');
  };
  const changeKettleMm = value => {
    setKettleMm(value);
    const mm = parseZincAmount(value, true);
    if (mm != null) setKettle(String(zincMmToKg(mm)));
    else if (!value.trim()) setKettle('');
  };
  const balances = useMutation({ mutationFn: saveZincMovementApi, retry: false,
    onSuccess: response => { pending.current = null; setMessage(response.message); setError(''); client.setQueryData(['zinc-stock'], response); client.invalidateQueries({ queryKey: ['zinc-stock-movements'] }); },
    onError: failure => { setError(failure?.response?.data?.message || 'Could not save stock balances.'); if (failure?.response?.status === 409) pending.current = null; },
  });
  if (!canAdjust) return <View style={styles.center}><Text style={styles.muted}>You do not have zinc settings access.</Text></View>;
  if (query.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>;
  const saveBalances = () => {
    const plantKg = parseZincAmount(plant, true); const kettleKg = parseZincAmount(kettle, true); const levelMm = parseZincAmount(kettleMm, true);
    if (plantKg == null || kettleKg == null || levelMm == null) return setError('Enter valid stock values with up to 3 decimals.');
    if (levelMm > ZINC_DEPTH_MM) return setError(`Kettle level cannot exceed ${ZINC_DEPTH_MM} mm.`);
    if (kettleKg > ZINC_DEPTH_MM * ZINC_KG_PER_MM) return setError('Kettle stock exceeds the configured tank capacity.');
    const body = { action: stock.initialized ? 'adjust' : 'initialize', plant_kg: plantKg, kettle_kg: kettleKg, kg_per_mm: ZINC_KG_PER_MM, note: stock.initialized ? 'Changed from Zinc Stock Settings' : 'Opening stock from Zinc Stock Settings', expected_revision: stock.revision, request_id: requestId() };
    pending.current = body; balances.mutate(body);
  };
  return <ScrollView style={styles.page} contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Zinc Stock Settings</Text><Text style={styles.muted}>Update verified plant and kettle balances.</Text>
    {message ? <Text style={styles.success}>{message}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
    {canAdjust && <View style={styles.card}><Text style={styles.heading}>{stock?.initialized ? 'Change stock balances' : 'Set opening stock'}</Text><TextInput mode="outlined" label={stock?.initialized ? 'Plant stock (kg)' : 'Opening plant stock (kg)'} value={plant} onChangeText={setPlant} keyboardType="decimal-pad" /><TextInput mode="outlined" label={stock?.initialized ? 'Kettle stock (kg)' : 'Opening kettle stock (kg)'} value={kettle} onChangeText={changeKettleKg} keyboardType="decimal-pad" /><Text style={styles.orText}>OR</Text><TextInput mode="outlined" label={stock?.initialized ? 'Kettle level (mm)' : 'Opening kettle level (mm)'} value={kettleMm} onChangeText={changeKettleMm} keyboardType="decimal-pad" /><Text style={styles.muted}>Enter kettle stock in kg or mm. Both values stay synchronized using 35.7 kg/mm at zinc density 7.14 g/cm³. Maximum level is {ZINC_DEPTH_MM.toLocaleString('en-IN')} mm ({(ZINC_DEPTH_MM * ZINC_KG_PER_MM).toLocaleString('en-IN')} kg).</Text><TouchableOpacity style={styles.button} disabled={balances.isPending} onPress={saveBalances}><Text style={styles.buttonText}>{balances.isPending ? 'Saving…' : stock?.initialized ? 'Save changed balances' : 'Save opening stock'}</Text></TouchableOpacity></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, gap: 16, paddingBottom: 40 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, title: { color: COLORS.text, fontSize: 24, fontWeight: '700' }, heading: { color: COLORS.text, fontSize: 16, fontWeight: '700' }, muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 }, orText: { color: COLORS.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' }, card: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 18, gap: 14 }, button: { minHeight: 48, backgroundColor: COLORS.accent, borderRadius: UI.radiusSmall, alignItems: 'center', justifyContent: 'center', padding: 14 }, buttonText: { color: COLORS.white, fontWeight: '700' }, success: { color: COLORS.success, fontWeight: '600' }, error: { color: COLORS.danger } });
