import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  Clock3,
  Plus,
  LockKeyhole,
  Pencil,
  Star,
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
import {
  getDefaultChallanApi,
  getProductionsApi,
  grantProductionEditApi,
  saveProductionApi,
  setDefaultChallanApi,
} from '../../api/productionApi';
import { getUsersApi } from '../../api/userApi';
import { getShiftStatusApi } from '../../api/shiftApi';
import AnimatedRefreshButton from '../../components/AnimatedRefreshButton';
import ProductionTable from '../../components/ProductionTable';
import { getAvailablePlanningApi } from '../../api/productionPlanningApi';
import {
  formatNumber,
  formatQuantity,
  formatTimeForApi,
  parseTimeForPicker,
} from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { hasPermission } from '../../utils/permissions';

import { COLORS } from '../../assets/Colors';
import {
  createClientRequestId,
  enqueueOfflineProduction,
  getOfflineProductionQueueStats,
  subscribeOfflineProductionQueue,
} from '../../utils/offlineProductionQueue';
import usePersistentFormDraft from '../../hooks/usePersistentFormDraft';

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

const ClockIcon = () => <Clock3 size={21} color={COLORS.primary} />;
const DropdownArrowDownIcon = () => (
  <ChevronDown size={20} color={COLORS.primary} />
);
const DropdownArrowUpIcon = () => (
  <ChevronUp size={20} color={COLORS.primary} />
);
const DropdownTickIcon = () => <Check size={18} color={COLORS.accent} />;

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

const canEditProductionRow = row =>
  row?.can_edit === true || Number(row?.can_edit) === 1;

