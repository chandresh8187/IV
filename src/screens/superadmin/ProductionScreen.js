import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, LockKeyhole, Pencil } from 'lucide-react-native';
import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { TextInput } from 'react-native-paper';
import { parseZincAmount, zincTransferPreview } from '../../utils/zincStock';
import {
  getProductionsApi,
  grantProductionEditApi,
  saveProductionApi,
  getProductionContractorsApi,
  getProductionDefaultsApi,
  setProductionDefaultsApi,
  getLiveZincStockApi,
  addLiveZincApi,
} from '../../api/productionApi';
import { getUsersApi } from '../../api/userApi';
import {
  getProductionShiftStatusApi as getShiftStatusApi,
  getCorrectionPlanningItemsApi,
} from '../../api/shiftApi';
import ShiftCorrectionControls from '../../components/ShiftCorrectionControls';
import AnimatedRefreshButton from '../../components/AnimatedRefreshButton';
import ProductionTable from '../../components/ProductionTable';
import ProductionEntryForm from '../../components/ProductionEntryForm';
import { getAvailablePlanningApi } from '../../api/productionPlanningApi';
import { formatNumber, formatQuantity } from '../../utils/format';
import { hasPermission } from '../../utils/permissions';
import { canUseShiftCorrection } from '../../utils/accessNavigation';
import { getDefaultProductionSelection } from '../../utils/productionDefaults';

import { COLORS, UI } from '../../assets/Colors';

