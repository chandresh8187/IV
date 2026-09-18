import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Plus, LockKeyhole, Pencil, X } from 'lucide-react-native';
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
import {
  getProductionsApi,
  grantProductionEditApi,
  saveProductionApi,
} from '../../api/productionApi';
import { getUsersApi } from '../../api/userApi';
import {
  getProductionShiftStatusApi as getShiftStatusApi,
  getCorrectionPlanningItemsApi,
} from '../../api/shiftApi';
import ShiftCorrectionControls from '../../components/ShiftCorrectionControls';
import AnimatedRefreshButton from '../../components/AnimatedRefreshButton';
import ProductionTable from '../../components/ProductionTable';
import ResponsiveGrid from '../../components/ResponsiveGrid';
import { getAvailablePlanningApi } from '../../api/productionPlanningApi';
import {
  formatMaterialDescription,
  formatNumber,
  formatQuantity,
  formatTimeForApi,
  parseTimeForPicker,
} from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { hasPermission } from '../../utils/permissions';
import { canUseShiftCorrection } from '../../utils/accessNavigation';

import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';

const ClockIcon = () => <Clock3 size={21} color={COLORS.primary} />;
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
  entry_id: 0,
  planning_item_id: null,
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

const canEditProductionRow = row =>
  row?.can_edit === true || Number(row?.can_edit) === 1;

