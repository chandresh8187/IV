import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getExpenseSettingsApi, saveExpenseSettingsApi } from '../../api/expenseReportApi';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';

const FIELDS = [
  ['rate_per_ton', 'Rate per 1 ton production'], ['staff_salary', 'Staff salary'],
  ['hardware_expense', 'Hardware expense per day'], ['maintenance_expense', 'Maintenance expense per day'],
  ['zinc_spray_expense', 'Zinc spray expense per day'], ['electricity_per_day', 'Electricity bill per day'],
  ['gas_bottle_rate', 'Gas bottle rate'], ['chemicals_per_day', 'Chemicals expense per day'],
  ['ms_wire_per_day', 'MS wire expense per day'], ['rent_expense', 'Rent expense per day'],
  ['acid_expense', 'Acid expense per day'], ['crane_expense', 'Crane expense per day'],
  ['other_expense', 'Other expense per day'],
];

export default function ExpenseSettingsScreen() {
  const user = useSelector(state => state.auth.user);
  const allowed = hasPermission(user, 'expense_report.settings');
  const { formMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [form, setForm] = useState(Object.fromEntries(FIELDS.map(([key]) => [key, '0'])));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['expense-settings'], queryFn: getExpenseSettingsApi, enabled: allowed, retry: false });
  useEffect(() => {
    if (query.data?.data) setForm(Object.fromEntries(FIELDS.map(([key]) => [key, String(query.data.data[key] ?? 0)])));
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: saveExpenseSettingsApi,
    onSuccess: response => { setMessage(response.message); setError(''); client.setQueryData(['expense-settings'], response); client.invalidateQueries({ queryKey: ['expense-report'] }); },
    onError: failure => setError(failure?.response?.data?.message || 'Could not save expense settings.'),
  });
  const save = () => {
    const invalid = FIELDS.some(([key]) => !/^\d+(\.\d{1,2})?$/.test(String(form[key]).trim()));
    if (invalid) return setError('Enter every expense as zero or a positive amount with up to 2 decimals.');
    mutation.mutate(Object.fromEntries(FIELDS.map(([key]) => [key, Number(form[key])])));
  };
  if (!allowed) return <View style={styles.center}><Text style={styles.muted}>You do not have expense settings access.</Text></View>;
  if (query.isLoading) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.content, centeredContent(formMaxWidth)]}>
      <Text style={styles.title}>Expense Settings</Text>
      <Text style={styles.muted}>Set the daily production costs used in the monthly report. Salary also includes the production rate calculation, and gas uses 850 × bottle rate.</Text>
      {message ? <Text style={styles.success}>{message}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.card}>{FIELDS.map(([key, label]) => <TextInput key={key} mode="outlined" label={label} value={form[key]} keyboardType="decimal-pad" onChangeText={value => { setForm(current => ({ ...current, [key]: value })); setError(''); }} />)}</View>
      <TouchableOpacity style={styles.button} disabled={mutation.isPending} onPress={save}><Text style={styles.buttonText}>{mutation.isPending ? 'Saving…' : 'Save expense settings'}</Text></TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 18, paddingBottom: 100, gap: 14 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '700' }, muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 }, card: { backgroundColor: COLORS.white, padding: 18, gap: 12, borderRadius: UI.radius },
  button: { minHeight: 50, backgroundColor: COLORS.accent, borderRadius: UI.radiusSmall, alignItems: 'center', justifyContent: 'center', padding: 14 }, buttonText: { color: COLORS.white, fontWeight: '700' }, error: { color: COLORS.danger }, success: { color: COLORS.success, fontWeight: '700' },
});
