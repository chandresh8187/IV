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
  Droplets,
  Factory,
  Plus,
  Scale,
  X,
} from 'lucide-react-native';

import { getProductionsApi, saveProductionApi } from '../../api/productionApi';
import { socket } from '../../socket/socket';
import { useSelector } from 'react-redux';

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

const emptyBasic = {
  sr_no: '',
  challan_no: '',
  party_name: '',
  material: '',
};

const emptyDip = {
  sr_no: '',
  production_time: '',
  dipping_qty: '',
  kettle_temperature: '',
};

const emptyWeight = {
  sr_no: '',
  ms_weight: '',
  gi_weight: '',
};

const emptyCoating = {
  sr_no: '',
  c1: '',
  c2: '',
  c3: '',
  c4: '',
  c5: '',
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

  const [optionModal, setOptionModal] = useState(false);
  const [modalType, setModalType] = useState(null);

  const [basicForm, setBasicForm] = useState(emptyBasic);
  const [dipForm, setDipForm] = useState(emptyDip);
  const [weightForm, setWeightForm] = useState(emptyWeight);
  const [coatingForm, setCoatingForm] = useState(emptyCoating);
  const loggedUser = useSelector(state => state.auth.user);

  const canManageProduction =
    loggedUser?.role === 'superadmin' || loggedUser?.role === 'supervisor';

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['productions'],
    queryFn: () => getProductionsApi({ limit: 100 }),
  });

  const saveMutation = useMutation({
    mutationFn: saveProductionApi,
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'Saved successfully');

      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      closeFormModal();
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

    const handleProductionUpdated = payload => {
      console.log('production_updated:', payload);

      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleShiftUpdated = payload => {
      console.log('shift_updated:', payload);

      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
    };

    socket.on('production_updated', handleProductionUpdated);
    socket.on('shift_updated', handleShiftUpdated);

    return () => {
      socket.off('production_updated', handleProductionUpdated);
      socket.off('shift_updated', handleShiftUpdated);
    };
  }, [queryClient]);

  const rows = data?.data?.table_data || data?.data || [];

  const openForm = type => {
    setOptionModal(false);
    setModalType(type);
  };

  const closeFormModal = () => {
    setModalType(null);
    setBasicForm(emptyBasic);
    setDipForm(emptyDip);
    setWeightForm(emptyWeight);
    setCoatingForm(emptyCoating);
  };

  const findRowBySrNo = srNo => {
    return rows.find(item => String(item.sr_no) === String(srNo));
  };

  const fillFromSrNo = (srNo, type) => {
    const row = findRowBySrNo(srNo);

    if (type === 'BASIC') {
      if (!row) {
        setBasicForm({
          ...emptyBasic,
          sr_no: srNo,
        });
        return;
      }

      setBasicForm({
        sr_no: String(row.sr_no || ''),
        challan_no: row.challan_no || '',
        party_name: row.party_name || '',
        material: row.material || '',
      });
    }

    if (type === 'DIP') {
      if (!row) {
        setDipForm({
          ...emptyDip,
          sr_no: srNo,
        });
        return;
      }

      setDipForm({
        sr_no: String(row.sr_no || ''),
        production_time: row.production_time || '',
        dipping_qty: String(row.dipping_qty || ''),
        kettle_temperature: String(row.kettle_temperature || ''),
      });
    }

    if (type === 'WEIGHT') {
      if (!row) {
        setWeightForm({
          ...emptyWeight,
          sr_no: srNo,
        });
        return;
      }

      setWeightForm({
        sr_no: String(row.sr_no || ''),
        ms_weight: String(row.ms_weight || ''),
        gi_weight: String(row.gi_weight || ''),
      });
    }

    if (type === 'COATING') {
      if (!row) {
        setCoatingForm({
          ...emptyCoating,
          sr_no: srNo,
        });
        return;
      }

      setCoatingForm({
        sr_no: String(row.sr_no || ''),
        c1: String(row.c1 || ''),
        c2: String(row.c2 || ''),
        c3: String(row.c3 || ''),
        c4: String(row.c4 || ''),
        c5: String(row.c5 || ''),
      });
    }
  };

  const saveBasic = () => {
    if (
      !basicForm.sr_no ||
      !basicForm.challan_no ||
      !basicForm.party_name ||
      !basicForm.material
    ) {
      Alert.alert(
        'Required',
        'Please enter Sr No, Challan, Party and Material',
      );
      return;
    }

    saveMutation.mutate({
      entry_type: 'basic',
      sr_no: Number(basicForm.sr_no),
      challan_no: basicForm.challan_no,
      party_name: basicForm.party_name,
      material: basicForm.material,
    });
  };

  const saveDip = () => {
    if (!dipForm.sr_no) {
      Alert.alert('Required', 'Please enter Sr No');
      return;
    }

    saveMutation.mutate({
      entry_type: 'dip',
      sr_no: Number(dipForm.sr_no),
      production_time: dipForm.production_time,
      dipping_qty: Number(dipForm.dipping_qty || 0),
      kettle_temperature: Number(dipForm.kettle_temperature || 0),
    });
  };

  const saveWeight = () => {
    if (!weightForm.sr_no) {
      Alert.alert('Required', 'Please enter Sr No');
      return;
    }

    saveMutation.mutate({
      entry_type: 'weight',
      sr_no: Number(weightForm.sr_no),
      ms_weight: Number(weightForm.ms_weight || 0),
      gi_weight: Number(weightForm.gi_weight || 0),
    });
  };

  const saveCoating = () => {
    if (!coatingForm.sr_no) {
      Alert.alert('Required', 'Please enter Sr No');
      return;
    }

    saveMutation.mutate({
      entry_type: 'coating',
      sr_no: Number(coatingForm.sr_no),
      c1: Number(coatingForm.c1 || 0),
      c2: Number(coatingForm.c2 || 0),
      c3: Number(coatingForm.c3 || 0),
      c4: Number(coatingForm.c4 || 0),
      c5: Number(coatingForm.c5 || 0),
    });
  };

  const previewZinc =
    Number(weightForm.ms_weight) > 0 && Number(weightForm.gi_weight) > 0
      ? (
          ((Number(weightForm.gi_weight) - Number(weightForm.ms_weight)) /
            Number(weightForm.ms_weight)) *
          100
        ).toFixed(2)
      : '';

  const coatingValues = [
    coatingForm.c1,
    coatingForm.c2,
    coatingForm.c3,
    coatingForm.c4,
    coatingForm.c5,
  ]
    .map(Number)
    .filter(v => v > 0);

  const previewAvgCoating =
    coatingValues.length > 0
      ? Math.round(
          coatingValues.reduce((a, b) => a + b, 0) / coatingValues.length,
        ).toString()
      : '';

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Live Production</Text>
          <Text style={styles.description}>Sr No wise production table</Text>
        </View>

        <View style={styles.headerIcon}>
          <Factory size={24} color={COLORS.primary} />
        </View>
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

              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching}
                    onRefresh={refetch}
                  />
                }
              >
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
                      <Cell width={90}>{item.ms_weight || '-'}</Cell>
                      <Cell width={90}>{item.gi_weight || '-'}</Cell>
                      <Cell width={90}>{item.zinc_percentage || '-'}</Cell>
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
          onPress={() => setOptionModal(true)}
        >
          <Plus size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <EntryTypeModal
        visible={optionModal}
        onClose={() => setOptionModal(false)}
        onSelect={openForm}
      />

      <ProductionFormModal
        modalType={modalType}
        previewZinc={previewZinc}
        previewAvgCoating={previewAvgCoating}
        closeModal={closeFormModal}
        loading={saveMutation.isPending}
        basicForm={basicForm}
        setBasicForm={setBasicForm}
        saveBasic={saveBasic}
        dipForm={dipForm}
        setDipForm={setDipForm}
        saveDip={saveDip}
        weightForm={weightForm}
        setWeightForm={setWeightForm}
        saveWeight={saveWeight}
        coatingForm={coatingForm}
        setCoatingForm={setCoatingForm}
        saveCoating={saveCoating}
        fillFromSrNo={fillFromSrNo}
      />
    </View>
  );
}

