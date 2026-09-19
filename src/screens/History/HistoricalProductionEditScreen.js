import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHistoricalProductionApi } from '../../api/historyApi';
import ProductionEntryForm from '../../components/ProductionEntryForm';

const editableFields = [
  'production_time',
  'dipping_qty',
  'kettle_temperature',
  'ms_weight',
  'gi_weight',
  'c1',
  'c2',
  'c3',
  'c4',
  'c5',
];

export default function HistoricalProductionEditScreen({ route, navigation }) {
  const { item, date, shift_name } = route.params;
  const [form, setForm] = useState(() => ({
    ...item,
    entry_id: item.id,
    material_description: item.material_description || item.material || '',
    ...Object.fromEntries(
      editableFields.map(key => [
        key,
        item[key] == null ? '' : String(item[key]),
      ]),
    ),
  }));
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: body => updateHistoricalProductionApi({ id: item.id, body }),
    onSuccess: res => {
      [
        'history-shift-table',
        'history-date-summary',
        'history-dates',
        'history-material-summary',
        'history-planning-summary',
        'history-party-summary',
        'productions',
        'production-planning',
        'available-production-planning',
        'correction-planning-items',
        'contractor-report',
        'dashboard',
      ].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
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
  const save = () => {
    if (!form.production_time || !String(form.dipping_qty).trim()) {
      Alert.alert(
        'Required',
        'Please enter production time and dipping quantity.',
      );
      return;
    }
    const quantity = Number(form.dipping_qty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Dipping quantity must be a whole number greater than 0.',
      );
      return;
    }
    // Keep the historical entry's original shift and planning links. This endpoint
    // edits by immutable entry ID, never by the current live shift.
    mutation.mutate(
      Object.fromEntries(
        editableFields.map(key => [
          key,
          key === 'dipping_qty' ? quantity : form[key],
        ]),
      ),
    );
  };
  return (
    <ProductionEntryForm
      fullForm={form}
      setFullForm={setForm}
      formExistingEntry={item}
      canManageAllProduction
      subtitle={
        date +
        ' · ' +
        String(shift_name).toUpperCase() +
        ' shift · Entry #' +
        item.id
      }
      loading={mutation.isPending}
      onSave={save}
      onClose={() => {
        if (!mutation.isPending) navigation.goBack();
      }}
    />
  );
}