const emptyFullForm = {
  entry_id: 0,
  contractor_id: null,
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

  const [fullForm, setFullForm] = useState(emptyFullForm);
  const [formContext, setFormContext] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [grantRow, setGrantRow] = useState(null);
  const [selectedGrantUserId, setSelectedGrantUserId] = useState(null);
  const [grantUserOpen, setGrantUserOpen] = useState(false);
  const [zincModalVisible, setZincModalVisible] = useState(false);
  const [zincAmount, setZincAmount] = useState('');
  const [zincError, setZincError] = useState('');
  const zincRequest = useRef(null);
  const loggedUser = useSelector(state => state.auth.user);
  const canManageCorrection = ['superadmin', 'plant_manager'].includes(
    String(loggedUser?.role || '')
      .trim()
      .toLowerCase(),
  );
  const canSaveProduction = hasPermission(loggedUser, 'production.save');
  const canAddZinc = hasPermission(loggedUser, 'zinc_stock.transfer');
  const zincStockQuery = useQuery({
    queryKey: ['zinc-stock'],
    queryFn: getLiveZincStockApi,
    enabled: canAddZinc,
    retry: false,
  });
  const zincStock = zincStockQuery.data?.data;
  const zincMutation = useMutation({
    mutationFn: addLiveZincApi,
    retry: false,
    onSuccess: response => {
      zincRequest.current = null;
      setZincModalVisible(false);
      setZincAmount('');
      setZincError('');
      queryClient.setQueryData(['zinc-stock'], response);
      queryClient.invalidateQueries({ queryKey: ['zinc-stock'] });
      queryClient.invalidateQueries({ queryKey: ['zinc-stock-movements'] });
      Alert.alert('Zinc added', response?.message || 'Zinc moved into the kettle.');
    },
    onError: error => {
      setZincError(error?.response?.data?.message || 'Could not add zinc. Please try again.');
      if (error?.response?.status === 409) {
        zincRequest.current = null;
        zincStockQuery.refetch();
      }
    },
  });
  const canGrantProductionEdit = hasPermission(
    loggedUser,
    'production.grant_edit',
  );
  const canManageAllProduction = hasPermission(
    loggedUser,
    'production.manage_all',
  );

  const contractorQuery = useQuery({
    queryKey: ['contractors', 'production-options'],
    queryFn: getProductionContractorsApi,
  });
  const contractors = contractorQuery.data?.data || [];
  const defaultsQuery = useQuery({
    queryKey: ['production-defaults', loggedUser?.id],
    queryFn: getProductionDefaultsApi,
    enabled: canSaveProduction,
  });
  const defaults = defaultsQuery.data?.data || {};
  const defaultMutation = useMutation({
    mutationFn: setProductionDefaultsApi,
    onSuccess: response => {
      queryClient.setQueryData(
        ['production-defaults', loggedUser?.id],
        previous => ({
          ...previous,
          data: { ...previous?.data, ...response.data },
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['production-defaults'] });
    },
    onError: error =>
      Alert.alert(
        'Could not save default',
        error?.response?.data?.message || 'Please try again.',
      ),
  });

  const { data: availablePlanningData, isLoading: planningLoading } = useQuery({
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
  const { data: correctionPlanningData, isLoading: correctionPlanningLoading } =
    useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['contractor-report'] });
      queryClient.invalidateQueries({ queryKey: ['zinc-stock'] });
      queryClient.invalidateQueries({ queryKey: ['zinc-stock-movements'] });
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
    setFormContext({ shift_id: activeShiftId, shift_revision: shiftRevision });
    setFullForm({
      ...emptyFullForm,
      ...getDefaultProductionSelection(
        defaults,
        selectablePlanning,
        contractors,
      ),
    });
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
    setModalType(null);
    setFullForm(emptyFullForm);
  };

  const saveAddedZinc = () => {
    const kg = parseZincAmount(zincAmount);
    if (kg == null) {
      setZincError('Enter zinc kilograms greater than zero, with up to 3 decimal places.');
      return;
    }
    if (!zincStock?.initialized) {
      setZincError('Set opening zinc stock on the Zinc Stock screen first.');
      return;
    }
    const preview = zincTransferPreview(zincStock, kg);
    if (preview.error) {
      setZincError(preview.error);
      return;
    }
    if (!zincRequest.current || zincRequest.current.amount_kg !== kg) {
      zincRequest.current = {
        action: 'transfer',
        amount_kg: kg,
        expected_revision: zincStock.revision,
        request_id: `live_zinc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        note: 'Added from Live Production',
      };
    }
    setZincError('');
    zincMutation.mutate(zincRequest.current);
  };

  // Only the row's Edit button loads an existing entry by its immutable ID.
  const openEditModal = found => {
    if (!canManageAllProduction && !canEditProductionRow(found)) return;
    setFormContext({ shift_id: activeShiftId, shift_revision: shiftRevision });
    setFullForm({
      entry_id: found.id,
      contractor_id:
        found.contractor_id == null ? null : Number(found.contractor_id),
      contractor_name: found.contractor_name || '',
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
  const selectablePlanning = correctionMode
    ? correctionPlanningItems
    : availablePlanning;
  const activePlanning =
    selectablePlanning.find(
      item =>
        Number(item.planning_item_id) === Number(fullForm.planning_item_id),
    ) || null;

  useEffect(() => {
    if (
      modalType === 'Full' &&
      formContext &&
      (Number(formContext.shift_id) !== Number(activeShiftId) ||
        Number(formContext.shift_revision) !== Number(shiftRevision))
    ) {
      setModalType(null);
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
        'Select a planning challan',
        correctionMode
          ? 'Select the planning challan item for this missed entry.'
          : 'Choose a pending challan from the list. If it was completed or removed, refresh and select another challan.',
      );
      return;
    }

    const dippingQty = Number(fullForm.dipping_qty);
    if (
      fullForm.contractor_id &&
      !contractors.some(
        item => Number(item.id) === Number(fullForm.contractor_id),
      )
    ) {
      Alert.alert(
        'Contractor unavailable',
        'Refresh the contractor list and select an available contractor.',
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
      contractor_id: fullForm.contractor_id || null,
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
              disabled={
                defaultsQuery.isLoading ||
                contractorQuery.isLoading ||
                (correctionMode ? correctionPlanningLoading : planningLoading)
              }
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
        canAddZinc={canAddZinc}
        zincBusy={zincStockQuery.isLoading || zincMutation.isPending}
        onAddZinc={() => {
          zincRequest.current = null;
          setZincAmount('');
          setZincError('');
          setZincModalVisible(true);
        }}
      />
      <Modal
        visible={zincModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !zincMutation.isPending && setZincModalVisible(false)}
      >
        <View style={styles.zincOverlay}>
          <View style={styles.zincModal}>
            <Text style={styles.zincTitle}>Add zinc to kettle</Text>
            <Text style={styles.zincHelp}>
              This amount will move from plant stock into kettle stock.
            </Text>
            <TextInput
              mode="outlined"
              label="Zinc kg"
              value={zincAmount}
              onChangeText={value => {
                setZincAmount(value);
                setZincError('');
                zincRequest.current = null;
              }}
              keyboardType="decimal-pad"
              editable={!zincMutation.isPending}
            />
            {zincError ? <Text style={styles.zincError}>{zincError}</Text> : null}
            <View style={styles.zincActions}>
              <TouchableOpacity
                style={styles.zincCancel}
                disabled={zincMutation.isPending}
                onPress={() => setZincModalVisible(false)}
              >
                <Text style={styles.zincCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.zincSave}
                disabled={zincMutation.isPending}
                onPress={saveAddedZinc}
              >
                <Text style={styles.zincSaveText}>
                  {zincMutation.isPending ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
        {modalType === 'Full' && (
          <ProductionEntryForm
            fullForm={fullForm}
            setFullForm={setFullForm}
            formExistingEntry={formExistingEntry}
            canManageAllProduction={canManageAllProduction}
            correctionMode={correctionMode}
            selectablePlanning={selectablePlanning}
            activePlanning={activePlanning}
            contractors={contractors}
            contractorsLoading={contractorQuery.isLoading}
            contractorsError={contractorQuery.isError}
            onRetryContractors={contractorQuery.refetch}
            defaults={defaults}
            defaultsBusy={defaultMutation.isPending}
            defaultsError={defaultsQuery.isError}
            onSetDefault={body => defaultMutation.mutate(body)}
            loading={saveMutation.isPending}
            onSave={saveFullEntry}
            onClose={closeModal}
          />
        )}
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

  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

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
  dropdown: {
    minHeight: 56,
    borderRadius: UI.radiusSmall,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
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
  zincOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  zincModal: {
    width: '100%',
    maxWidth: 480,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
    padding: 20,
    gap: 14,
  },
  zincTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  zincHelp: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  zincError: { color: COLORS.danger, fontSize: 13 },
  zincActions: { flexDirection: 'row', gap: 10 },
  zincCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zincCancelText: { color: COLORS.primary, fontWeight: '600' },
  zincSave: {
    flex: 1,
    minHeight: 48,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zincSaveText: { color: COLORS.white, fontWeight: '700' },
});
