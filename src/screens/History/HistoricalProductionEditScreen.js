import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { updateHistoricalProductionApi } from '../../api/historyApi';
import { getProductionPlanningApi } from '../../api/productionPlanningApi';
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
  const planningQuery = useQuery({
    queryKey: ['history-edit-planning'],
    queryFn: () => getProductionPlanningApi(),
  });
  const planningChoices = (planningQuery.data?.data || [])
    .filter(plan => plan.status !== 'canceled')
    .flatMap(plan => (plan.items || []).map(planItem => ({
      ...planItem,
      planning_id: plan.id,
      planning_item_id: planItem.id,
    })));
  const selectablePlanning = item.planning_item_id &&
    !planningChoices.some(planItem => Number(planItem.planning_item_id) === Number(item.planning_item_id))
    ? [...planningChoices, { ...item, planning_item_id: item.planning_item_id, material_description: item.material, remaining_qty: 0 }]
    : planningChoices;
  const activePlanning = selectablePlanning.find(planItem => Number(planItem.planning_item_id) === Number(form.planning_item_id)) || null;
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
        'history-edit-planning',
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
    mutation.mutate(
      {
        planning_item_id: form.planning_item_id,
        ...Object.fromEntries(
        editableFields.map(key => [
          key,
          key === 'dipping_qty' ? quantity : form[key],
        ]),
        ),
      },
    );
  };
  return (
    <ProductionEntryForm
      fullForm={form}
      setFullForm={setForm}
      formExistingEntry={item}
      canManageAllProduction
      selectablePlanning={selectablePlanning}
      activePlanning={activePlanning}
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
