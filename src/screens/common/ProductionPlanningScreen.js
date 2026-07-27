import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Edit3,
  FileCheck2,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  createProductionPlanningApi,
  deleteProductionPlanningApi,
  getProductionPlanningApi,
  updateProductionPlanningApi,
} from '../../api/productionPlanningApi';

import { socket } from '../../socket/socket';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { pick } from '@react-native-documents/picker';
import { extractPlanningPdfApi } from '../../api/productionPlanningApi';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatQuantity } from '../../utils/format';
const emptyForm = {
  challan_no: '',
  party_name: '',
  material_description: '',
  planned_qty: '',
  third_party_name: '',
  status: 'pending',
};

export default function ProductionPlanningScreen() {
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['production-planning'],
    queryFn: () => getProductionPlanningApi(),
  });

  const planningList = data?.data || [];

  const route = useRoute();
  const navigation = useNavigation();

  useEffect(() => {
    const extracted = route.params?.extractedPdfData;

    if (extracted) {
      setEditingId(null);

      setForm(prev => ({
        ...prev,
        challan_no: extracted.challan_no || '',
        party_name: extracted.party_name || '',
        material_description: extracted.material_description || '',
        planned_qty: extracted.planned_qty || '',
        third_party_name: extracted.third_party_name || '',
        status: 'pending',
      }));

      setModalVisible(true);
    }
  }, [route.params?.extractedPdfData]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handlePlanningUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['production-planning'] });
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });
    };

    socket.on('production_planning_updated', handlePlanningUpdated);

    return () => {
      socket.off('production_planning_updated', handlePlanningUpdated);
    };
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: payload => {
      if (editingId) {
        return updateProductionPlanningApi({
          id: editingId,
          body: payload,
        });
      }

      return createProductionPlanningApi(payload);
    },
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['production-planning'] });
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });

      Alert.alert('Success', res?.message || 'Saved successfully');
      closeModal();
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
      );
    },
  });

  const pickAndExtractPdf = async () => {
    try {
      const [file] = await pick({
        type: ['application/pdf'],
      });

      const res = await extractPlanningPdfApi(file);

      const extracted = res?.data || {};

      setForm(prev => ({
        ...prev,
        challan_no: extracted.challan_no || prev.challan_no,
        party_name: extracted.party_name || prev.party_name,
        planned_qty: extracted.planned_qty || prev.planned_qty,
        third_party_name: extracted.third_party_name || prev.third_party_name,
        material_description:
          extracted.material_description || prev.material_description,
      }));

      Alert.alert('Success', 'PDF data extracted successfully');
    } catch (error) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'PDF extract failed',
      );
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProductionPlanningApi,
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['production-planning'] });
      queryClient.invalidateQueries({
        queryKey: ['available-production-planning'],
      });

      Alert.alert('Success', res?.message || 'Planning cancelled');
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
      );
    },
  });

  const updateForm = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = item => {
    setEditingId(item.id);

    setForm({
      challan_no: item.challan_no || '',
      party_name: item.party_name || '',
      material_description: item.material_description || '',
      planned_qty: String(item.planned_qty || ''),
      third_party_name: item.third_party_name || '',
      status: 'pending',
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (
      !form.challan_no ||
      !form.party_name ||
      !form.material_description ||
      !form.planned_qty
    ) {
      Alert.alert('Required', 'Please fill all required fields');
      return;
    }

    saveMutation.mutate({
      challan_no: form.challan_no.trim(),
      party_name: form.party_name.trim(),
      material_description: form.material_description.trim(),
      planned_qty: form.planned_qty,
      third_party_name: form.third_party_name.trim(),
      status: form.status,
    });
  };

  const handleDelete = item => {
    Alert.alert(
      'Cancel Planning',
      `Are you sure you want to cancel challan ${item.challan_no}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ],
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <View style={[styles.headerCard, centeredContent(contentMaxWidth)]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Production Planning</Text>
              <Text style={styles.description}>
                Challan wise production planning
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={openAddModal}
            >
              <Plus size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              centeredContent(contentMaxWidth),
            ]}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
          >
            {planningList.length === 0 ? (
              <View style={styles.emptyCard}>
                <ClipboardList size={34} color={COLORS.gray} />
                <Text style={styles.emptyText}>No planning found</Text>
              </View>
            ) : (
              planningList.map(item => (
                <PlanningCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))
            )}
          </ScrollView>
        )}
      </View>

      <PlanningModal
        visible={modalVisible}
        editingId={editingId}
        form={form}
        loading={saveMutation.isPending}
        onChange={updateForm}
        onClose={closeModal}
        onSave={handleSave}
        pickAndExtractPdf={pickAndExtractPdf}
      />
    </>
  );
}

function PlanningCard({ item, onEdit, onDelete }) {
  const partyText = item.third_party_name
    ? `${item.party_name} (${item.third_party_name})`
    : item.party_name;

  const isCompleted = item.status === 'completed';

  return (
    <View style={styles.planCard}>
      <View style={styles.planTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.challanNo}>{item.challan_no}</Text>
          <Text style={styles.partyName}>{partyText}</Text>
        </View>

        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.materialDesc}>{item.material_description}</Text>

      <View style={styles.qtyRow}>
        <InfoBox
          label="Planned"
          value={`${formatQuantity(item.planned_qty)} NOS`}
        />
        <InfoBox
          label="Completed"
          value={`${formatQuantity(item.completed_qty)} NOS`}
        />
        <InfoBox
          label="Remaining"
          value={`${formatQuantity(item.remaining_qty)} NOS`}
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.editBtn}
          activeOpacity={0.8}
          onPress={onEdit}
        >
          <Edit3 size={16} color={COLORS.primary} />
          <Text style={styles.editText}>EDIT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.8}
          onPress={onDelete}
        >
          <Trash2 size={16} color={COLORS.danger} />
          <Text style={styles.deleteText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatusBadge({ status }) {
  const lower = status || 'pending';

  return (
    <Text
      style={[
        styles.statusBadge,
        lower === 'completed' && styles.completedBadge,
        lower === 'canceled' && styles.canceledBadge,
      ]}
    >
      {lower.toUpperCase()}
    </Text>
  );
}

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PlanningModal({
  visible,
  editingId,
  form,
  loading,
  onChange,
  onClose,
  onSave,
  pickAndExtractPdf,
}) {
  const { formMaxWidth } = useResponsive();

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>
              {editingId ? 'Update Planning' : 'Add Planning'}
            </Text>
            <Text style={styles.modalDesc}>
              Challan, party and quantity details
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            {
              padding: 15,
            },
            centeredContent(formMaxWidth),
          ]}
        >
          <TouchableOpacity style={styles.pdfBtn} onPress={pickAndExtractPdf}>
            <Text style={styles.pdfBtnText}>EXTRACT FROM PDF</Text>
          </TouchableOpacity>
        </View>
        <Text
          style={{
            fontSize: 16,
            color: COLORS.textPrimary,
            fontWeight: '700',
            textAlign: 'center',
            width: '100%',
            paddingBottom: 15,
          }}
        >
          -- OR --
        </Text>
        <ScrollView
          contentContainerStyle={[
            styles.modalBody,
            centeredContent(formMaxWidth),
          ]}
        >
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Planning Details</Text>

            <AppInput
              label="Challan No"
              value={form.challan_no}
              onChangeText={v => onChange('challan_no', v)}
            />

            <AppInput
              label="Party Name"
              value={form.party_name}
              onChangeText={v => onChange('party_name', v)}
            />

            <AppInput
              label="Material Description"
              value={form.material_description}
              multiline
              numberOfLines={4}
              onChangeText={v => onChange('material_description', v)}
            />

            <AppInput
              label="Planned Qty NOS"
              value={form.planned_qty}
              keyboardType="numeric"
              onChangeText={v => onChange('planned_qty', v)}
            />

            <AppInput
              label="Third Party Name"
              value={form.third_party_name}
              onChangeText={v => onChange('third_party_name', v)}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={onSave}
          >
            <Text style={styles.saveText}>
              {loading
                ? 'Saving...'
                : editingId
                ? 'UPDATE PLANNING'
                : 'SAVE PLANNING'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AppInput({ style, ...props }) {
  return (
    <TextInput
      {...props}
      mode="outlined"
      style={[styles.input, style]}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      textColor={COLORS.text}
      placeholderTextColor={COLORS.gray}
      theme={PAPER_THEME}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    paddingTop: 15,
  },

  headerWrap: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  title: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '800',
  },

  description: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '700',
  },

  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  listContent: {
    padding: 15,
  },

  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
    marginTop: 10,
  },

  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },

  challanNo: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  partyName: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },

  completedBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },

  canceledBadge: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },

  materialDesc: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 20,
  },

  qtyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  infoBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 10,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '800',
  },

  infoValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  certificateBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  certificateText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  editBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  editText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  deleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  deleteText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },

  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
  },

  modalDesc: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
  },

  formTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },

  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },

  statusBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  statusText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  statusTextActive: {
    color: COLORS.white,
  },

  saveBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  saveBtnDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  pdfBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  pdfBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
