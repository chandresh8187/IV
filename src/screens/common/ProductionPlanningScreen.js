import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Edit3,
  FileDown,
  Package2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';
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
import { useSelector } from 'react-redux';

import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import { getItemsApi } from '../../api/itemsApi';
import {
  createProductionPlanningApi,
  deleteProductionPlanningApi,
  getProductionPlanningApi,
  updateProductionPlanningApi,
  reorderPlanningQueueApi,
} from '../../api/productionPlanningApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';
import ReorderablePlanningFlow from '../../components/ReorderablePlanningFlow';
import {
  movePlanningItem,
  movedPlanningIndex,
} from '../../utils/planningOrder';
import { downloadProductionPlanningFile } from '../../utils/serverProductionReport';
import { formatMaterialDescription } from '../../utils/format';

const emptyForm = { items: [] };
const emptyLine = {
  challan_number: '',
  challan_prefix: '',
  party_name: '',
  item_id: null,
  material_detail: '',
  planned_qty: '',
  target_zinc_percentage: '',
};

const formatQty = value =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const getChallanParts = challanNo => {
  const value = String(challanNo || '');
  const parts = value.split('/');
  if (parts.length < 2) return { prefix: '', number: value };
  return {
    prefix: `${parts.slice(0, -1).join('/')}/`,
    number: parts.at(-1) || '',
  };
};

