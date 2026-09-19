import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  createProductionPlanningApi,
  updateProductionPlanningApi,
  deleteProductionPlanningApi,
  getProductionPlanningApi,
} from '../../api/productionPlanningApi';
import { getItemsApi } from '../../api/itemsApi';
import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import { COLORS, UI, PAPER_THEME } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { formatMaterialDescription } from '../../utils/format';
import { downloadProductionPlanningFile } from '../../utils/serverProductionReport';
import {
  emptyPlanningChallan,
  planningChallanNumber,
  planningChallanLabel,
  validatePlanningChallan,
} from '../../utils/planningChallan';
import ResponsiveGrid from '../../components/ResponsiveGrid';

function Button({ label, onPress, disabled, selected, primary }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        selected && styles.selected,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.white]}>{label}</Text>
    </TouchableOpacity>
  );
}
const qty = value => Number(value || 0).toLocaleString('en-IN');

export default function ProductionPlanningScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canManage = hasPermission(user, 'planning.manage');
  const client = useQueryClient();
  const { contentMaxWidth, formMaxWidth } = useResponsive();
  const [status, setStatus] = useState('pending');
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPlanningChallan);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const plans = useQuery({
    queryKey: ['production-planning', status],
    queryFn: () => getProductionPlanningApi({ status }),
  });
  const materials = useQuery({ queryKey: ['items'], queryFn: getItemsApi });
  const currentYear = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  const year =
    editing?.plan?.financial_year || currentYear.data?.data?.financial_year;
  const refresh = () =>
    [
      'production-planning',
      'available-production-planning',
      'correction-planning-items',
      'productions',
    ].forEach(key => client.invalidateQueries({ queryKey: [key] }));
  const close = () => {
    setVisible(false);
    setEditing(null);
    setForm(emptyPlanningChallan());
    setMaterialOpen(false);
  };
  const save = useMutation({
    mutationFn: ({ id, body }) =>
      id
        ? updateProductionPlanningApi({ id, body })
        : createProductionPlanningApi(body),
    onSuccess: () => {
      refresh();
      close();
    },
    onError: error =>
      Alert.alert(
        'Could not save planning',
        error?.response?.data?.message || 'Please try again.',
      ),
  });
  const remove = useMutation({
    mutationFn: deleteProductionPlanningApi,
    onSuccess: refresh,
    onError: error =>
      Alert.alert(
        'Could not delete planning',
        error?.response?.data?.message || 'Please try again.',
      ),
  });
  const openEdit = (plan, item) => {
    setEditing({ plan, item });
    setForm({
      ...item,
      planning_source: item.planning_source || 'in_house',
      challan_number: planningChallanNumber(item),
      item_id: Number(item.item_id),
      party_name: item.party_name || '',
      material_detail: item.material_detail || '',
      planned_qty: String(item.planned_qty),
      target_zinc_percentage: String(item.target_zinc_percentage ?? ''),
    });
    setMaterialOpen(false);
    setVisible(true);
  };
  const submit = () => {
    const error = validatePlanningChallan(form);
    if (error) return Alert.alert('Check planning details', error);
    if (!year)
      return Alert.alert(
        'Financial year required',
        'Set the current financial year before adding planning.',
      );
    const toPayload = item => ({
      ...(item.id ? { id: Number(item.id) } : {}),
      planning_source: item.planning_source || 'in_house',
      challan_number: String(
        item.challan_number ?? planningChallanNumber(item),
      ).trim(),
      party_name: (item.party_name || '').trim(),
      item_id: Number(item.item_id),
      material_detail: item.material_detail || '',
      planned_qty: Number(item.planned_qty),
      target_zinc_percentage: Number(item.target_zinc_percentage),
    });
    // Older grouped plans retain their linked items when one challan is edited.
    const items = editing
      ? editing.plan.items.map(item =>
          toPayload(Number(item.id) === Number(editing.item.id) ? form : item),
        )
      : [toPayload(form)];
    save.mutate({
      id: editing?.plan.id,
      body: {
        ...(!editing ? { financial_year_id: currentYear.data?.data?.id } : {}),
        items,
      },
    });
  };
  const openReport = async plan => {
    if (downloading != null) return;
    setDownloading(plan.id);
    try {
      const pdf = await downloadProductionPlanningFile({ id: plan.id });
      navigation.navigate('PdfViewer', {
        ...pdf,
        title: 'Planning report · ' + plan.challan_no,
      });
    } catch (error) {
      Alert.alert(
        'Could not open report',
        error?.response?.data?.message || error.message,
      );
    } finally {
      setDownloading(null);
    }
  };
  const field = (key, label, numeric = false) => (
    <TextInput
      key={key}
      testID={key}
      label={label}
      value={form[key]}
      onChangeText={value =>
        setForm(previous => ({ ...previous, [key]: value }))
      }
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      mode="outlined"
      theme={PAPER_THEME}
      style={styles.input}
      editable={!save.isPending}
      maxLength={
        key === 'challan_number'
          ? form.planning_source === 'other_party'
            ? 100
            : 40
          : 255
      }
    />
  );
  return (
    <SafeAreaView edges={['bottom']} style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          centeredContent(contentMaxWidth),
        ]}
        refreshControl={
          <RefreshControl
            refreshing={plans.isRefetching}
            onRefresh={plans.refetch}
          />
        }
      >
        <Text style={styles.title}>Production planning</Text>
        <Text style={styles.body}>
          Plan individual challans. Select any pending challan when adding
          production.
        </Text>
        <View style={styles.row}>
          <Button
            label="Pending"
            selected={status === 'pending'}
            onPress={() => setStatus('pending')}
          />
          <Button
            label="Completed"
            selected={status === 'completed'}
            onPress={() => setStatus('completed')}
          />
          {canManage && (
            <Button
              primary
              label="Add production planning"
              onPress={() => {
                setEditing(null);
                setForm(emptyPlanningChallan());
                setMaterialOpen(false);
                setVisible(true);
              }}
            />
          )}
        </View>
        {plans.isLoading && <ActivityIndicator color={COLORS.primary} />}
        {plans.isError && (
          <Button
            label="Could not load planning · Retry"
            onPress={plans.refetch}
          />
        )}
        {!plans.isLoading && !plans.isError && !plans.data?.data?.length && (
          <Text style={styles.body}>No {status} planning challans.</Text>
        )}
        <ResponsiveGrid minColumnWidth={400}>
          {(plans.data?.data || []).map(plan => (
            <View key={plan.id} style={styles.card}>
              {(plan.items || []).map(item => (
                <View key={item.id} style={styles.item}>
                  <Text style={styles.tag}>
                    {item.planning_source === 'other_party'
                      ? 'OTHER PARTY'
                      : 'IN-HOUSE'}{' '}
                    · {plan.financial_year}
                  </Text>
                  <Text style={styles.heading}>{item.challan_no}</Text>
                  <Text style={styles.body}>{item.party_name}</Text>
                  <Text style={styles.material}>
                    {formatMaterialDescription(item.material_description)}
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.body}>
                      Planned: {qty(item.planned_qty)} NOS
                    </Text>
                    <Text style={styles.body}>
                      Completed: {qty(item.completed_qty)} NOS
                    </Text>
                    <Text style={styles.remaining}>
                      Remaining: {qty(item.remaining_qty)} NOS
                    </Text>
                  </View>
                  <Text style={styles.body}>
                    Target zinc: {item.target_zinc_percentage}%
                  </Text>
                  {canManage && (
                    <Button
                      label="Edit challan"
                      onPress={() => openEdit(plan, item)}
                    />
                  )}
                </View>
              ))}
              {(plan.items || []).length > 1 && (
                <Text style={styles.body}>
                  Existing grouped plan: the report covers all{' '}
                  {plan.items.length} challans. Each is selectable separately in
                  Add Production.
                </Text>
              )}
              <View style={styles.row}>
                <Button
                  label={
                    downloading === plan.id ? 'Generating…' : 'Generate report'
                  }
                  disabled={downloading != null}
                  onPress={() => openReport(plan)}
                />
                {canManage && (
                  <Button
                    label={
                      (plan.items || []).length > 1
                        ? 'Delete grouped plan'
                        : 'Delete planning'
                    }
                    disabled={remove.isPending}
                    onPress={() =>
                      Alert.alert(
                        'Delete planning?',
                        'This removes the planning from active use. Existing production records are retained. For older grouped plans this affects every challan in the group.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => remove.mutate(plan.id),
                          },
                        ],
                      )
                    }
                  />
                )}
              </View>
            </View>
          ))}
        </ResponsiveGrid>
      </ScrollView>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => !save.isPending && close()}
      >
        <SafeAreaView style={styles.page}>
          <KeyboardAvoidingView
            style={styles.page}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.content,
                centeredContent(formMaxWidth),
              ]}
            >
              <Text style={styles.title}>
                {editing ? 'Edit planning challan' : 'Add production planning'}
              </Text>
              <Text style={styles.heading}>1. Select planning type</Text>
              <View style={styles.row}>
                <Button
                  label="In-house"
                  selected={form.planning_source === 'in_house'}
                  disabled={save.isPending}
                  onPress={() =>
                    setForm(previous =>
                      previous.planning_source === 'in_house'
                        ? previous
                        : {
                            ...previous,
                            planning_source: 'in_house',
                            challan_number: '',
                          },
                    )
                  }
                />
                <Button
                  label="Other party"
                  selected={form.planning_source === 'other_party'}
                  disabled={save.isPending}
                  onPress={() =>
                    setForm(previous =>
                      previous.planning_source === 'other_party'
                        ? previous
                        : {
                            ...previous,
                            planning_source: 'other_party',
                            challan_number: '',
                          },
                    )
                  }
                />
              </View>
              <Text style={styles.body}>
                {form.planning_source === 'other_party'
                  ? 'Enter the party’s exact challan reference. No prefix will be added.'
                  : 'In-house prefix: DC/' +
                    (year || '----') +
                    '/ · enter a reference such as 123-1 or 123-2.'}
              </Text>
              {field(
                'challan_number',
                form.planning_source === 'other_party'
                  ? 'Other-party challan number'
                  : 'Challan number (e.g. 123-1)',
                false,
              )}
              {!!form.challan_number && (
                <Text style={styles.remaining}>
                  {planningChallanLabel(form, year || '----')}
                </Text>
              )}
              {field(
                'party_name',
                form.planning_source === 'other_party'
                  ? 'Party name'
                  : 'In-house company name',
              )}
              <Text style={styles.heading}>
                2. Material and production target
              </Text>
              <DropDownPicker
                open={materialOpen}
                setOpen={setMaterialOpen}
                value={form.item_id}
                setValue={callback =>
                  setForm(previous => ({
                    ...previous,
                    item_id:
                      typeof callback === 'function'
                        ? callback(previous.item_id)
                        : callback,
                  }))
                }
                items={(materials.data?.data || []).map(item => ({
                  label: item.item_name,
                  value: Number(item.id),
                }))}
                listMode="MODAL"
                searchable
                placeholder="Select material (MS W BEAM, etc.)"
                disabled={save.isPending || materials.isLoading}
              />
              {materials.isError && (
                <Button
                  label="Retry loading materials"
                  onPress={materials.refetch}
                />
              )}
              {field('material_detail', 'Material description (optional)')}
              {field('planned_qty', 'Planned quantity (NOS)', true)}
              {field(
                'target_zinc_percentage',
                'Target zinc consumption (%)',
                true,
              )}
              <Text style={styles.body}>
                Financial year: {year || 'Not configured'}.{' '}
                {editing
                  ? 'Existing production links and completed quantities are preserved.'
                  : 'Each saved challan can be selected independently in Add Production.'}
              </Text>
              {currentYear.isError && !editing && (
                <Button
                  label="Retry current financial year"
                  onPress={currentYear.refetch}
                />
              )}
              <Button
                primary
                label={save.isPending ? 'Saving…' : 'Save planning'}
                disabled={save.isPending || !year}
                onPress={submit}
              />
              <Button
                label="Cancel"
                disabled={save.isPending}
                onPress={close}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40, gap: 16 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '700' },
  heading: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  body: { color: COLORS.gray, fontSize: 13, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: UI.radius,
    padding: 18,
    gap: 16,
  },
  item: {
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tag: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  material: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  remaining: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 21,
  },
  button: {
    padding: 13,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    minHeight: 46,
  },
  buttonText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  primary: { backgroundColor: COLORS.primary },
  selected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  white: { color: COLORS.white },
  disabled: { opacity: 0.5 },
  input: { backgroundColor: COLORS.white },
});
