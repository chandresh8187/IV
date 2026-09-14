import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHistoricalProductionApi } from '../../api/historyApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';
import {
  formatMaterialDescription,
  formatTime12Hour,
  formatTimeForApi,
  parseTimeForPicker,
} from '../../utils/format';

const fields = [
  ['challan_no', 'Challan No', 'default'],
  ['party_name', 'Party Name', 'default'],
  ['material', 'Material', 'default'],
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
  const [form, setForm] = useState(() => ({
    production_time:
      item.production_time == null ? '' : String(item.production_time),
    ...fields.reduce(
      (result, [key]) => ({
        ...result,
        [key]:
          key === 'material'
            ? formatMaterialDescription(item[key])
            : item[key] == null
            ? ''
            : String(item[key]),
      }),
      {},
    ),
  }));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const queryClient = useQueryClient();
  const { workspaceFormMaxWidth } = useResponsive();
  const mutation = useMutation({
    mutationFn: body => updateHistoricalProductionApi({ id: item.id, body }),
    onSuccess: res => {
      queryClient.invalidateQueries({
        queryKey: ['history-shift-table', date, shift_name],
      });
      queryClient.invalidateQueries({
        queryKey: ['history-date-summary', date],
      });
      queryClient.invalidateQueries({ queryKey: ['history-dates'] });
      Alert.alert('Updated', res?.message || 'Historical production updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not update production',
      ),
  });

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(workspaceFormMaxWidth),
      ]}
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>Edit entry #{item.id}</Text>
        <Text style={styles.subtitle}>
          {date} • {String(shift_name).toUpperCase()} shift
        </Text>
      </View>
      <View style={styles.formCard}>
        <TouchableOpacity onPress={() => setShowTimePicker(true)}>
          <View pointerEvents="none">
            <TextInput
              label="Production Time"
              value={formatTime12Hour(
                form.production_time,
                'Select production time',
              )}
              mode="outlined"
              editable={false}
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
              right={<TextInput.Icon icon="clock-outline" />}
            />
          </View>
        </TouchableOpacity>
        {showTimePicker && (
          <DateTimePicker
            value={parseTimeForPicker(form.production_time)}
            mode="time"
            display="clock"
            is24Hour={false}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (event?.type === 'set' && selectedTime) {
                setForm(prev => ({
                  ...prev,
                  production_time: formatTimeForApi(selectedTime),
                }));
              }
            }}
          />
        )}
        <ResponsiveGrid minColumnWidth={280}>
          {fields.map(([key, label, keyboardType]) => (
            <TextInput
              key={key}
              label={label}
              value={form[key]}
              keyboardType={keyboardType}
              onChangeText={value =>
                setForm(prev => ({ ...prev, [key]: value }))
              }
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />
          ))}
        </ResponsiveGrid>
      </View>
      <TouchableOpacity
        style={styles.saveBtn}
        disabled={mutation.isPending}
        onPress={() => mutation.mutate(form)}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveText}>SAVE CHANGES</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: COLORS.bg },
  headerCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 16,
    marginBottom: 12,
  },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: COLORS.gray, marginTop: 4, fontWeight: '700' },
  formCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 15,
  },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },
  saveBtn: {
    height: 54,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
});
