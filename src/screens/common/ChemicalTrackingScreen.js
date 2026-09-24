import React, { useCallback, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Info } from 'lucide-react-native';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getChemicalChecksApi, saveChemicalCheckApi } from '../../api/chemicalChecksApi';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { downloadChemicalChecksReport } from '../../utils/serverChemicalChecksReport';

const pad = value => String(value).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const currentMonth = () => today().slice(0, 7);
const monthLabel = value => new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const moveMonth = (value, delta) => { const d = new Date(`${value}-01T00:00:00`); d.setMonth(d.getMonth() + delta); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const emptyForm = () => ({ inspection_date: today(), flux_ph: '', flux_density: '', flux_temperature_c: '', acid_ph: '', acid_density: '', note: '' });
const reading = value => value == null || value === '' ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 4 });
const parseDate = value => new Date(`${value}T00:00:00`);
const formatDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function ChemicalTrackingScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'chemical_checks.view');
  const canManage = hasPermission(user, 'chemical_checks.manage');
  const canReport = hasPermission(user, 'chemical_checks.report');
  const { contentMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const query = useQuery({ queryKey: ['chemical-checks', month], queryFn: () => getChemicalChecksApi({ month }), enabled: canView, retry: false });
  const refetch = query.refetch;
  useFocusEffect(useCallback(() => { if (canView) refetch(); }, [canView, refetch]));
  const mutation = useMutation({
    mutationFn: saveChemicalCheckApi,
    onSuccess: (response, variables) => {
      setSuccess(response.message || 'Chemical check saved.'); setError(''); setForm(emptyForm());
      setMonth(variables.inspection_date.slice(0, 7));
      client.invalidateQueries({ queryKey: ['chemical-checks'] });
    },
    onError: failure => setError(failure?.response?.data?.message || 'Could not save chemical check.'),
  });
  const fields = useMemo(() => [
    ['flux_ph', 'Flux pH'], ['flux_density', 'Flux density (g/cm³)'], ['flux_temperature_c', 'Flux temperature (°C)'],
    ['acid_ph', 'Acid pH'], ['acid_density', 'Acid density (g/cm³)'],
  ], []);
  const save = () => {
    setSuccess(''); setError('');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.inspection_date)) return setError('Enter the date as YYYY-MM-DD.');
    if (fields.some(([key]) => form[key].trim() === '' || !Number.isFinite(Number(form[key])))) return setError('Enter all pH, density, and flux temperature readings.');
    mutation.mutate({ ...form, ...Object.fromEntries(fields.map(([key]) => [key, Number(form[key])])) });
  };
  const generate = async () => {
    setGenerating(true);
    try { const pdf = await downloadChemicalChecksReport(month); navigation.navigate('PdfViewer', { ...pdf, title: `Chemical Checks · ${monthLabel(month)}` }); }
    catch (failure) { Alert.alert('Could not generate PDF', failure?.response?.data?.message || failure?.message || 'Please try again.'); }
    finally { setGenerating(false); }
  };
  const selectInspectionDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setForm(current => ({ ...current, inspection_date: formatDate(selectedDate) }));
    setError('');
  };
  if (!canView) return <View style={styles.center}><Text style={styles.muted}>You do not have chemical tracking access.</Text></View>;
  const rows = query.data?.data || [];
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={refetch} />}>
      <View><Text style={styles.title}>Chemical Tracking</Text><Text style={styles.muted}>Daily flux temperature and flux and acid pH and density checks</Text></View>
      <View style={styles.monthRow}><TouchableOpacity style={styles.secondaryButton} onPress={() => setMonth(moveMonth(month, -1))}><Text style={styles.secondaryText}>Previous</Text></TouchableOpacity><Text style={styles.month}>{monthLabel(month)}</Text><TouchableOpacity style={styles.secondaryButton} disabled={month >= currentMonth()} onPress={() => setMonth(moveMonth(month, 1))}><Text style={styles.secondaryText}>Next</Text></TouchableOpacity></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}{success ? <Text style={styles.success}>{success}</Text> : null}
      {canManage && <View style={styles.card}><Text style={styles.sectionTitle}>Add daily check</Text><View style={styles.infoBox}><Info size={20} color={COLORS.accentDark} /><View style={styles.infoContent}><Text style={styles.infoTitle}>Flux pH guidance</Text><Text style={styles.infoText}>Maintain the flux pH between 4.0 and 5.0.</Text></View></View><View><Text style={styles.dateLabel}>Inspection date</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Select inspection date" style={styles.dateButton} onPress={() => setShowDatePicker(true)}><View><Text style={styles.dateValue}>{parseDate(form.inspection_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Text><Text style={styles.dateHint}>Tap to select a date</Text></View><CalendarDays size={22} color={COLORS.accent} /></TouchableOpacity></View>
        {showDatePicker && <View style={styles.datePickerWrap}><DateTimePicker value={parseDate(form.inspection_date)} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={selectInspectionDate} />{Platform.OS === 'ios' && <TouchableOpacity style={styles.dateDoneButton} onPress={() => setShowDatePicker(false)}><Text style={styles.secondaryText}>Done</Text></TouchableOpacity>}</View>}
        <View style={styles.fieldGrid}>{fields.map(([key, label]) => <TextInput key={key} style={styles.field} mode="outlined" label={label} value={form[key]} keyboardType="decimal-pad" onChangeText={value => setForm(current => ({ ...current, [key]: value }))} />)}</View>
        <TextInput mode="outlined" label="Note (optional)" value={form.note} maxLength={255} multiline onChangeText={value => setForm(current => ({ ...current, note: value }))} />
        <TouchableOpacity style={styles.button} disabled={mutation.isPending} onPress={save}>{mutation.isPending ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Save chemical check</Text>}</TouchableOpacity>
      </View>}
      <View style={styles.headerRow}><View><Text style={styles.sectionTitle}>Daily entries</Text><Text style={styles.muted}>{rows.length} check{rows.length === 1 ? '' : 's'}</Text></View>{canReport && <TouchableOpacity style={styles.buttonSmall} disabled={generating} onPress={generate}>{generating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Generate PDF</Text>}</TouchableOpacity>}</View>
      {query.isLoading ? <ActivityIndicator color={COLORS.accent} /> : query.isError ? <TouchableOpacity style={styles.card} onPress={refetch}><Text style={styles.error}>{query.error?.response?.data?.message || 'Could not load chemical checks. Tap to retry.'}</Text></TouchableOpacity> : rows.length ? rows.map(item => <View style={styles.card} key={item.id}><View style={styles.headerRow}><Text style={styles.entryDate}>{new Date(`${item.inspection_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text><Text style={styles.checkedBy}>{item.checked_by_name}</Text></View><View style={styles.readingGrid}><Reading label="Flux pH" value={reading(item.flux_ph)} /><Reading label="Flux density" value={`${reading(item.flux_density)} g/cm³`} /><Reading label="Flux temperature" value={item.flux_temperature_c == null ? '—' : `${reading(item.flux_temperature_c)} °C`} /><Reading label="Acid pH" value={reading(item.acid_ph)} /><Reading label="Acid density" value={`${reading(item.acid_density)} g/cm³`} /></View>{item.note ? <Text style={styles.note}>{item.note}</Text> : null}<Text style={styles.timestamp}>Checked {item.created_at}</Text></View>) : <View style={styles.card}><Text style={styles.muted}>No chemical checks recorded for this month.</Text></View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function Reading({ label, value }) { return <View style={styles.reading}><Text style={styles.readingLabel}>{label}</Text><Text style={styles.readingValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:COLORS.bg},content:{padding:18,paddingBottom:80,gap:16},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},title:{color:COLORS.text,fontSize:25,fontWeight:'700'},muted:{color:COLORS.muted,fontSize:13,lineHeight:20},monthRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},month:{color:COLORS.text,fontWeight:'800',fontSize:16},secondaryButton:{backgroundColor:COLORS.accentSoft,borderRadius:UI.radiusSmall,paddingHorizontal:14,minHeight:40,justifyContent:'center'},secondaryText:{color:COLORS.accentDark,fontWeight:'700'},card:{backgroundColor:COLORS.white,borderRadius:UI.radius,padding:18,gap:13,...UI.shadow},sectionTitle:{color:COLORS.text,fontSize:18,fontWeight:'800'},infoBox:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:COLORS.accentSoft,borderRadius:UI.radiusSmall,padding:13},infoContent:{flex:1,gap:2},infoTitle:{color:COLORS.accentDark,fontSize:13,fontWeight:'800'},infoText:{color:COLORS.text,fontSize:13,lineHeight:19},dateLabel:{color:COLORS.muted,fontSize:12,fontWeight:'600',marginBottom:6},dateButton:{minHeight:58,borderWidth:1,borderColor:COLORS.inputBorder,borderRadius:UI.radiusSmall,paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.white},dateValue:{color:COLORS.text,fontSize:15,fontWeight:'700'},dateHint:{color:COLORS.muted,fontSize:11,marginTop:3},datePickerWrap:{backgroundColor:COLORS.surfaceMuted,borderRadius:UI.radiusSmall,padding:8},dateDoneButton:{alignSelf:'flex-end',paddingHorizontal:16,paddingVertical:10},fieldGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},field:{flexGrow:1,flexBasis:150},button:{minHeight:50,borderRadius:UI.radiusSmall,backgroundColor:COLORS.accent,alignItems:'center',justifyContent:'center',paddingHorizontal:18},buttonSmall:{minHeight:44,borderRadius:UI.radiusSmall,backgroundColor:COLORS.accent,alignItems:'center',justifyContent:'center',paddingHorizontal:15},buttonText:{color:COLORS.white,fontWeight:'700'},headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},entryDate:{color:COLORS.text,fontSize:16,fontWeight:'800'},checkedBy:{color:COLORS.primary,fontWeight:'700',fontSize:13},readingGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},reading:{backgroundColor:COLORS.surfaceMuted,borderRadius:UI.radiusSmall,padding:12,flexGrow:1,flexBasis:135},readingLabel:{color:COLORS.muted,fontSize:11},readingValue:{color:COLORS.text,fontSize:16,fontWeight:'800',marginTop:5},note:{color:COLORS.text,fontSize:13,lineHeight:20},timestamp:{color:COLORS.muted,fontSize:11},error:{color:COLORS.danger},success:{color:COLORS.success,fontWeight:'700'},
});
