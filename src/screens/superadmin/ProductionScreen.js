import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  Clock3,
  Plus,
  X,
} from 'lucide-react-native';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { formatNumber } from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';

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

function FormInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  editable = true,
  multiline = false,
  numberOfLines = 1,
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      keyboardType={keyboardType}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={[styles.input, !editable && styles.inputDisabled]}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      textColor={COLORS.text}
      theme={PAPER_THEME}
    />
  );
}

const emptyFullForm = {
  sr_no: '',
  planning_id: '',
  challan_no: '',
  party_name: '',
  material: '',
  material_description: '',
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

export default function ProductionScreen() {
  const queryClient = useQueryClient();
  const { formMaxWidth } = useResponsive();

  const [fullForm, setFullForm] = useState(emptyFullForm);
  const [modalType, setModalType] = useState(null);
  const loggedUser = useSelector(state => state.auth.user);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [showProductionTimePicker, setShowProductionTimePicker] =
    useState(false);
  const [productionTimePickerValue, setProductionTimePickerValue] = useState(
    new Date(),
  );

  const {
    data: shiftStatusData,
    refetch: refetchShiftStatus,
    isError: shiftStatusError,
    error: shiftStatusErrorObj,
  } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
  });

  const activeShift = shiftStatusData?.data?.active_shift || null;

  const activeShiftId = activeShift?.id || null;
  const isShiftActive = !!activeShiftId;
  const productionAllowed = shiftStatusData?.data?.production_allowed !== false;
  const plantStatus = shiftStatusData?.data?.plant_status || 'running';
  // Normalized so a role stored as "Supervisor" / " superadmin " on the
  // server still unlocks the entry button.
  const role = String(loggedUser?.role || '')
    .toLowerCase()
    .trim();
  const isSuperAdmin = role === 'superadmin';
  const isPlantManager = role === 'plant_manager';

  const canManageProduction =
    (isSuperAdmin || isPlantManager || role === 'supervisor') &&
    isShiftActive &&
    productionAllowed;

  const { data, isLoading, isFetching } = useQuery({
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
    socket.on('plant_status_updated', handleShiftUpdated);
    socket.on('production_planning_updated', handlePlanningUpdated);

    return () => {
      socket.off('production_updated', handleProductionUpdated);
      socket.off('shift_updated', handleShiftUpdated);
      socket.off('plant_status_updated', handleShiftUpdated);
      socket.off('production_planning_updated', handlePlanningUpdated);
    };
  }, [queryClient]);

  const rows = activeShiftId ? data?.data?.table_data || data?.data || [] : [];

  // Next serial number for this shift, based on the highest Sr No already
  // filled. Supervisors always get this assigned automatically; only the
  // superadmin can type a Sr No (e.g. to pull up and correct an old entry).
  const nextSrNo = useMemo(
    () =>
      rows.reduce((max, item) => Math.max(max, Number(item.sr_no) || 0), 0) + 1,
    [rows],
  );

  const openEntryModal = () => {
    setFullForm(
      isSuperAdmin
        ? emptyFullForm
        : { ...emptyFullForm, sr_no: String(nextSrNo) },
    );
    setModalType('Full');
  };

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
    setShowProductionTimePicker(false);
    setModalType(null);
    setFullForm(emptyFullForm);
  };

  const openProductionTimePicker = () => {
    const selectedDate = new Date();

    if (fullForm.production_time) {
      const parsedTime = moment(
        fullForm.production_time,
        ['HH:mm:ss', 'HH:mm', 'hh:mm A'],
        true,
      );

      if (parsedTime.isValid()) {
        selectedDate.setHours(parsedTime.hours());
        selectedDate.setMinutes(parsedTime.minutes());
        selectedDate.setSeconds(0);
        selectedDate.setMilliseconds(0);
      }
    }

    setProductionTimePickerValue(selectedDate);
    setShowProductionTimePicker(true);
  };

  const selectProductionTime = date => {
    if (!date) {
      return;
    }

    const selectedDate = new Date(date);

    setProductionTimePickerValue(selectedDate);
    setFullForm(prev => ({
      ...prev,
      production_time: moment(selectedDate).format('HH:mm:ss'),
    }));
    setShowProductionTimePicker(false);
  };

  // Fills the whole form from an existing row when the user types a Sr No
  // that already has data for this shift. Keeps challan_no/party/material
  // in sync so the challan dropdown can display the right selection even
  // if that challan is no longer "available" (e.g. already completed).
  const fillFromSrNo = srNo => {
    const found = rows.find(item => String(item.sr_no) === String(srNo));

    if (found) {
      setFullForm({
        sr_no: String(found.sr_no || ''),
        planning_id: found.planning_id ? String(found.planning_id) : '',
        challan_no: found.challan_no || '',
        party_name: found.party_name || '',
        material: found.material || '',
        material_description:
          found.material || found.material_description || '',
        production_time: found.production_time || '',
        dipping_qty: String(found.dipping_qty || ''),
        kettle_temperature: String(found.kettle_temperature || ''),
        ms_weight: String(found.ms_weight || ''),
        gi_weight: String(found.gi_weight || ''),
        c1: found.c1 != null ? formatNumber(found.c1, '') : '',
        c2: found.c2 != null ? formatNumber(found.c2, '') : '',
        c3: found.c3 != null ? formatNumber(found.c3, '') : '',
        c4: found.c4 != null ? formatNumber(found.c4, '') : '',
        c5: found.c5 != null ? formatNumber(found.c5, '') : '',
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

  // Dropdown is keyed by challan_no (stable across both "available planning"
  // and "already-used historical" records) rather than planning_id, so a
  // Sr No fill can always resolve to a visible selection.
  const challanItems = useMemo(() => {
    const items = availablePlanning.map(item => ({
      label: `${item.challan_no} | ${item.party_name} | Balance ${item.remaining_qty}`,
      value: item.challan_no,
    }));

    const currentChallan = fullForm.challan_no;
    const alreadyListed = items.some(item => item.value === currentChallan);

    if (currentChallan && !alreadyListed) {
      items.unshift({
        label: `${currentChallan} | ${fullForm.party_name || 'Already used'}`,
        value: currentChallan,
      });
    }

    return items;
  }, [availablePlanning, fullForm.challan_no, fullForm.party_name]);

  const handlePlanningSelect = challanNo => {
    const found = availablePlanning.find(item => item.challan_no === challanNo);

    if (!found) {
      // Selecting a historical/already-used challan (came from a Sr No fill) -
      // its party/material are already correct in state, just confirm the value.
      setFullForm(prev => ({ ...prev, challan_no: challanNo }));
      return;
    }

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

  // The mutation's onSuccess handles invalidation and closing the modal.
  // Closing here (before the request settles) would wipe the form even
  // when the save fails, losing everything the user typed.
  const saveFullEntry = () => {
    saveMutation.mutate({
      entry_type: 'full',
      sr_no: fullForm.sr_no,
      planning_id: fullForm.planning_id || undefined,
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
      .filter(v => v !== '' && v !== null && v !== undefined)
      .map(Number)
      .filter(v => Number.isFinite(v) && v >= 0);

    if (values.length === 0) return '';

    return formatNumber(values.reduce((a, b) => a + b, 0) / values.length, '');
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
      <View
        style={[
          styles.shiftInfoCard,
          shiftStatusError && styles.shiftErrorCard,
        ]}
      >
        <Text
          style={[
            styles.shiftInfoTitle,
            shiftStatusError && styles.shiftErrorTitle,
          ]}
        >
          {shiftStatusError
            ? 'COULD NOT LOAD SHIFT STATUS'
            : !productionAllowed
            ? `PLANT ${String(plantStatus).toUpperCase()}`
            : isShiftActive
            ? `${(
                activeShift.shift_name ||
                shiftStatusData?.data?.current_shift ||
                ''
              ).toUpperCase()} SHIFT ACTIVE`
            : 'NO ACTIVE SHIFT'}
        </Text>

        <Text style={styles.shiftInfoText}>
          {shiftStatusError
            ? shiftStatusErrorObj?.response?.data?.message ||
              shiftStatusErrorObj?.message ||
              'Check your internet connection and pull refresh.'
            : !productionAllowed
            ? shiftStatusData?.data?.plant_notice?.expected_restart_at ||
              'Production entry is blocked until the plant is marked running.'
            : isShiftActive
            ? `Shift Date: ${moment(activeShift.shift_date).format(
                'DD/MM/YYYY',
              )}`
            : 'Automatic shift is not available. Pull refresh and try again.'}
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
                        {item?.ms_weight != null
                          ? `${parseFloat(item.ms_weight).toFixed(3)} KG`
                          : '-'}
                      </Cell>
                      <Cell width={90}>
                        {item?.gi_weight != null
                          ? `${parseFloat(item.gi_weight).toFixed(3)} KG`
                          : '-'}
                      </Cell>
                      <Cell width={90}>
                        {item?.zinc_percentage != null
                          ? `${parseFloat(item.zinc_percentage).toFixed(2)} %`
                          : '-'}
                      </Cell>
                      <Cell width={80}>{formatNumber(item.c1)}</Cell>
                      <Cell width={80}>{formatNumber(item.c2)}</Cell>
                      <Cell width={80}>{formatNumber(item.c3)}</Cell>
                      <Cell width={80}>{formatNumber(item.c4)}</Cell>
                      <Cell width={80}>{formatNumber(item.c5)}</Cell>
                      <Cell width={90} bold>
                        {item.avg_coating != null
                          ? formatNumber(item.avg_coating)
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
          onPress={openEntryModal}
        >
          <Plus size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <Modal
        visible={modalType === 'Full'}
        animationType="slide"
        onRequestClose={closeModal}
      >
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

          <ScrollView
            contentContainerStyle={[
              styles.modalBody,
              centeredContent(formMaxWidth),
            ]}
          >
            <FormCard title="Production Details">
              <FormInput
                label={isSuperAdmin ? 'Sr No' : 'Sr No (auto)'}
                value={fullForm.sr_no}
                keyboardType="numeric"
                editable={isSuperAdmin}
                onChangeText={v => {
                  setFullForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v);
                }}
              />

              {isSuperAdmin && (
                <Text style={styles.srHint}>
                  Type an existing Sr No to load that entry for update.
                </Text>
              )}

              <FormDropdown
                label="Select Challan No"
                open={planningOpen}
                value={fullForm.challan_no}
                items={challanItems}
                setOpen={setPlanningOpen}
                onChangeValue={handlePlanningSelect}
                placeholder="Select Challan"
                zIndex={3000}
                icon={<ClipboardList size={16} color={COLORS.primary} />}
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
                numberOfLines={2}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={openProductionTimePicker}
              >
                <View pointerEvents="none">
                  <TextInput
                    label="Production Time"
                    value={
                      fullForm.production_time
                        ? moment(fullForm.production_time, [
                            'HH:mm:ss',
                            'HH:mm',
                            'hh:mm A',
                          ]).format('hh:mm A')
                        : ''
                    }
                    placeholder="Select production time"
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    placeholderTextColor={COLORS.gray}
                    theme={PAPER_THEME}
                    right={
                      <TextInput.Icon
                        icon={() => <Clock3 size={21} color={COLORS.primary} />}
                      />
                    }
                  />
                </View>
              </TouchableOpacity>

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

          {showProductionTimePicker && (
            <DateTimePicker
              value={productionTimePickerValue}
              mode="time"
              display="clock"
              is24Hour={false}
              onValueChange={(event, date) => {
                if (event?.type === 'dismissed') {
                  setShowProductionTimePicker(false);
                  return;
                }

                if (date) {
                  selectProductionTime(date);
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const HeaderCell = React.memo(function HeaderCell({ children, width }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );
});

const Cell = React.memo(function Cell({ children, width, bold }) {
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
});

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
  icon,
}) {
  return (
    <View style={[styles.dropdownWrap, { zIndex }]}>
      <View style={styles.dropdownLabelRow}>
        {icon}
        <Text style={styles.dropdownLabel}>{label}</Text>
      </View>

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
        searchContainerStyle={styles.dropdownSearchContainer}
        listItemContainerStyle={styles.dropdownListItem}
        listItemLabelStyle={styles.dropdownListItemLabel}
        selectedItemContainerStyle={styles.dropdownSelectedItem}
        selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
        showTickIcon
        ArrowDownIconComponent={() => (
          <ChevronDown size={20} color={COLORS.primary} />
        )}
        ArrowUpIconComponent={() => (
          <ChevronUp size={20} color={COLORS.primary} />
        )}
        TickIconComponent={() => <Check size={18} color={COLORS.accent} />}
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
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

  title: { fontSize: 25, fontWeight: '900', color: COLORS.primary },
  description: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  tableCard: {
    flex: 1,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
  },

  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primary },

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

  altRow: { backgroundColor: '#FAFBFD' },

  cell: {
    minHeight: 54,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  cellText: { color: COLORS.text, fontSize: 12, textAlign: 'center' },
  boldCell: { fontWeight: '900', color: COLORS.primary },

  emptyBox: { height: 180, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.gray, fontWeight: '700' },

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

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: { color: COLORS.primary, fontSize: 24, fontWeight: '900' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16 },

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

  input: { backgroundColor: COLORS.white, marginBottom: 14 },
  inputDisabled: { backgroundColor: COLORS.bg },

  srHint: {
    color: COLORS.gray,
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: -8,
    marginBottom: 12,
  },

  coatingRow: { flexDirection: 'row', gap: 8 },

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

  previewLabel: { color: COLORS.gray, fontSize: 13, fontWeight: '800' },
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

  shiftInfoTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '900' },

  shiftErrorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  shiftErrorTitle: { color: '#B91C1C' },
  shiftInfoText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  // ---- Dropdown (matches app's card/input styling) ----
  dropdownWrap: { marginVertical: 8 },

  dropdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  dropdownLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },

  dropdown: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },

  dropdownDisabled: { backgroundColor: COLORS.bg, opacity: 0.7 },

  dropdownContainer: {
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    elevation: 8,
    marginTop: 4,
  },

  dropdownText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },

  dropdownPlaceholder: { color: COLORS.gray, fontSize: 15, fontWeight: '600' },

  dropdownSearch: {
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },

  dropdownSearchContainer: {
    borderBottomColor: COLORS.border,
    padding: 10,
  },

  dropdownListItem: { height: 50 },

  dropdownListItemLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  dropdownSelectedItem: { backgroundColor: COLORS.lightBlue },

  dropdownSelectedItemLabel: {
    fontWeight: '900',
    color: COLORS.primary,
  },

  timeModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    padding: 18,
  },

  timePickerCard: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 12,
  },

  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  timePickerTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },

  timePickerSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  timePickerCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedTimeBox: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    borderWidth: 1,
    borderColor: '#D8ECFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  selectedTimeText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },

  timePickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  nowButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: COLORS.lightBlue,
    borderWidth: 1,
    borderColor: '#D8ECFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nowButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  timeDoneButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  timeDoneButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
});