export default function ProductionScreen() {
  const queryClient = useQueryClient();
  const { formMaxWidth } = useResponsive();

  const [fullForm, setFullForm] = useState(emptyFullForm);
  const [modalType, setModalType] = useState(null);
  const [grantRow, setGrantRow] = useState(null);
  const [selectedGrantUserId, setSelectedGrantUserId] = useState(null);
  const [grantUserOpen, setGrantUserOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineFailedCount, setOfflineFailedCount] = useState(0);
  const [productionDraftRestored, setProductionDraftRestored] = useState(false);
  const loggedUser = useSelector(state => state.auth.user);
  const canSaveProduction = hasPermission(loggedUser, 'production.save');
  const canGrantProductionEdit = hasPermission(
    loggedUser,
    'production.grant_edit',
  );
  const canManageAllProduction = hasPermission(
    loggedUser,
    'production.manage_all',
  );
  // Editing existing rows is permission-driven, but choosing an SR for a new
  // entry is a superadmin-only workflow. Granting a supervisor edit access
  // must not turn their auto-generated SR field into a manual input.
  const canEnterSrManually =
    String(loggedUser?.role || '').toLowerCase().trim() === 'superadmin';
  const [planningOpen, setPlanningOpen] = useState(false);
  const [showProductionTimePicker, setShowProductionTimePicker] =
    useState(false);
  const [productionTimePickerValue, setProductionTimePickerValue] = useState(
    new Date(),
  );

  const { data: availablePlanningData } = useQuery({
    queryKey: ['available-production-planning'],
    queryFn: getAvailablePlanningApi,
  });

  const { data: defaultChallanData } = useQuery({
    queryKey: ['default-production-challan'],
    queryFn: getDefaultChallanApi,
    enabled: canSaveProduction,
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
  });

  const activeShift = shiftStatusData?.data?.active_shift || null;

  const activeShiftId = activeShift?.id || null;
  const isShiftActive = !!activeShiftId;
  const productionAllowed = shiftStatusData?.data?.production_allowed !== false;
  const plantStatus = shiftStatusData?.data?.plant_status || 'running';
  // Normalized so a role stored as "Supervisor" / " superadmin " on the
  // server still unlocks the entry button.
  const canManageProduction =
    canSaveProduction && isShiftActive && productionAllowed;

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
    mutationFn: async payload => {
      try {
        return await saveProductionApi(payload);
      } catch (error) {
        error.ivProductionPayload = payload;
        throw error;
      }
    },
    onSuccess: async res => {
      Alert.alert('Success', res?.message || 'Saved successfully');

      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });
      if (!formExistingEntry) await clearProductionDraft();
      closeModal();
    },
    onError: async error => {
      const isNetworkError = !error?.response;
      const attemptedExistingRow = rows.some(
        item =>
          String(item.sr_no) === String(error.ivProductionPayload?.sr_no || ''),
      );
      if (isNetworkError && !attemptedExistingRow && activeShiftId) {
        const queued = await enqueueOfflineProduction(
          {
            ...error.ivProductionPayload,
            offline_shift_id: activeShiftId,
          },
          loggedUser?.id,
        );
        if (queued?.client_request_id) {
          const stats = await getOfflineProductionQueueStats(loggedUser?.id);
          setOfflineCount(stats.total);
          setOfflineFailedCount(stats.failed);
          Alert.alert(
            'Saved Offline',
            'This production entry will upload automatically when internet is available.',
          );
          await clearProductionDraft();
          closeModal();
          return;
        }
      }
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
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

  const defaultChallanMutation = useMutation({
    mutationFn: setDefaultChallanApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['default-production-challan'],
      });
      Alert.alert(
        'Saved',
        fullForm.planning_id
          ? 'This challan is now your default.'
          : 'Default challan removed.',
      );
    },
    onError: error =>
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Could not save default challan',
      ),
  });

  useEffect(() => {
    const refreshQueueStats = async () => {
      const stats = await getOfflineProductionQueueStats(loggedUser?.id);
      setOfflineCount(stats.total);
      setOfflineFailedCount(stats.failed);
    };
    refreshQueueStats().catch(() => {});
    return subscribeOfflineProductionQueue(() => {
      refreshQueueStats().catch(() => {});
    });
  }, [loggedUser?.id]);

  const rows = useMemo(
    () => (activeShiftId ? data?.data?.table_data || data?.data || [] : []),
    [activeShiftId, data],
  );

  // Next serial number for this shift, based on the highest Sr No already
  // filled. Supervisors always get this assigned automatically; only the
  // superadmin can type a Sr No (e.g. to pull up and correct an old entry).
  const nextSrNo = useMemo(
    () =>
      rows.reduce((max, item) => Math.max(max, Number(item.sr_no) || 0), 0) + 1,
    [rows],
  );

  const formExistingEntry = useMemo(
    () =>
      rows.find(item => String(item.sr_no) === String(fullForm.sr_no)) || null,
    [fullForm.sr_no, rows],
  );

  const {
    clearDraft: clearProductionDraft,
    loadDraft: loadProductionDraft,
    markChanged: markProductionDraftChanged,
    persistNow: persistProductionDraft,
  } = usePersistentFormDraft({
    formName: 'add-production',
    userId: loggedUser?.id,
    scope: activeShiftId,
    values: fullForm,
    enabled: modalType === 'Full' && !formExistingEntry,
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  });

  const hasEditableRow = useMemo(
    () => canManageAllProduction || rows.some(canEditProductionRow),
    [canManageAllProduction, rows],
  );

  const openEntryModal = async () => {
    const preferred = defaultChallanData?.data;
    const defaultPlan = availablePlanning.find(
      item => String(item.id) === String(preferred?.default_planning_id),
    );
    const initialForm = {
      ...emptyFullForm,
      sr_no: canEnterSrManually ? '' : String(nextSrNo),
      planning_id: defaultPlan ? String(defaultPlan.id) : '',
      challan_no: defaultPlan?.challan_no || '',
      party_name: defaultPlan?.party_name || '',
      material: defaultPlan?.material_description || '',
      material_description: defaultPlan?.material_description || '',
    };
    const draft = await loadProductionDraft();
    const draftSrIsNowUsed = rows.some(
      item => String(item.sr_no) === String(draft?.sr_no || ''),
    );
    setFullForm(
      draft
        ? {
            ...initialForm,
            ...draft,
            sr_no: canEnterSrManually
              ? draftSrIsNowUsed
                ? ''
                : draft.sr_no || ''
              : String(nextSrNo),
          }
        : initialForm,
    );
    setProductionDraftRestored(Boolean(draft));
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
    if (modalType === 'Full' && !formExistingEntry) {
      persistProductionDraft().catch(() => {});
    }
    setShowProductionTimePicker(false);
    setModalType(null);
    setFullForm(emptyFullForm);
    setProductionDraftRestored(false);
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
    markProductionDraftChanged();
    setFullForm(prev => ({
      ...prev,
      production_time: formatTimeForApi(selectedDate),
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

  const openEditModal = item => {
    if (!canManageAllProduction && !canEditProductionRow(item)) return;
    setProductionDraftRestored(false);
    fillFromSrNo(item.sr_no);
    setModalType('Full');
  };

  const availablePlanning = useMemo(
    () => availablePlanningData?.data || [],
    [availablePlanningData],
  );

  const selectedPlanning = useMemo(
    () =>
      availablePlanning.find(
        item => String(item.id) === String(fullForm.planning_id),
      ) || null,
    [availablePlanning, fullForm.planning_id],
  );

  const challanItems = useMemo(() => {
    const items = availablePlanning.map(item => ({
      label: `${item.challan_no} | ${item.party_name}`,
      value: item.challan_no,
    }));

    const currentChallan = fullForm.challan_no;

    const alreadyListed = items.some(
      item => String(item.value) === String(currentChallan),
    );

    // This keeps an already-used challan visible while editing an entry.
    if (currentChallan && !alreadyListed) {
      items.unshift({
        label: `${currentChallan} | ${fullForm.party_name || 'Already used'}`,
        value: currentChallan,
      });
    }

    return items;
  }, [availablePlanning, fullForm.challan_no, fullForm.party_name]);

  const handlePlanningSelect = challanNo => {
    markProductionDraftChanged();
    const found = availablePlanning.find(
      item => String(item.challan_no) === String(challanNo),
    );

    if (!found) {
      setFullForm(prev => ({
        ...prev,
        challan_no: challanNo,
      }));
      return;
    }

    setFullForm(prev => ({
      ...prev,
      planning_id: String(found.id),
      challan_no: found.challan_no || '',
      party_name: found.party_name || '',
      material: found.material_description || '',
      material_description: found.material_description || '',
    }));
  };

  // The mutation's onSuccess handles invalidation and closing the modal.
  // Closing here (before the request settles) would wipe the form even
  // when the save fails, losing everything the user typed.
  const saveFullEntry = () => {
    const requiredFields = [
      fullForm.sr_no,
      fullForm.challan_no,
      fullForm.production_time,
      fullForm.dipping_qty,
    ];

    if (requiredFields.some(value => String(value || '').trim() === '')) {
      Alert.alert(
        'Required',
        'Please select a challan and enter Sr No, production time, and dipping quantity.',
      );
      return;
    }

    const dippingQty = Number(fullForm.dipping_qty);

    if (!Number.isInteger(dippingQty) || dippingQty <= 0) {
      Alert.alert(
        'Invalid Quantity',
        'Dipping quantity must be a whole number greater than 0.',
      );
      return;
    }

    const planningForEntry = availablePlanning.find(
      item => String(item.id) === String(fullForm.planning_id),
    );
    const existingEntry = rows.find(
      item => String(item.sr_no) === String(fullForm.sr_no),
    );
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
      entry_type: 'full',
      // Use the same id for the first attempt and every offline retry. If the
      // server committed but the response was lost, reconnecting replays the
      // existing result instead of inserting a duplicate row.
      ...(!existingEntry && { client_request_id: createClientRequestId() }),
      sr_no: fullForm.sr_no,
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
          <Text style={styles.title}>Live Production</Text>
          <Text style={styles.description}>Sr No wise production table</Text>
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
      {offlineCount > 0 && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {offlineCount} offline entr{offlineCount === 1 ? 'y' : 'ies'}{' '}
            {offlineFailedCount
              ? `saved; ${offlineFailedCount} could not sync yet`
              : 'waiting to sync'}
          </Text>
        </View>
      )}
      <View style={styles.tableCard}>
        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ProductionTable
            rows={rows}
            scrollRows
            renderAction={
              canGrantProductionEdit || hasEditableRow
                ? item => (
                  <View style={styles.rowActions}>
                    {canGrantProductionEdit && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Manage edit access for production SR ${item.sr_no}`}
                      style={styles.rowIconBtn}
                      onPress={() => {
                        setGrantRow(item);
                        setSelectedGrantUserId(item.editable_user_id || null);
                      }}
                    >
                      <LockKeyhole size={17} color={COLORS.primary} />
                    </TouchableOpacity>
                    )}
                    {(canManageAllProduction || canEditProductionRow(item)) && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Edit production SR ${item.sr_no}`}
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
            <View>
              <Text style={styles.modalTitle}>
                {formExistingEntry ? 'Edit Production Entry' : 'Production Entry'}
              </Text>
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
            scrollEnabled={!planningOpen}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.modalBody,
              centeredContent(formMaxWidth),
            ]}
          >
            {productionDraftRestored && !formExistingEntry && (
              <Text style={styles.draftNotice}>Saved draft restored</Text>
            )}
            <FormCard title="Production Details">
              <FormInput
                label={
                  formExistingEntry || canEnterSrManually
                    ? 'Sr No'
                    : 'Sr No (auto)'
                }
                value={fullForm.sr_no}
                keyboardType="numeric"
                editable={canEnterSrManually}
                onChangeText={v => {
                  markProductionDraftChanged();
                  setFullForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v);
                }}
              />

              {!canEnterSrManually && formExistingEntry && (
                <Text style={styles.srHint}>
                  {canManageAllProduction
                    ? 'SR No stays fixed while you edit this production entry.'
                    : 'This SR is unlocked for one edit. Access closes after a successful save.'}
                </Text>
              )}

              {canEnterSrManually && (
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
              {selectedPlanning && (
                <View style={styles.remainingQtyBadge}>
                  <View style={styles.remainingQtyMain}>
                    <Text style={styles.remainingQtyLabel}>
                      REMAINING QUANTITY
                    </Text>

                    <Text style={styles.remainingQtyValue}>
                      {formatQuantity(selectedPlanning.remaining_qty)} NOS
                    </Text>
                  </View>

                  <View style={styles.remainingQtyDivider} />

                  <View style={styles.quantitySummary}>
                    <Text style={styles.quantitySummaryText}>
                      Planned:{' '}
                      <Text style={styles.quantitySummaryValue}>
                        {formatQuantity(selectedPlanning.planned_qty)}
                      </Text>
                    </Text>

                    <Text style={styles.quantitySummaryText}>
                      Completed:{' '}
                      <Text style={styles.quantitySummaryValue}>
                        {formatQuantity(selectedPlanning.completed_qty)}
                      </Text>
                    </Text>
                  </View>
                </View>
              )}
              {canSaveProduction && fullForm.planning_id ? (
                <TouchableOpacity
                  style={styles.defaultChallanBtn}
                  onPress={() =>
                    defaultChallanMutation.mutate(
                      String(defaultChallanData?.data?.default_planning_id) ===
                        String(fullForm.planning_id)
                        ? null
                        : fullForm.planning_id,
                    )
                  }
                >
                  <Star size={17} color={COLORS.primary} />
                  <Text style={styles.defaultChallanText}>
                    {String(defaultChallanData?.data?.default_planning_id) ===
                    String(fullForm.planning_id)
                      ? 'REMOVE DEFAULT CHALLAN'
                      : 'MAKE DEFAULT CHALLAN'}
                  </Text>
                </TouchableOpacity>
              ) : null}
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
                      <TextInput.Icon icon={ClockIcon} />
                    }
                  />
                </View>
              </TouchableOpacity>

              <FormInput
                label="Dipping Qty"
                value={fullForm.dipping_qty}
                keyboardType="numeric"
                onChangeText={v => {
                  markProductionDraftChanged();
                  setFullForm(prev => ({ ...prev, dipping_qty: v }));
                }}
              />

              <FormInput
                label="Kettle Temperature °C"
                value={fullForm.kettle_temperature}
                keyboardType="numeric"
                onChangeText={v => {
                  markProductionDraftChanged();
                  setFullForm(prev => ({ ...prev, kettle_temperature: v }));
                }}
              />
            </FormCard>

            <FormCard title="Weight Details">
              <FormInput
                label="MS Weight 1 Nos"
                value={fullForm.ms_weight}
                keyboardType="numeric"
                onChangeText={v => {
                  markProductionDraftChanged();
                  setFullForm(prev => ({ ...prev, ms_weight: v }));
                }}
              />

              <FormInput
                label="GI Weight 1 Nos"
                value={fullForm.gi_weight}
                keyboardType="numeric"
                onChangeText={v => {
                  markProductionDraftChanged();
                  setFullForm(prev => ({ ...prev, gi_weight: v }));
                }}
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
                    onChangeText={v => {
                      markProductionDraftChanged();
                      setFullForm(prev => ({ ...prev, [key]: v }));
                    }}
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
            <Text style={styles.modalTitle}>Unlock SR {grantRow?.sr_no}</Text>
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
        maxHeight={280}
        scrollViewProps={{
          nestedScrollEnabled: true,
          keyboardShouldPersistTaps: 'handled',
        }}
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
        ArrowDownIconComponent={DropdownArrowDownIcon}
        ArrowUpIconComponent={DropdownArrowUpIcon}
        TickIconComponent={DropdownTickIcon}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
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
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },

  title: { fontSize: 25, fontWeight: '800', color: COLORS.primary },
  description: { fontSize: 13, color: COLORS.gray, marginTop: 4 },

  tableCard: {
    flex: 1,
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
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

  modalTitle: { color: COLORS.primary, fontSize: 24, fontWeight: '800' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16 },
  draftNotice: {
    color: COLORS.primary,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    marginVertical: 10,
  },

  formTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  previewBox: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D8ECFA',
  },

  previewLabel: { color: COLORS.gray, fontSize: 13, fontWeight: '800' },
  previewValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },

  shiftInfoCard: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D8ECFA',
  },

  shiftInfoTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },

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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
  },

  dropdownDisabled: { backgroundColor: COLORS.bg, opacity: 0.7 },

  dropdownContainer: {
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
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
    fontWeight: '800',
    color: COLORS.primary,
  },

  remainingQtyBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 12,
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
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  remainingQtyValue: {
    color: '#15803D',
    fontSize: 22,
    fontWeight: '900',
  },

  remainingQtyDivider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 10,
  },

  quantitySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quantitySummaryText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },

  quantitySummaryValue: {
    color: '#166534',
    fontWeight: '800',
  },
  offlineBanner: {
    marginTop: 10,
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  offlineBannerText: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  rowIconBtn: {
    width: 42,
    height: 34,
    borderRadius: 9,
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
    backgroundColor: COLORS.tealSoft,
  },
  defaultChallanBtn: {
    minHeight: 46,
    borderRadius: 12,
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
    fontWeight: '800',
  },
  grantBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  grantCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  grantActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  grantCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantCancelText: { color: COLORS.primary, fontWeight: '800' },
  grantSave: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantSaveText: { color: COLORS.white, fontWeight: '800' },
});