function EntryTypeModal({ visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.optionCard}>
          <Text style={styles.optionTitle}>Select Entry Type</Text>

          <EntryOption
            icon={<ClipboardList size={22} color={COLORS.primary} />}
            title="Basic Entry"
            desc="Sr No, challan, party, material"
            onPress={() => onSelect('BASIC')}
          />

          <EntryOption
            icon={<Factory size={22} color={COLORS.primary} />}
            title="Dip Details"
            desc="Time, dipping qty, kettle temp"
            onPress={() => onSelect('DIP')}
          />

          <EntryOption
            icon={<Scale size={22} color={COLORS.primary} />}
            title="Weight Details"
            desc="MS weight, GI weight, zinc %"
            onPress={() => onSelect('WEIGHT')}
          />

          <EntryOption
            icon={<Droplets size={22} color={COLORS.primary} />}
            title="Coating Details"
            desc="C1 to C5 readings"
            onPress={() => onSelect('COATING')}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function EntryOption({ icon, title, desc, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.optionRow}
      onPress={onPress}
    >
      <View style={styles.optionIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.optionRowTitle}>{title}</Text>
        <Text style={styles.optionRowDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
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

function ProductionFormModal(props) {
  const {
    modalType,
    closeModal,
    loading,
    basicForm,
    setBasicForm,
    saveBasic,
    dipForm,
    setDipForm,
    saveDip,
    weightForm,
    setWeightForm,
    saveWeight,
    coatingForm,
    setCoatingForm,
    saveCoating,
    fillFromSrNo,
    previewZinc,
    previewAvgCoating,
  } = props;

  const title =
    modalType === 'BASIC'
      ? 'Basic Entry'
      : modalType === 'DIP'
      ? 'Dip Details'
      : modalType === 'WEIGHT'
      ? 'Weight Details'
      : 'Coating Details';

  return (
    <Modal visible={!!modalType} animationType="slide">
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalDesc}>Update data by Sr No</Text>
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
          {modalType === 'BASIC' && (
            <FormCard title="Sr No + Basic Details">
              <FormInput
                label="Sr No"
                value={basicForm.sr_no}
                keyboardType="numeric"
                onChangeText={v => {
                  setBasicForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v, 'BASIC');
                }}
              />

              <FormInput
                label="Challan No"
                value={basicForm.challan_no}
                onChangeText={v => {
                  setBasicForm(prev => ({ ...prev, challan_no: v }));
                }}
              />

              <FormInput
                label="Party Name"
                value={basicForm.party_name}
                onChangeText={v =>
                  setBasicForm(prev => ({ ...prev, party_name: v }))
                }
              />

              <FormInput
                label="Material"
                value={basicForm.material}
                onChangeText={v =>
                  setBasicForm(prev => ({ ...prev, material: v }))
                }
              />

              <SaveButton
                loading={loading}
                title="SAVE BASIC DETAILS"
                onPress={saveBasic}
              />
            </FormCard>
          )}

          {modalType === 'DIP' && (
            <FormCard title="Select Sr No + Dip Details">
              <FormInput
                label="Sr No"
                value={dipForm.sr_no}
                keyboardType="numeric"
                onChangeText={v => {
                  setDipForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v, 'DIP');
                }}
              />

              <FormInput
                label="Production Time"
                value={dipForm.production_time}
                onChangeText={v =>
                  setDipForm(prev => ({ ...prev, production_time: v }))
                }
              />

              <FormInput
                label="Dipping Qty"
                value={dipForm.dipping_qty}
                keyboardType="numeric"
                onChangeText={v =>
                  setDipForm(prev => ({ ...prev, dipping_qty: v }))
                }
              />
              <FormInput
                label="Kettle Temperature °C"
                value={dipForm.kettle_temperature}
                keyboardType="numeric"
                onChangeText={v =>
                  setDipForm(prev => ({ ...prev, kettle_temperature: v }))
                }
              />

              <SaveButton
                loading={loading}
                title="SAVE DIP DETAILS"
                onPress={saveDip}
              />
            </FormCard>
          )}

          {modalType === 'WEIGHT' && (
            <FormCard title="Select Sr No + Weight Details">
              <FormInput
                label="Sr No"
                value={weightForm.sr_no}
                keyboardType="numeric"
                onChangeText={v => {
                  setWeightForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v, 'WEIGHT');
                }}
              />

              <FormInput
                label="MS Weight 1 Nos"
                value={weightForm.ms_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setWeightForm(prev => ({ ...prev, ms_weight: v }))
                }
              />

              <FormInput
                label="GI Weight 1 Nos"
                value={weightForm.gi_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setWeightForm(prev => ({ ...prev, gi_weight: v }))
                }
              />

              {previewZinc !== '' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Zinc Consumption</Text>
                  <Text style={styles.previewValue}>{previewZinc}%</Text>
                </View>
              )}

              <SaveButton
                loading={loading}
                title="SAVE WEIGHT DETAILS"
                onPress={saveWeight}
              />
            </FormCard>
          )}

          {modalType === 'COATING' && (
            <FormCard title="Select Sr No + Coating Details">
              <FormInput
                label="Sr No"
                value={coatingForm.sr_no}
                keyboardType="numeric"
                onChangeText={v => {
                  setCoatingForm(prev => ({ ...prev, sr_no: v }));
                  fillFromSrNo(v, 'COATING');
                }}
              />

              <View style={styles.coatingRow}>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map((key, index) => (
                  <TextInput
                    key={key}
                    label={`C${index + 1}`}
                    value={coatingForm[key]}
                    onChangeText={v =>
                      setCoatingForm(prev => ({ ...prev, [key]: v }))
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

              <SaveButton
                loading={loading}
                title="SAVE COATING DETAILS"
                onPress={saveCoating}
              />
            </FormCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
});