export default function ProductionPlanningScreen({ navigation }) {
  const queryClient = useQueryClient();
  const { contentMaxWidth, height } = useResponsive();
  const loggedUser = useSelector(state => state.auth.user);
  const canManagePlanning = hasPermission(loggedUser, 'planning.manage');
  const canReorderFlows =
    canManagePlanning &&
    ['superadmin', 'plant_manager'].includes(
      String(loggedUser?.role || '')
        .trim()
        .toLowerCase(),
    );
  const [queueDragging, setQueueDragging] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [line, setLine] = useState(emptyLine);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const planningQuery = useQuery({
    queryKey: ['production-planning', statusFilter],
    queryFn: () => getProductionPlanningApi({ status: statusFilter }),
  });
  const itemsQuery = useQuery({
    queryKey: ['items'],
    queryFn: getItemsApi,
  });
  const currentYearQuery = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  const planningList = Array.isArray(planningQuery.data?.data)
    ? planningQuery.data.data
    : [];
  const itemRecords = useMemo(
    () => (Array.isArray(itemsQuery.data?.data) ? itemsQuery.data.data : []),
    [itemsQuery.data?.data],
  );
  const materialOptions = useMemo(
    () =>
      itemRecords.map(item => ({
        label: item.item_name,
        value: Number(item.id),
      })),
    [itemRecords],
  );

  const refreshPlanningQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['production-planning'] });
    queryClient.invalidateQueries({
      queryKey: ['available-production-planning'],
    });
  };

  const queueMutation = useMutation({
    mutationFn: reorderPlanningQueueApi,
    onMutate: async payload => {
      await queryClient.cancelQueries({
        queryKey: ['production-planning', 'pending'],
      });
      const previous = queryClient.getQueryData([
        'production-planning',
        'pending',
      ]);
      queryClient.setQueryData(['production-planning', 'pending'], cached =>
        cached
          ? {
              ...cached,
              data: payload.ordered_ids
                .map(id => cached.data.find(plan => Number(plan.id) === id))
                .filter(Boolean),
            }
          : cached,
      );
      return { previous };
    },
    onSuccess: refreshPlanningQueries,
    onError: (error, _, context) => {
      if (context?.previous)
        queryClient.setQueryData(
          ['production-planning', 'pending'],
          context.previous,
        );
      refreshPlanningQueries();
      Alert.alert(
        'Could not change production priority',
        error?.response?.data?.message || 'Refresh and try again.',
      );
    },
  });

  const reorderFlows = (from, to, snapshot) => {
    if (!canReorderFlows || queueMutation.isPending || from === to) return;
    queueMutation.mutate({
      expected_ids: snapshot.map(plan => Number(plan.id)),
      ordered_ids: movePlanningItem(snapshot, from, to).map(plan =>
        Number(plan.id),
      ),
    });
  };

  const saveMutation = useMutation({
    mutationFn: payload =>
      editingPlan
        ? updateProductionPlanningApi({ id: editingPlan.id, body: payload })
        : createProductionPlanningApi(payload),
    onSuccess: response => {
      refreshPlanningQueries();
      Alert.alert('Saved', response?.message || 'Production planning saved');
      closeModal();
    },
    onError: error => {
      queryClient.invalidateQueries({ queryKey: ['current-financial-year'] });
      Alert.alert(
        'Could not save planning',
        error?.response?.data?.message ||
          'Please check the details and try again.',
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductionPlanningApi,
    onSuccess: response => {
      refreshPlanningQueries();
      Alert.alert(
        'Deleted',
        response?.message || 'Production planning deleted',
      );
    },
    onError: error =>
      Alert.alert(
        'Could not delete planning',
        error?.response?.data?.message || 'Please try again.',
      ),
  });

  const resetLine = () => {
    setLine(emptyLine);
    setEditingLineIndex(null);
    setMaterialOpen(false);
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    resetLine();
    setModalVisible(true);
  };

  const openEditModal = plan => {
    setEditingPlan(plan);
    setForm({
      items: (plan.items || []).map(item => ({
        id: Number(item.id),
        challan_number: getChallanParts(item.challan_no).number,
        challan_prefix: getChallanParts(item.challan_no).prefix,
        challan_no: item.challan_no,
        party_name: item.party_name || '',
        item_id: item.item_id == null ? null : Number(item.item_id),
        item_name: item.item_name || item.material_description,
        material_detail: item.material_detail || '',
        planned_qty: String(item.planned_qty || ''),
        completed_qty: Number(item.completed_qty) || 0,
        target_zinc_percentage: String(
          item.target_zinc_percentage == null
            ? ''
            : item.target_zinc_percentage,
        ),
      })),
    });
    resetLine();
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingPlan(null);
    setForm(emptyForm);
    resetLine();
  };

  const addOrUpdateLine = () => {
    const selectedItem = itemRecords.find(
      item => Number(item.id) === Number(line.item_id),
    );
    const plannedQty = Number(line.planned_qty);
    const zincTarget = Number(line.target_zinc_percentage);
    const challanNumber = String(line.challan_number || '').trim();
    const partyName = String(line.party_name || '').trim();
    if (!/^\d+$/.test(challanNumber)) {
      Alert.alert(
        'Invalid challan',
        'Enter only the numeric last part of the challan number.',
      );
      return;
    }
    if (!partyName) {
      Alert.alert(
        'Party name required',
        'Enter the party name for this challan.',
      );
      return;
    }
    if (!selectedItem) {
      Alert.alert('Select material', 'Choose a material from the Items list.');
      return;
    }
    if (!Number.isInteger(plannedQty) || plannedQty <= 0) {
      Alert.alert(
        'Invalid quantity',
        'Planned quantity must be a positive whole number.',
      );
      return;
    }
    if (!Number.isFinite(zincTarget) || zincTarget <= 0 || zincTarget > 100) {
      Alert.alert(
        'Invalid zinc target',
        'Target zinc percentage must be between 0 and 100.',
      );
      return;
    }
    const duplicate = form.items.some(
      (item, index) =>
        index !== editingLineIndex &&
        String(item.challan_number) === challanNumber,
    );
    if (duplicate) {
      Alert.alert(
        'Already added',
        'This challan number is already in the production flow.',
      );
      return;
    }

    const previous =
      editingLineIndex == null ? null : form.items[editingLineIndex];
    const nextLine = {
      ...(previous?.id ? { id: previous.id } : {}),
      challan_number: challanNumber,
      challan_prefix: previous?.challan_prefix || line.challan_prefix || '',
      challan_no: `${
        previous?.challan_prefix || line.challan_prefix || ''
      }${challanNumber}`,
      party_name: partyName,
      item_id: Number(selectedItem.id),
      item_name: selectedItem.item_name,
      material_detail: String(line.material_detail || '').trim(),
      planned_qty: String(plannedQty),
      completed_qty: previous?.completed_qty || 0,
      target_zinc_percentage: String(zincTarget),
    };
    setForm(previousForm => {
      const nextItems = [...previousForm.items];
      if (editingLineIndex == null) nextItems.push(nextLine);
      else nextItems[editingLineIndex] = nextLine;
      return { ...previousForm, items: nextItems };
    });
    resetLine();
  };

  const editLine = index => {
    const item = form.items[index];
    setEditingLineIndex(index);
    setLine({
      challan_number: item.challan_number,
      challan_prefix:
        item.challan_prefix || getChallanParts(item.challan_no).prefix,
      party_name: item.party_name,
      item_id: item.item_id,
      material_detail: item.material_detail || '',
      planned_qty: String(item.planned_qty),
      target_zinc_percentage: String(item.target_zinc_percentage),
    });
  };

  const reorderLines = (from, to) => {
    if (saveMutation.isPending) return;
    setForm(previous => ({
      ...previous,
      items: movePlanningItem(previous.items, from, to),
    }));
    setEditingLineIndex(previous => movedPlanningIndex(previous, from, to));
  };

  const removeLine = index => {
    const item = form.items[index];
    if (Number(item.completed_qty) > 0) {
      Alert.alert(
        'Production already started',
        `${
          item.material_detail
            ? `${item.item_name} ${item.material_detail}`
            : item.item_name
        } cannot be removed because ${formatQty(
          item.completed_qty,
        )} NOS is already completed.`,
      );
      return;
    }
    setForm(previous => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
    if (editingLineIndex === index) resetLine();
  };

  const savePlanning = () => {
    if (!form.items.length) {
      Alert.alert(
        'Add material',
        'Use the Add Item button to build the production flow first.',
      );
      return;
    }
    saveMutation.mutate({
      ...(!editingPlan
        ? { financial_year_id: currentYearQuery.data?.data?.id }
        : {}),
      items: form.items.map(item => ({
        ...(item.id ? { id: Number(item.id) } : {}),
        challan_number: item.challan_number,
        party_name: item.party_name,
        item_id: Number(item.item_id),
        material_detail: item.material_detail || '',
        planned_qty: Number(item.planned_qty),
        target_zinc_percentage: Number(item.target_zinc_percentage),
      })),
    });
  };

  const confirmDelete = plan => {
    Alert.alert(
      'Delete production planning?',
      `This ${
        plan.item_count || plan.items?.length || 0
      }-item production flow will be removed. Existing production history will remain safe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(plan.id),
        },
      ],
    );
  };

  const openPlanningFile = async plan => {
    if (downloadingId != null) return;
    setDownloadingId(plan.id);
    try {
      const pdf = await downloadProductionPlanningFile({
        id: plan.id,
      });
      navigation.navigate('PdfViewer', {
        ...pdf,
        title: `Production Flow ${plan.id}`,
      });
    } catch (error) {
      Alert.alert(
        'Could not open file',
        error?.response?.data?.message || error?.message || 'Please try again.',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, centeredContent(contentMaxWidth)]}>
        <View style={styles.headerIcon}>
          <ClipboardList size={23} color={COLORS.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Planning register</Text>
          <Text style={styles.subtitle}>
            Ordered challans and material targets
          </Text>
        </View>
        {canManagePlanning ? (
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Plus size={18} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.filters, centeredContent(contentMaxWidth)]}>
        {['pending', 'completed'].map(status => (
          <TouchableOpacity
            key={status}
            accessibilityRole="tab"
            accessibilityState={{ selected: statusFilter === status }}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive,
              ]}
            >
              {status === 'pending' ? 'Pending' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {planningQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.stateText}>Loading production plans...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={!queueDragging}
          contentContainerStyle={[
            styles.listContent,
            centeredContent(contentMaxWidth),
          ]}
          refreshControl={
            <RefreshControl
              refreshing={planningQuery.isRefetching}
              onRefresh={planningQuery.refetch}
            />
          }
        >
          {statusFilter === 'pending' && planningList.length ? (
            <>
              <Text style={styles.sectionTitle}>
                {queueMutation.isPending
                  ? 'Saving production priority…'
                  : 'Production queue · top flow runs first'}
              </Text>
              <ReorderablePlanningFlow
                items={planningList}
                onReorder={reorderFlows}
                showHandles={canReorderFlows}
                disabled={!canReorderFlows || queueMutation.isPending}
                maxHeight={Math.max(320, (height || 800) - 260)}
                onDraggingChange={setQueueDragging}
                hint={
                  canReorderFlows
                    ? 'Drag a flow to the top to produce it next. Priority saves when you release. Existing quantities are preserved.'
                    : 'Flows run from top to bottom, finishing each remaining item in order.'
                }
                renderItem={(plan, index) => (
                  <View>
                    <Text style={styles.sectionHint}>
                      {index === 0
                        ? 'NEXT FLOW'
                        : `QUEUE POSITION ${index + 1}`}
                    </Text>
                    <PlanningCard
                      plan={plan}
                      canManage={canManagePlanning && !queueMutation.isPending}
                      fileLoading={downloadingId === plan.id}
                      fileDisabled={downloadingId != null}
                      onFile={() => openPlanningFile(plan)}
                      onEdit={() => openEditModal(plan)}
                      onDelete={() => confirmDelete(plan)}
                    />
                  </View>
                )}
              />
            </>
          ) : (
            <ResponsiveGrid minColumnWidth={400}>
              {planningList.length ? (
                planningList.map(plan => (
                  <PlanningCard
                    key={plan.id}
                    plan={plan}
                    canManage={canManagePlanning}
                    fileLoading={downloadingId === plan.id}
                    fileDisabled={downloadingId != null}
                    onFile={() => openPlanningFile(plan)}
                    onEdit={() => openEditModal(plan)}
                    onDelete={() => confirmDelete(plan)}
                  />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Package2 size={32} color={COLORS.muted} />
                  <Text style={styles.emptyTitle}>No {statusFilter} plans</Text>
                  <Text style={styles.stateText}>
                    {statusFilter === 'pending'
                      ? 'Add a planning challan to start the next production flow.'
                      : 'Completed production flows will appear here.'}
                  </Text>
                </View>
              )}
            </ResponsiveGrid>
          )}
        </ScrollView>
      )}

      <PlanningModal
        visible={modalVisible}
        editingPlan={editingPlan}
        form={form}
        line={line}
        setLine={setLine}
        editingLineIndex={editingLineIndex}
        materialOpen={materialOpen}
        setMaterialOpen={setMaterialOpen}
        materialOptions={materialOptions}
        itemsLoading={itemsQuery.isLoading}
        currentYear={
          currentYearQuery.isError
            ? null
            : currentYearQuery.data?.data?.financial_year
        }
        currentYearError={currentYearQuery.error?.response?.data?.message || ''}
        saving={saveMutation.isPending}
        onAddLine={addOrUpdateLine}
        onEditLine={editLine}
        onRemoveLine={removeLine}
        onReorder={reorderLines}
        onCancelLine={resetLine}
        onClose={() => closeModal()}
        onSave={savePlanning}
      />
    </View>
  );
}

function PlanningCard({
  plan,
  canManage,
  fileLoading,
  fileDisabled,
  onFile,
  onEdit,
  onDelete,
}) {
  const items = Array.isArray(plan.items) ? plan.items : [];
  const progress = Number(plan.planned_qty)
    ? Math.min(
        100,
        (Number(plan.completed_qty) / Number(plan.planned_qty)) * 100,
      )
    : 0;

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeading}>
        <View style={styles.planHeadingCopy}>
          <Text style={styles.challan}>Production Flow #{plan.id}</Text>
          <Text style={styles.planMeta}>
            {items.length} {items.length === 1 ? 'item' : 'items'} ·{' '}
            {formatQty(plan.planned_qty)} NOS planned
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            plan.status === 'completed' && styles.statusBadgeComplete,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              plan.status === 'completed' && styles.statusTextComplete,
            ]}
          >
            {plan.status === 'completed' ? 'COMPLETED' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressText}>
          {formatQty(plan.completed_qty)} completed
        </Text>
        <Text style={styles.progressText}>
          {formatQty(plan.remaining_qty)} remaining
        </Text>
      </View>

      <View style={styles.flowList}>
        {items.map((item, index) => (
          <View key={item.id || `${plan.id}-${index}`} style={styles.flowRow}>
            <View
              style={[
                styles.sequenceBadge,
                item.status === 'completed' && styles.sequenceBadgeComplete,
              ]}
            >
              <Text style={styles.sequenceText}>{index + 1}</Text>
            </View>
            <View style={styles.flowCopy}>
              <Text style={styles.flowChallan}>{item.challan_no}</Text>
              <Text style={styles.flowName}>
                {formatMaterialDescription(
                  item.material_description || item.item_name,
                )}
              </Text>
              <Text style={styles.flowMeta}>
                {item.party_name} · {formatQty(item.completed_qty)} /{' '}
                {formatQty(item.planned_qty)} NOS · Zn{' '}
                {formatQty(item.target_zinc_percentage)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.fileButton, fileDisabled && styles.buttonDisabled]}
          disabled={fileDisabled}
          onPress={onFile}
        >
          {fileLoading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <FileDown size={17} color={COLORS.accent} />
          )}
          <Text style={styles.fileButtonText}>View PDF</Text>
        </TouchableOpacity>
        {canManage ? (
          <>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Edit3 size={16} color={COLORS.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Trash2 size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

function PlanningModal({
  visible,
  editingPlan,
  form,
  line,
  setLine,
  editingLineIndex,
  materialOpen,
  setMaterialOpen,
  materialOptions,
  itemsLoading,
  currentYear,
  currentYearError,
  saving,
  onAddLine,
  onEditLine,
  onRemoveLine,
  onReorder,
  onCancelLine,
  onClose,
  onSave,
}) {
  const { workspaceFormMaxWidth } = useResponsive();
  const [dragging, setDragging] = useState(false);
  const prefix = line.challan_prefix
    ? line.challan_prefix
    : currentYear
    ? `DC/${currentYear}/`
    : 'DC/----/';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          style={styles.modalSafe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle}>
                {editingPlan
                  ? 'Edit production planning'
                  : 'Add production planning'}
              </Text>
              <Text style={styles.modalSubtitle}>
                Build the item flow in production order
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={21} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!dragging}
            nestedScrollEnabled
            contentContainerStyle={[
              styles.modalContent,
              centeredContent(workspaceFormMaxWidth),
            ]}
          >
            {currentYearError && !editingPlan ? (
              <Text style={styles.errorBanner}>{currentYearError}</Text>
            ) : null}

            <ResponsiveGrid minColumnWidth={400}>
              <View style={styles.formCard}>
                <View style={styles.sectionHeadingRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      {editingLineIndex == null ? 'Add an item' : 'Update item'}
                    </Text>
                    <Text style={styles.sectionHint}>
                      Items run from top to bottom.
                    </Text>
                  </View>
                  {editingLineIndex != null ? (
                    <TouchableOpacity onPress={onCancelLine}>
                      <Text style={styles.cancelEditText}>Cancel edit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.challanInputRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>{prefix}</Text>
                  </View>
                  <TextInput
                    label="Challan Number"
                    value={line.challan_number}
                    onChangeText={value =>
                      setLine(previous => ({
                        ...previous,
                        challan_number: value.replace(/\D/g, ''),
                      }))
                    }
                    mode="outlined"
                    style={styles.challanInput}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                  />
                </View>

                <TextInput
                  label="Party Name"
                  value={line.party_name}
                  onChangeText={value =>
                    setLine(previous => ({ ...previous, party_name: value }))
                  }
                  mode="outlined"
                  style={[styles.input, styles.partyInput]}
                  outlineColor={COLORS.inputBorder}
                  activeOutlineColor={COLORS.accent}
                  textColor={COLORS.text}
                  theme={PAPER_THEME}
                />

                <View style={styles.dropdownWrap}>
                  <DropDownPicker
                    open={materialOpen}
                    value={line.item_id}
                    items={materialOptions}
                    setOpen={setMaterialOpen}
                    setValue={callback =>
                      setLine(previous => ({
                        ...previous,
                        item_id: callback(previous.item_id),
                      }))
                    }
                    listMode="MODAL"
                    searchable
                    searchPlaceholder="Search materials"
                    loading={itemsLoading}
                    placeholder={
                      itemsLoading ? 'Loading materials...' : 'Select material'
                    }
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                    textStyle={styles.dropdownText}
                    placeholderStyle={styles.dropdownPlaceholder}
                    modalTitle="Select material"
                  />
                </View>

                <TextInput
                  label="Material Description"
                  value={line.material_detail}
                  onChangeText={value =>
                    setLine(previous => ({
                      ...previous,
                      material_detail: value,
                    }))
                  }
                  mode="outlined"
                  placeholder="Example: 1.7mm, L-4000mm"
                  style={[styles.input, styles.materialDetailInput]}
                  outlineColor={COLORS.inputBorder}
                  activeOutlineColor={COLORS.accent}
                  textColor={COLORS.text}
                  theme={PAPER_THEME}
                />

                <View style={styles.twoColumns}>
                  <TextInput
                    label="Planned Qty"
                    value={line.planned_qty}
                    keyboardType="number-pad"
                    onChangeText={value =>
                      setLine(previous => ({
                        ...previous,
                        planned_qty: value.replace(/\D/g, ''),
                      }))
                    }
                    mode="outlined"
                    style={[styles.input, styles.columnInput]}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                  />
                  <TextInput
                    label="Target Zinc %"
                    value={line.target_zinc_percentage}
                    keyboardType="decimal-pad"
                    onChangeText={value =>
                      setLine(previous => ({
                        ...previous,
                        target_zinc_percentage: value.replace(/[^\d.]/g, ''),
                      }))
                    }
                    mode="outlined"
                    style={[styles.input, styles.columnInput]}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                  />
                </View>

                <TouchableOpacity
                  style={styles.addLineButton}
                  onPress={onAddLine}
                >
                  {editingLineIndex == null ? (
                    <Plus size={18} color={COLORS.white} />
                  ) : (
                    <Save size={18} color={COLORS.white} />
                  )}
                  <Text style={styles.addLineText}>
                    {editingLineIndex == null
                      ? 'Add Item to Flow'
                      : 'Update Item'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formCard}>
                <View style={styles.flowHeader}>
                  <Text style={styles.sectionTitle}>Production flow</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{form.items.length}</Text>
                  </View>
                </View>
                {form.items.length ? (
                  <ReorderablePlanningFlow
                    items={form.items}
                    onReorder={onReorder}
                    disabled={saving}
                    onDraggingChange={setDragging}
                    renderItem={(item, index) => (
                      <View
                        key={item.id || `${item.item_id}-${index}`}
                        style={styles.formFlowRow}
                      >
                        <View style={styles.formSequence}>
                          <Text style={styles.formSequenceText}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={styles.formFlowCopy}>
                          <Text style={styles.formFlowChallan}>
                            {`${
                              item.challan_prefix ||
                              (currentYear ? `DC/${currentYear}/` : 'DC/----/')
                            }${item.challan_number}`}
                          </Text>
                          <Text style={styles.formFlowName}>
                            {item.material_detail
                              ? `${item.item_name} ${item.material_detail}`
                              : item.item_name}
                          </Text>
                          <Text style={styles.formFlowMeta}>
                            {item.party_name} · {formatQty(item.planned_qty)}{' '}
                            NOS · Zinc target{' '}
                            {formatQty(item.target_zinc_percentage)}%
                          </Text>
                          {Number(item.completed_qty) > 0 ? (
                            <Text style={styles.completedText}>
                              {formatQty(item.completed_qty)} NOS already
                              completed
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.flowRowActions}>
                          <TouchableOpacity
                            style={styles.lineAction}
                            onPress={() => onEditLine(index)}
                          >
                            <Pencil size={16} color={COLORS.teal} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.lineAction, styles.flowDeleteAction]}
                            onPress={() => onRemoveLine(index)}
                          >
                            <Trash2 size={16} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.emptyFlow}>
                    <Package2 size={25} color={COLORS.muted} />
                    <Text style={styles.emptyFlowText}>
                      Added items will appear here in production order.
                    </Text>
                  </View>
                )}
              </View>
            </ResponsiveGrid>
            <TouchableOpacity
              style={[
                styles.savePlanningButton,
                (saving || (!editingPlan && !currentYear)) &&
                  styles.buttonDisabled,
              ]}
              disabled={saving || dragging || (!editingPlan && !currentYear)}
              onPress={onSave}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Save size={19} color={COLORS.white} />
                  <Text style={styles.savePlanningText}>
                    {editingPlan ? 'Update Planning' : 'Save Planning'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 14 },
  header: {
    minHeight: 76,
    marginHorizontal: UI.pagePadding,
    padding: 14,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    ...UI.shadow,
  },
  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  headerCopy: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  title: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  subtitle: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
  },
  addButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  filters: {
    marginHorizontal: UI.pagePadding,
    marginTop: 12,
    padding: 4,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    gap: 5,
    backgroundColor: COLORS.white,
  },
  filterButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.gray, fontSize: 12.5, fontWeight: '600' },
  filterTextActive: { color: COLORS.white, fontWeight: '600' },
  listContent: { padding: UI.pagePadding, paddingTop: 14, paddingBottom: 36 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stateText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyCard: {
    minHeight: 220,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
    backgroundColor: COLORS.white,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  planCard: {
    marginBottom: 13,
    padding: 16,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  planHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planHeadingCopy: { flex: 1, minWidth: 0 },
  challan: { color: COLORS.text, fontSize: 17, fontWeight: '600' },
  planMeta: { color: COLORS.gray, fontSize: 12, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warningSoft,
  },
  statusBadgeComplete: { backgroundColor: COLORS.tealSoft },
  statusText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },
  statusTextComplete: { color: COLORS.teal },
  progressTrack: {
    height: 7,
    marginTop: 15,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.teal,
  },
  progressLabels: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  flowList: { marginTop: 13, borderTopWidth: 1, borderTopColor: COLORS.border },
  flowRow: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  sequenceBadgeComplete: { backgroundColor: COLORS.tealSoft },
  sequenceText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  flowCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  flowChallan: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  flowName: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
  flowMeta: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  cardActions: { marginTop: 14, flexDirection: 'row', gap: 8 },
  fileButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  fileButtonText: { color: COLORS.accent, fontSize: 12.5, fontWeight: '600' },
  editButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  editButtonText: { color: COLORS.accent, fontSize: 12.5, fontWeight: '600' },
  deleteButton: {
    width: 44,
    minHeight: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerSoft,
  },
  buttonDisabled: { opacity: 0.55 },
  modalSafe: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    minHeight: 74,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  modalHeaderCopy: { flex: 1, minWidth: 0 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modalSubtitle: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  modalContent: { padding: 16, paddingBottom: 42 },
  errorBanner: {
    padding: 12,
    marginBottom: 10,
    borderRadius: UI.radiusSmall,
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    backgroundColor: COLORS.dangerSoft,
  },
  formCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  sectionHint: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  challanInputRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixBox: {
    minHeight: 56,
    paddingHorizontal: 11,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  prefixText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  challanInput: { flex: 1, backgroundColor: COLORS.white },
  partyInput: { marginTop: 10 },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelEditText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  dropdownWrap: { marginTop: 14, zIndex: 20 },
  dropdown: {
    minHeight: 56,
    borderRadius: UI.radiusSmall,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
  },
  dropdownContainer: {
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
  },
  dropdownText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  dropdownPlaceholder: { color: COLORS.gray },
  materialDetailInput: { marginTop: 10 },
  twoColumns: { marginTop: 8, flexDirection: 'row', gap: 9 },
  input: { backgroundColor: COLORS.white },
  columnInput: { flex: 1 },
  addLineButton: {
    minHeight: 50,
    marginTop: 12,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  addLineText: { color: COLORS.white, fontSize: 13.5, fontWeight: '600' },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  countBadge: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  countText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  formFlowRow: {
    minHeight: 68,
    paddingVertical: 12,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  formSequence: {
    width: 30,
    height: 30,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  formSequenceText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  formFlowCopy: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  flowRowActions: { gap: 8 },
  flowDeleteAction: { backgroundColor: COLORS.dangerSoft },
  formFlowChallan: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  formFlowName: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
  formFlowMeta: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  completedText: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  lineAction: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  lineDeleteAction: { marginLeft: 6, backgroundColor: COLORS.dangerSoft },
  emptyFlow: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyFlowText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  savePlanningButton: {
    minHeight: 56,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    ...UI.shadow,
  },
  savePlanningText: { color: COLORS.white, fontSize: 14.5, fontWeight: '600' },
});