export default function ProductionScreen() {
  const queryClient = useQueryClient();
  const { workspaceFormMaxWidth } = useResponsive();

  const [fullForm, setFullForm] = useState(emptyFullForm);
  const [formContext, setFormContext] = useState(null);
  const [correctionPlanOpen, setCorrectionPlanOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [grantRow, setGrantRow] = useState(null);
  const [selectedGrantUserId, setSelectedGrantUserId] = useState(null);
  const [grantUserOpen, setGrantUserOpen] = useState(false);
  const loggedUser = useSelector(state => state.auth.user);
  const canManageCorrection = ['superadmin', 'plant_manager'].includes(
    String(loggedUser?.role || '')
      .trim()
      .toLowerCase(),
  );
  const canSaveProduction = hasPermission(loggedUser, 'production.save');
  const canGrantProductionEdit = hasPermission(
    loggedUser,
    'production.grant_edit',
  );
  const canManageAllProduction = hasPermission(
    loggedUser,
    'production.manage_all',
  );
  const [showProductionTimePicker, setShowProductionTimePicker] =
    useState(false);
  const [productionTimePickerValue, setProductionTimePickerValue] = useState(
    new Date(),
  );

  const { data: availablePlanningData } = useQuery({
    queryKey: ['available-production-planning'],
    queryFn: getAvailablePlanningApi,
  });

  const { data: usersData } = useQuery({
    queryKey: ['active-users-for-production-grant'],
    queryFn: () => getUsersApi(),
    enabled: canGrantProductionEdit,
  });

  const {
    data: shiftStatusData,
    refetch: refetchShiftStatus,
    isError: shiftStatusError,
    error: shiftStatusErrorObj,
  } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
    refetchInterval: 30000,
  });

  const shiftStatus = shiftStatusData?.data;
  const usesCorrection = canUseShiftCorrection(loggedUser);
  const correctionMode =
    usesCorrection && Boolean(shiftStatus?.correction_mode);
  const shiftRevision = usesCorrection ? shiftStatus?.shift_revision || 0 : 0;
  const activeShift =
    (usesCorrection ? shiftStatus?.production_shift : null) ||
    shiftStatus?.active_shift ||
    null;
  const { data: correctionPlanningData } = useQuery({
    queryKey: ['correction-planning-items', shiftRevision],
    queryFn: getCorrectionPlanningItemsApi,
    enabled: correctionMode && canSaveProduction,
  });

  const activeShiftId = activeShift?.id || null;
  const isShiftActive = !!activeShiftId;
  const productionAllowed =
    correctionMode || shiftStatusData?.data?.production_allowed !== false;
  const plantStatus = shiftStatusData?.data?.plant_status || 'running';
  // Normalized so a role stored as "Supervisor" / " superadmin " on the
  // server still unlocks the entry button.
  const canManageProduction =
    canSaveProduction &&
    isShiftActive &&
    productionAllowed &&
    !shiftStatusError;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['productions', activeShiftId, shiftRevision],
    queryFn: async () => {
      const allRows = [];
      let page = 1;
      for (;;) {
        const response = await getProductionsApi({
          limit: 500,
          page,
          shift_id: activeShiftId,
        });
        const batch = response?.data?.table_data || response?.data || [];
        allRows.push(...batch);
        if (batch.length < 500) break;
        page += 1;
      }
      return { data: allRows };
    },
    enabled: !!activeShiftId && !shiftStatusError,
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
      queryClient.invalidateQueries({
        queryKey: ['correction-planning-items'],
      });
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });
      closeModal();
    },
    onError: error => {
      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          'Unable to save production entry. Check your internet connection and try again.',
      );
    },
  });

  const grantMutation = useMutation({
    mutationFn: grantProductionEditApi,
    onSuccess: res => {
      Alert.alert('Unlocked', res?.message || 'Row edit access granted');
      setGrantRow(null);
      setSelectedGrantUserId(null);
      queryClient.invalidateQueries({ queryKey: ['productions'] });
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not unlock this row',
      ),
  });

  const rows = useMemo(
    () => (activeShiftId ? data?.data?.table_data || data?.data || [] : []),
    [activeShiftId, data],
  );

  // Legacy API compatibility only: displayed row numbers come from time order.
  // Never use a displayed row number to select or save an existing entry.
  const nextSrNo = useMemo(
    () =>
      rows.reduce((max, item) => Math.max(max, Number(item.sr_no) || 0), 0) + 1,
    [rows],
  );

  const formExistingEntry = useMemo(
    () =>
      fullForm.entry_id
        ? rows.find(item => String(item.id) === String(fullForm.entry_id)) ||
          null
        : null,
    [fullForm.entry_id, rows],
  );

  const hasEditableRow = useMemo(
    () => canManageAllProduction || rows.some(canEditProductionRow),
    [canManageAllProduction, rows],
  );

  const openEntryModal = () => {
    const activePlan = correctionMode ? null : availablePlanning[0] || null;
    setFormContext({ shift_id: activeShiftId, shift_revision: shiftRevision });
    const initialForm = {
      ...emptyFullForm,
      planning_item_id: activePlan?.planning_item_id || null,
      planning_id: activePlan ? String(activePlan.id) : '',
      challan_no: activePlan?.challan_no || '',
      party_name: activePlan?.party_name || '',
      material: activePlan?.material_description || '',
      material_description: activePlan?.material_description || '',
    };
    setFullForm(initialForm);
    setModalType('Full');
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['shift-status'] });

    const latestShift = await queryClient.fetchQuery({
      queryKey: ['shift-status'],
      queryFn: getShiftStatusApi,
    });

    const latestShiftId =
      (usesCorrection ? latestShift?.data?.production_shift?.id : null) ||
      latestShift?.data?.active_shift?.id;

    if (latestShiftId) {
      await queryClient.invalidateQueries({
        queryKey: ['productions', latestShiftId],
      });
    } else {
      queryClient.removeQueries({ queryKey: ['productions'] });
    }
  };

  const closeModal = () => {
    setFormContext(null);
    setCorrectionPlanOpen(false);
    setShowProductionTimePicker(false);
    setModalType(null);
    setFullForm(emptyFullForm);
  };

  const openProductionTimePicker = () => {
    const selectedDate = parseTimeForPicker(fullForm.production_time);

    setProductionTimePickerValue(selectedDate);
    setShowProductionTimePicker(true);
  };

  const selectProductionTime = date => {
    if (!date) {
      return;
    }

    const selectedDate = parseTimeForPicker(date);

    setProductionTimePickerValue(selectedDate);
    setFullForm(prev => ({
      ...prev,
      production_time: formatTimeForApi(selectedDate),
    }));
    setShowProductionTimePicker(false);
  };

  // Only the row's Edit button loads an existing entry by its immutable ID.
  const openEditModal = found => {
    if (!canManageAllProduction && !canEditProductionRow(found)) return;
    setFormContext({ shift_id: activeShiftId, shift_revision: shiftRevision });
    setFullForm({
      entry_id: found.id,
      planning_item_id: found.planning_item_id || null,
      planning_id: found.planning_id ? String(found.planning_id) : '',
      challan_no: found.challan_no || '',
      party_name: found.party_name || '',
      material: found.material || '',
      material_description: found.material || found.material_description || '',
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
    setModalType('Full');
  };

  const availablePlanning = useMemo(
    () => availablePlanningData?.data || [],
    [availablePlanningData],
  );

  const correctionPlanningItems = correctionPlanningData?.data || [];
  const activePlanning = correctionMode
    ? correctionPlanningItems.find(
        item =>
          Number(item.planning_item_id) === Number(fullForm.planning_item_id),
      ) || null
    : availablePlanning[0] || null;

  useEffect(() => {
    if (
      modalType === 'Full' &&
      formContext &&
      (Number(formContext.shift_id) !== Number(activeShiftId) ||
        Number(formContext.shift_revision) !== Number(shiftRevision))
    ) {
      setModalType(null);
      setShowProductionTimePicker(false);
      setCorrectionPlanOpen(false);
      Alert.alert(
        'Production shift changed',
        'The form was closed because the production shift changed. Reopen the entry in the selected shift before saving.',
      );
    }
  }, [activeShiftId, shiftRevision, modalType, formContext]);

  // The mutation's onSuccess handles invalidation and closing the modal.
  // Closing here (before the request settles) would wipe the form even
  // when the save fails, losing everything the user typed.
  const saveFullEntry = () => {
    const requiredFields = [fullForm.production_time, fullForm.dipping_qty];

    if (requiredFields.some(value => String(value || '').trim() === '')) {
      Alert.alert(
        'Required',
        'Please enter production time and dipping quantity.',
      );
      return;
    }

    const existingEntry = formExistingEntry;
    if (fullForm.entry_id && !existingEntry) {
      Alert.alert(
        'Entry no longer available',
        'Refresh the production table and reopen the entry using its Edit button.',
      );
      return;
    }
    if (!existingEntry && !activePlanning) {
      Alert.alert(
        'Select a production plan',
        correctionMode
          ? 'Select the planning challan item for this missed entry.'
          : 'Add a pending production plan before saving a production entry.',
      );
      return;
    }

    const dippingQty = Number(fullForm.dipping_qty);
    if (
      !existingEntry &&
      Number(fullForm.planning_item_id) !==
        Number(activePlanning?.planning_item_id)
    ) {
      Alert.alert(
        'Production flow changed',
        'The next planning item has changed. Reopen the production form and review the selected material before saving.',
      );
      return;
    }

    if (!Number.isInteger(dippingQty) || dippingQty <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Dipping quantity must be a whole number greater than 0.',
      );
      return;
    }

    const planningForEntry = existingEntry ? null : activePlanning;
    const originalQtyForPlanning =
      existingEntry &&
      String(existingEntry.planning_id) === String(fullForm.planning_id)
        ? Number(existingEntry.dipping_qty) || 0
        : 0;
    const maximumQty =
      Number(planningForEntry?.remaining_qty) + originalQtyForPlanning;

    if (planningForEntry && dippingQty > maximumQty) {
      Alert.alert(
        'Quantity Exceeds Plan',
        `Only ${formatQuantity(maximumQty)} NOS remain for challan ${
          planningForEntry.challan_no
        }.`,
      );
      return;
    }

    const payload = {
      ...formContext,
      entry_id: fullForm.entry_id || 0,
      planning_item_id: fullForm.planning_item_id || undefined,
      entry_type: 'full',
      sr_no: String(existingEntry ? existingEntry.sr_no : nextSrNo),
      planning_id: fullForm.planning_id || undefined,
      challan_no: fullForm.challan_no,
      party_name: fullForm.party_name,
      material: fullForm.material,
      production_time: fullForm.production_time,
      dipping_qty: dippingQty,
      kettle_temperature: fullForm.kettle_temperature,
      ms_weight: fullForm.ms_weight,
      gi_weight: fullForm.gi_weight,
      c1: fullForm.c1,
      c2: fullForm.c2,
      c3: fullForm.c3,
      c4: fullForm.c4,
      c5: fullForm.c5,
    };
    saveMutation.mutate(payload);
  };

  const activeUsers = useMemo(
    () =>
      (usersData?.data?.users || []).filter(
        user => String(user.status || 'active').toLowerCase() === 'active',
      ),
    [usersData],
  );

  const grantUserItems = useMemo(
    () =>
      activeUsers.map(user => ({
        label: `${user.name} (${String(user.role || '').replace('_', ' ')})`,
        value: user.id,
      })),
    [activeUsers],
  );

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
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Shift entries</Text>
          <Text style={styles.description}>Output & coating readings</Text>
        </View>

        <View style={styles.headerActions}>
          {canManageProduction && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Add production entry"
              activeOpacity={0.8}
              onPress={openEntryModal}
              style={styles.headerAddBtn}
            >
              <Plus size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <AnimatedRefreshButton
            refreshing={isFetching}
            onPress={handleRefresh}
          />
        </View>
      </View>
      <ShiftCorrectionControls
        status={
          shiftStatus
            ? {
                ...shiftStatus,
                correction_mode: correctionMode,
                production_shift: activeShift,
              }
            : shiftStatus
        }
        canManage={canManageCorrection}
      />
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
              ).toUpperCase()} SHIFT ${
                correctionMode ? 'CORRECTION' : 'ACTIVE'
              }`
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
          <ProductionTable
            rows={rows}
            shiftName={activeShift?.shift_name}
            scrollRows
            renderAction={
              canGrantProductionEdit || hasEditableRow
                ? item => (
                    <View style={styles.rowActions}>
                      {canGrantProductionEdit && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Manage edit access for production entry ${item.id}`}
                          style={styles.rowIconBtn}
                          onPress={() => {
                            setGrantRow(item);
                            setSelectedGrantUserId(
                              item.editable_user_id || null,
                            );
                          }}
                        >
                          <LockKeyhole size={17} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}
                      {(canManageAllProduction ||
                        canEditProductionRow(item)) && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Edit production entry ${item.id}`}
                          style={[styles.rowIconBtn, styles.rowEditBtn]}
                          onPress={() => openEditModal(item)}
                        >
                          <Pencil size={17} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                : undefined
            }
          />
        )}
      </View>

      <Modal
        visible={modalType === 'Full'}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.modalTitle}>
                {formExistingEntry
                  ? 'Edit Production Entry'
                  : 'Production Entry'}
              </Text>
              <Text style={styles.modalDesc}>
                Output, weights and coating readings
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close production form"
              activeOpacity={0.7}
              onPress={closeModal}
              style={styles.closeBtn}
            >
              <X size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.modalBody,
              centeredContent(workspaceFormMaxWidth),
            ]}
          >
            <ResponsiveGrid minColumnWidth={360}>
              <FormCard title="Production Details">
                {!!fullForm.entry_id &&
                  !canManageAllProduction &&
                  !correctionMode && (
                    <Text style={styles.srHint}>
                      This entry is unlocked for one edit. Access closes after a
                      successful save.
                    </Text>
                  )}

                {correctionMode && !formExistingEntry && (
                  <View style={styles.automaticPlanCard}>
                    <Text style={styles.srHint}>
                      Select the planning challan item for this missed entry.
                      Planned quantity limits still apply.
                    </Text>
                    <DropDownPicker
                      open={correctionPlanOpen}
                      setOpen={setCorrectionPlanOpen}
                      value={fullForm.planning_item_id}
                      items={correctionPlanningItems.map(item => ({
                        value: Number(item.planning_item_id),
                        label: `${
                          item.challan_no
                        } · ${formatMaterialDescription(
                          item.material_description,
                        )} · ${formatQuantity(
                          item.remaining_qty,
                        )} NOS remaining`,
                      }))}
                      setValue={callback => {
                        const nextId =
                          typeof callback === 'function'
                            ? callback(fullForm.planning_item_id)
                            : callback;
                        const item = correctionPlanningItems.find(
                          candidate =>
                            Number(candidate.planning_item_id) ===
                            Number(nextId),
                        );
                        setFullForm(prev => ({
                          ...prev,
                          planning_item_id: nextId,
                          planning_id: item?.planning_id
                            ? String(item.planning_id)
                            : '',
                          challan_no: item?.challan_no || '',
                          party_name: item?.party_name || '',
                          material: item?.material_description || '',
                          material_description:
                            item?.material_description || '',
                        }));
                      }}
                      listMode="MODAL"
                      searchable
                      placeholder="Select planning challan item"
                    />
                  </View>
                )}
                {fullForm.challan_no ? (
                  <View style={styles.automaticPlanCard}>
                    <View style={styles.automaticPlanTop}>
                      <Text style={styles.automaticPlanLabel}>
                        {formExistingEntry
                          ? 'LINKED PRODUCTION ITEM'
                          : correctionMode
                          ? 'SELECTED PLANNING ITEM'
                          : 'ASSIGNED AUTOMATICALLY'}
                      </Text>
                      {!formExistingEntry && activePlanning ? (
                        <Text style={styles.automaticPlanSequence}>
                          ITEM {activePlanning.sequence_no}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.automaticPlanChallan}>
                      {fullForm.challan_no}
                    </Text>
                    <Text style={styles.automaticPlanParty}>
                      {fullForm.party_name}
                    </Text>
                    <Text style={styles.automaticPlanMaterial}>
                      {formatMaterialDescription(
                        fullForm.material_description || fullForm.material,
                      )}
                    </Text>
                    {!formExistingEntry && activePlanning ? (
                      <View style={styles.automaticPlanProgress}>
                        <Text style={styles.automaticPlanProgressText}>
                          {formatQuantity(activePlanning.completed_qty)} /{' '}
                          {formatQuantity(activePlanning.planned_qty)} NOS
                          completed
                        </Text>
                        <Text style={styles.automaticPlanRemaining}>
                          {formatQuantity(activePlanning.remaining_qty)} NOS
                          remaining
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.noPlanCard}>
                    <Text style={styles.noPlanTitle}>
                      {correctionMode
                        ? 'Select a planning item above'
                        : 'No pending production plan'}
                    </Text>
                    <Text style={styles.noPlanText}>
                      Create a production plan before adding this entry.
                    </Text>
                  </View>
                )}

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
                      right={<TextInput.Icon icon={ClockIcon} />}
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

              <View>
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
                      <Text style={styles.previewValue}>
                        {previewAvgCoating}
                      </Text>
                    </View>
                  )}
                </FormCard>
              </View>
            </ResponsiveGrid>
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
              onChange={(event, date) => {
                setShowProductionTimePicker(false);
                if (event?.type === 'set' && date) {
                  selectProductionTime(date);
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={!!grantRow} transparent animationType="fade">
        <View style={styles.grantBackdrop}>
          <View style={styles.grantCard}>
            <Text style={styles.modalTitle}>Unlock entry #{grantRow?.id}</Text>
            <Text style={styles.modalDesc}>
              Select the active user who may edit this row once.
            </Text>
            <DropDownPicker
              open={grantUserOpen}
              setOpen={setGrantUserOpen}
              value={selectedGrantUserId}
              setValue={setSelectedGrantUserId}
              items={grantUserItems}
              listMode="MODAL"
              searchable
              placeholder="Select active user"
              style={styles.dropdown}
            />
            <View style={styles.grantActions}>
              <TouchableOpacity
                style={styles.grantCancel}
                onPress={() => setGrantRow(null)}
              >
                <Text style={styles.grantCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.grantSave}
                disabled={!selectedGrantUserId || grantMutation.isPending}
                onPress={() =>
                  grantMutation.mutate({
                    id: grantRow.id,
                    user_id: selectedGrantUserId,
                  })
                }
              >
                <Text style={styles.grantSaveText}>UNLOCK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
  },

  headerCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 16,
    elevation: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  headerAddBtn: {
    width: 46,
    height: 46,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.coral,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
  },

  title: { fontSize: 19, fontWeight: '700', color: COLORS.text },
  description: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  tableCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    overflow: 'hidden',
    elevation: 0,
  },

  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16 },
  formCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    elevation: 1,
    marginVertical: 10,
  },

  formTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },

  input: { backgroundColor: COLORS.white, marginBottom: 14 },
  inputDisabled: { backgroundColor: COLORS.bg },

  srHint: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },

  automaticPlanCard: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: UI.radius,
    backgroundColor: COLORS.accentSoft,
    padding: 15,
    marginBottom: 14,
  },
  automaticPlanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  automaticPlanLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  automaticPlanSequence: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: UI.radiusSmall,
  },
  automaticPlanChallan: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 10,
  },
  automaticPlanMaterial: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  automaticPlanParty: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  automaticPlanProgress: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  automaticPlanProgressText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  automaticPlanRemaining: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  noPlanCard: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: UI.radius,
    backgroundColor: COLORS.dangerSoft,
    padding: 15,
    marginBottom: 14,
  },
  noPlanTitle: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: '700',
  },
  noPlanText: {
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  coatingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  coatingInput: {
    minWidth: 60,
    flex: 1,
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  previewBox: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: UI.radiusSmall,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  previewLabel: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  previewValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },

  shiftInfoCard: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: UI.radius,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  shiftInfoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },

  shiftErrorCard: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
  },

  shiftErrorTitle: { color: COLORS.danger },
  shiftInfoText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
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

  dropdownLabel: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  dropdown: {
    minHeight: 56,
    borderRadius: UI.radiusSmall,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },

  dropdownDisabled: { backgroundColor: COLORS.bg, opacity: 0.7 },

  dropdownContainer: {
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.white,
    elevation: 0,
    marginTop: 4,
  },

  dropdownText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },

  dropdownPlaceholder: { color: COLORS.gray, fontSize: 15, fontWeight: '600' },

  dropdownSearch: {
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
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
    fontWeight: '400',
  },

  dropdownSelectedItem: { backgroundColor: COLORS.lightBlue },

  dropdownSelectedItemLabel: {
    fontWeight: '600',
    color: COLORS.primary,
  },

  remainingQtyBadge: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.borderStrong,
    borderWidth: 1,
    borderRadius: 3,
    padding: 14,
    marginTop: 2,
    marginBottom: 14,
  },

  remainingQtyMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  remainingQtyLabel: {
    fontVariant: ['tabular-nums'],
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  remainingQtyValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.success,
    fontSize: 22,
    fontWeight: '700',
  },

  remainingQtyDivider: {
    height: 1,
    backgroundColor: COLORS.borderStrong,
    marginVertical: 10,
  },

  quantitySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quantitySummaryText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },

  quantitySummaryValue: {
    color: COLORS.success,
    fontWeight: '700',
  },
  rowIconBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowEditBtn: {
    backgroundColor: COLORS.accentSoft,
  },
  defaultChallanBtn: {
    minHeight: 46,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.lightBlue,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  defaultChallanText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  grantBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  grantCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 20,
  },
  grantActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  grantCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantCancelText: { color: COLORS.primary, fontWeight: '600' },
  grantSave: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantSaveText: { color: COLORS.white, fontWeight: '600' },
});
