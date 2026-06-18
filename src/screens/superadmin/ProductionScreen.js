import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { getProductionsApi, saveProductionApi } from '../../api/productionApi';
import { getShiftStatusApi } from '../../api/shiftApi';
import AnimatedRefreshButton from '../../components/AnimatedRefreshButton';
import { socket } from '../../socket/socket';
import { getAvailablePlanningApi } from '../../api/productionPlanningApi';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
  inputBorder: '#B8C4D6',
  lightBlue: '#EEF7FD',
};

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

function FormInput({ label, value, onChangeText, keyboardType = 'default' }) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      keyboardType={keyboardType}
      style={styles.input}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      textColor={COLORS.text}
      theme={PAPER_THEME}
    />
  );
}

export default function ProductionScreen() {
  const queryClient = useQueryClient();
  const emptyFullForm = {
    sr_no: '',
    challan_no: '',
    party_name: '',
    material: '',
    production_time: '',
    dipping_qty: '',
    kettle_temperature: '',
    ms_weight: '',
    gi_weight: '',
    c1: '',
    c2: '',
    c3: '',
    c4: '',
    c5: '',
  };

  const [fullForm, setFullForm] = useState(emptyFullForm);
  const [modalType, setModalType] = useState(null);
  const loggedUser = useSelector(state => state.auth.user);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [challanOpen, setChallanOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);

  const {
    data: shiftStatusData,
    isFetching: isShiftFetching,
    refetch: refetchShiftStatus,
  } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
  });

  const activeShift = shiftStatusData?.data?.active_shift || null;

  const activeShiftId = activeShift?.id || null;

  const isShiftActive = !!activeShiftId;

  const canManageProduction =
    (loggedUser?.role === 'superadmin' || loggedUser?.role === 'supervisor') &&
    isShiftActive;

  const { data, isLoading, isFetching, isRefetching, refetch } = useQuery({
    queryKey: ['productions', activeShiftId],
    queryFn: () =>
      getProductionsApi({
        limit: 100,
        shift_id: activeShiftId,
      }),
    enabled: !!activeShiftId,
  });

  useFocusEffect(
    useCallback(() => {
      refetchShiftStatus();
    }, [refetchShiftStatus]),
  );

  const saveMutation = useMutation({
    mutationFn: saveProductionApi,
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'Saved successfully');

      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      closeModal();
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
      );
    },
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleProductionUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleShiftUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handlePlanningUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });
    };

    socket.on('production_updated', handleProductionUpdated);
    socket.on('shift_updated', handleShiftUpdated);
    socket.on('production_planning_updated', handlePlanningUpdated);

    return () => {
      socket.off('production_updated', handleProductionUpdated);
      socket.off('shift_updated', handleShiftUpdated);
      socket.off('production_planning_updated', handlePlanningUpdated);
    };
  }, [queryClient]);

  const rows = activeShiftId ? data?.data?.table_data || data?.data || [] : [];

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['shift-status'] });

    const latestShift = await queryClient.fetchQuery({
      queryKey: ['shift-status'],
      queryFn: getShiftStatusApi,
    });

    const latestShiftId = latestShift?.data?.active_shift?.id;

    if (latestShiftId) {
      await queryClient.invalidateQueries({
        queryKey: ['productions', latestShiftId],
      });
    } else {
      queryClient.removeQueries({ queryKey: ['productions'] });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setFullForm(emptyFullForm);
  };

  const fillFromSrNo = srNo => {
    const found = rows.find(item => String(item.sr_no) === String(srNo));

    if (found) {
      setFullForm({
        sr_no: String(found.sr_no || ''),
        challan_no: found.challan_no || '',
        party_name: found.party_name || '',
        material: found.material || '',
        production_time: found.production_time || '',
        dipping_qty: String(found.dipping_qty || ''),
        kettle_temperature: String(found.kettle_temperature || ''),
        ms_weight: String(found.ms_weight || ''),
        gi_weight: String(found.gi_weight || ''),
        c1: String(Math.round(found.c1) || ''),
        c2: String(Math.round(found.c2) || ''),
        c3: String(Math.round(found.c3) || ''),
        c4: String(Math.round(found.c4) || ''),
        c5: String(Math.round(found.c5) || ''),
      });
    } else {
      setFullForm({
        ...emptyFullForm,
        sr_no: srNo,
      });
    }
  };

  const { data: availablePlanningData } = useQuery({
    queryKey: ['available-production-planning'],
    queryFn: getAvailablePlanningApi,
  });

  const availablePlanning = availablePlanningData?.data || [];

  const challanItems = availablePlanning.map(item => ({
    label: `${item.challan_no} | ${item.party_name} | Balance ${item.remaining_qty}`,
    value: String(item.id),
  }));

  const handlePlanningSelect = planningId => {
    const found = availablePlanning.find(
      item => String(item.id) === String(planningId),
    );

    if (!found) return;

    const partyWithThirdParty = found.third_party_name
      ? `${found.party_name} (${found.third_party_name})`
      : found.party_name;

    setFullForm(prev => ({
      ...prev,
      planning_id: String(found.id),
      challan_no: found.challan_no || '',
      party_name: partyWithThirdParty || '',
      material: found.material_description || '',
      material_description: found.material_description || '',
    }));
  };

  const saveFullEntry = async () => {
    saveMutation.mutate({
      entry_type: 'full',
      sr_no: fullForm.sr_no,
      challan_no: fullForm.challan_no,
      party_name: fullForm.party_name,
      material: fullForm.material,
      production_time: fullForm.production_time,
      dipping_qty: fullForm.dipping_qty,
      kettle_temperature: fullForm.kettle_temperature,
      ms_weight: fullForm.ms_weight,
      gi_weight: fullForm.gi_weight,
      c1: fullForm.c1,
      c2: fullForm.c2,
      c3: fullForm.c3,
      c4: fullForm.c4,
      c5: fullForm.c5,
    });

    queryClient.invalidateQueries({ queryKey: ['productions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    closeModal();
  };

  const previewZinc = (() => {
    const ms = Number(fullForm.ms_weight);
    const gi = Number(fullForm.gi_weight);

    if (!ms || !gi) return '';

    return (((gi - ms) / ms) * 100).toFixed(2);
  })();

  const previewAvgCoating = (() => {
    const values = [
      fullForm.c1,
      fullForm.c2,
      fullForm.c3,
      fullForm.c4,
      fullForm.c5,
    ]
      .map(Number)
      .filter(v => !isNaN(v) && v > 0);

    if (values.length === 0) return '';

    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  })();

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Live Production</Text>
          <Text style={styles.description}>Sr No wise production table</Text>
        </View>

        <AnimatedRefreshButton
          refreshing={isFetching}
          onPress={handleRefresh}
        />
      </View>
      <View style={styles.shiftInfoCard}>
        <Text style={styles.shiftInfoTitle}>
          {isShiftActive
            ? `${activeShift.shift_name?.toUpperCase()} SHIFT ACTIVE`
            : 'NO ACTIVE SHIFT'}
        </Text>

        <Text style={styles.shiftInfoText}>
          {isShiftActive
            ? `Shift Date: ${moment(activeShift.shift_date).format(
                'DD/MM/YYYY',
              )}`
            : 'Start shift first to add production entries.'}
        </Text>
      </View>
      <View style={styles.tableCard}>
        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.tableHeader}>
                <HeaderCell width={55}>Sr</HeaderCell>
                <HeaderCell width={90}>Challan</HeaderCell>
                <HeaderCell width={150}>Party</HeaderCell>
                <HeaderCell width={150}>Material</HeaderCell>
                <HeaderCell width={90}>Time</HeaderCell>
                <HeaderCell width={80}>Qty</HeaderCell>
                <HeaderCell width={90}>Temp</HeaderCell>
                <HeaderCell width={90}>MS</HeaderCell>
                <HeaderCell width={90}>GI</HeaderCell>
                <HeaderCell width={90}>Zn %</HeaderCell>
                <HeaderCell width={80}>C1</HeaderCell>
                <HeaderCell width={80}>C2</HeaderCell>
                <HeaderCell width={80}>C3</HeaderCell>
                <HeaderCell width={80}>C4</HeaderCell>
                <HeaderCell width={80}>C5</HeaderCell>
                <HeaderCell width={90}>Avg</HeaderCell>
              </View>

              <ScrollView>
                {rows.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      No production entries found
                    </Text>
                  </View>
                ) : (
                  rows.map((item, index) => (
                    <View
                      key={item.id || item.sr_no}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.altRow,
                      ]}
                    >
                      <Cell width={55} bold>
                        {item.sr_no}
                      </Cell>
                      <Cell width={90}>{item.challan_no || '-'}</Cell>
                      <Cell width={150}>{item.party_name || '-'}</Cell>
                      <Cell width={150}>{item.material || '-'}</Cell>
                      <Cell width={90}>{item.production_time || '-'}</Cell>
                      <Cell width={80}>{item.dipping_qty || '-'}</Cell>
                      <Cell width={90}>
                        {item.kettle_temperature
                          ? `${item.kettle_temperature}°`
                          : '-'}
                      </Cell>
                      <Cell width={90}>
                        {item?.ms_weight != null ? `${item.ms_weight} KG` : '-'}
                      </Cell>

                      <Cell width={90}>
                        {item?.gi_weight != null ? `${item.gi_weight} KG` : '-'}
                      </Cell>
                      <Cell width={90}>
                        {item?.zinc_percentage != null
                          ? `${item.zinc_percentage} %`
                          : '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c1)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c2)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c3)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c4)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c5)) || '-'}
                      </Cell>
                      <Cell width={90} bold>
                        {item.avg_coating
                          ? Math.round(Number(item.avg_coating))
                          : '-'}
                      </Cell>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>

      {canManageProduction && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setModalType('Full')}
        >
          <Plus size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <Modal visible={!!modalType} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Production Entry</Text>
              <Text style={styles.modalDesc}>
                Add / update all data by Sr No
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={closeModal}
              style={styles.closeBtn}
            >
              <X size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <FormCard title="Production Details">
              <FormInput
                label="Sr No"
                value={fullForm.sr_no}
                keyboardType="numeric"
                onChangeText={v => {
                  setFullForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v);
                }}
              />

              <FormDropdown
                label="Select Challan No"
                open={planningOpen}
                value={fullForm.planning_id}
                items={challanItems}
                setOpen={setPlanningOpen}
                onChangeValue={handlePlanningSelect}
                placeholder="Select Challan"
                zIndex={3000}
              />
              <FormInput
                label="Party Name"
                value={fullForm.party_name}
                editable={false}
              />

              <FormInput
                label="Material Description"
                value={fullForm.material_description}
                editable={false}
                multiline
              />

              <FormInput
                label="Production Time"
                value={fullForm.production_time}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, production_time: v }))
                }
              />

              <FormInput
                label="Dipping Qty"
                value={fullForm.dipping_qty}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, dipping_qty: v }))
                }
              />

              <FormInput
                label="Kettle Temperature °C"
                value={fullForm.kettle_temperature}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, kettle_temperature: v }))
                }
              />
            </FormCard>

            <FormCard title="Weight Details">
              <FormInput
                label="MS Weight 1 Nos"
                value={fullForm.ms_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, ms_weight: v }))
                }
              />

              <FormInput
                label="GI Weight 1 Nos"
                value={fullForm.gi_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, gi_weight: v }))
                }
              />

              {previewZinc !== '' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Zinc Consumption</Text>
                  <Text style={styles.previewValue}>{previewZinc}%</Text>
                </View>
              )}
            </FormCard>

            <FormCard title="Coating Details">
              <View style={styles.coatingRow}>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map((key, index) => (
                  <TextInput
                    key={key}
                    label={`C${index + 1}`}
                    value={fullForm[key]}
                    onChangeText={v =>
                      setFullForm(prev => ({ ...prev, [key]: v }))
                    }
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.coatingInput}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                  />
                ))}
              </View>

              {previewAvgCoating !== '' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Average Coating</Text>
                  <Text style={styles.previewValue}>{previewAvgCoating}</Text>
                </View>
              )}
            </FormCard>

            <SaveButton
              loading={saveMutation.isPending}
              title="SAVE PRODUCTION ENTRY"
              onPress={saveFullEntry}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function HeaderCell({ children, width }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );
}

