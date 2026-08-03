import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHistoricalProductionApi } from '../../api/historyApi';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const fields = [
  ['challan_no', 'Challan No', 'default'],
  ['party_name', 'Party Name', 'default'],
  ['material', 'Material', 'default'],
  ['production_time', 'Production Time (HH:mm:ss)', 'default'],
  ['dipping_qty', 'Dipping Qty', 'numeric'],
  ['kettle_temperature', 'Kettle Temperature', 'decimal-pad'],
  ['ms_weight', 'MS Weight 1 Nos', 'decimal-pad'],
  ['gi_weight', 'GI Weight 1 Nos', 'decimal-pad'],
  ['c1', 'Coating C1', 'decimal-pad'],
  ['c2', 'Coating C2', 'decimal-pad'],
  ['c3', 'Coating C3', 'decimal-pad'],
  ['c4', 'Coating C4', 'decimal-pad'],
  ['c5', 'Coating C5', 'decimal-pad'],
];

export default function HistoricalProductionEditScreen({ route, navigation }) {
  const { item, date, shift_name } = route.params;
  const [form, setForm] = useState(() =>
    fields.reduce((result, [key]) => ({ ...result, [key]: item[key] == null ? '' : String(item[key]) }), {}),
  );
  const queryClient = useQueryClient();
  const { formMaxWidth } = useResponsive();
  const mutation = useMutation({
    mutationFn: body => updateHistoricalProductionApi({ id: item.id, body }),
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['history-shift-table', date, shift_name] });
      queryClient.invalidateQueries({ queryKey: ['history-date-summary', date] });
      queryClient.invalidateQueries({ queryKey: ['history-dates'] });
      Alert.alert('Updated', res?.message || 'Historical production updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: error => Alert.alert('Error', error?.response?.data?.message || 'Could not update production'),
  });

  return (
    <ScrollView contentContainerStyle={[styles.container, centeredContent(formMaxWidth)]}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Edit SR {item.sr_no}</Text>
        <Text style={styles.subtitle}>{date} • {String(shift_name).toUpperCase()} shift</Text>
      </View>
      <View style={styles.formCard}>
        {fields.map(([key, label, keyboardType]) => (
          <TextInput
            key={key}
            label={label}
            value={form[key]}
            keyboardType={keyboardType}
            onChangeText={value => setForm(prev => ({ ...prev, [key]: value }))}
            mode="outlined"
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
          />
        ))}
      </View>
      <TouchableOpacity
        style={styles.saveBtn}
        disabled={mutation.isPending}
        onPress={() => mutation.mutate(form)}
      >
        {mutation.isPending ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>SAVE CHANGES</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: COLORS.bg },
  headerCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.gray, marginTop: 4, fontWeight: '700' },
  formCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15 },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },
  saveBtn: { height: 54, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