function Cell({ children, width, bold }) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text
        style={[styles.cellText, bold && styles.boldCell]}
        numberOfLines={2}
      >
        {children}
      </Text>
    </View>
  );
}

function FormCard({ title, children }) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FormDropdown({
  label,
  open,
  value,
  items,
  setOpen,
  onChangeValue,
  placeholder,
  zIndex,
  disabled = false,
}) {
  return (
    <View style={[styles.dropdownWrap, { zIndex }]}>
      <Text style={styles.dropdownLabel}>{label}</Text>

      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={callback => {
          const selectedValue = callback(value);
          onChangeValue(selectedValue);
        }}
        placeholder={placeholder || label}
        disabled={disabled}
        listMode="SCROLLVIEW"
        searchable
        searchPlaceholder={`Search ${label}`}
        style={[styles.dropdown, disabled && styles.dropdownDisabled]}
        dropDownContainerStyle={styles.dropdownContainer}
        textStyle={styles.dropdownText}
        placeholderStyle={styles.dropdownPlaceholder}
        searchTextInputStyle={styles.dropdownSearch}
        arrowIconStyle={styles.dropdownIcon}
        tickIconStyle={styles.dropdownIcon}
      />
    </View>
  );
}

function SaveButton({ title, loading, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.saveBtn}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.saveText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  infoCard: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D8ECFA',
  },

  infoText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.primary,
  },

  description: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
  },

  tableCard: {
    flex: 1,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
  },

  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },

  headerCell: {
    height: 50,
    borderRightWidth: 1,
    borderRightColor: '#3A4375',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  headerCellText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  altRow: {
    backgroundColor: '#FAFBFD',
  },

  cell: {
    minHeight: 54,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },

  boldCell: {
    fontWeight: '900',
    color: COLORS.primary,
  },

  emptyBox: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '700',
  },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },

  optionCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
  },

  optionTitle: {
    color: COLORS.primary,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 16,
  },

  optionRow: {
    backgroundColor: COLORS.bg,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  optionRowTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '900',
  },

  optionRowDesc: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
  },

  cancelBtn: {
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },

  cancelText: {
    color: COLORS.gray,
    fontSize: 15,
    fontWeight: '900',
  },

  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
  },

  modalDesc: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 3,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: 16,
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 3,
    marginVertical: 10,
  },

  formTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },

  coatingRow: {
    flexDirection: 'row',
    gap: 8,
  },

  coatingInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  previewBox: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D8ECFA',
  },

  previewLabel: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '800',
  },

  previewValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  shiftInfoCard: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D8ECFA',
  },

  shiftInfoTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },

  shiftInfoText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  dropdownWrap: {
    marginVertical: 8,
  },

  dropdownLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  dropdown: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },

  dropdownDisabled: {
    backgroundColor: COLORS.bg,
    opacity: 0.7,
  },

  dropdownContainer: {
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    elevation: 8,
  },

  dropdownText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

  dropdownPlaceholder: {
    color: COLORS.gray,
    fontSize: 15,
    fontWeight: '600',
  },

  dropdownSearch: {
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    color: COLORS.text,
  },

  dropdownIcon: {
    tintColor: COLORS.primary,
  },
});
