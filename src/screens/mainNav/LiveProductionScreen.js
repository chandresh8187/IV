import React, { useState } from 'react';
import {
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

const emptyRow = {
  srNo: '',
  challanNo: '',
  partyName: '',
  material: '',
  time: '',
  temperature: '',
  dippingQty: '',
  msWeight: '',
  giWeight: '',
  zincPercentage: '',
  c1: '',
  c2: '',
  c3: '',
  c4: '',
  c5: '',
  avgCoating: '',
};

const emptyBasic = {
  srNo: '',
  challanNo: '',
  partyName: '',
  material: '',
};

const emptyDip = {
  srNo: '',
  time: '',
  temperature: '',
  dippingQty: '',
};

const emptyWeight = {
  srNo: '',
  msWeight: '',
  giWeight: '',
};

const emptyCoating = {
  srNo: '',
  c1: '',
  c2: '',
  c3: '',
  c4: '',
  c5: '',
};

export default function LiveProductionScreen() {
  const [modalType, setModalType] = useState(null);

  const [dips, setDips] = useState([
    {
      srNo: '1',
      challanNo: '126',
      partyName: 'Sundersadi',
      material: 'Purlin',
      time: '08:54',
      temperature: '470',
      dippingQty: '15',
      msWeight: '5800',
      giWeight: '6150',
      zincPercentage: '6.03',
      c1: '45',
      c2: '76',
      c3: '63',
      c4: '77',
      c5: '76',
      avgCoating: '67',
    },
  ]);

  const [basicForm, setBasicForm] = useState(emptyBasic);
  const [dipForm, setDipForm] = useState(emptyDip);
  const [weightForm, setWeightForm] = useState(emptyWeight);
  const [coatingForm, setCoatingForm] = useState(emptyCoating);

  const openModal = type => {
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
  };

  const updateBasic = (key, value) => {
    setBasicForm(prev => ({ ...prev, [key]: value }));
  };

  const updateDip = (key, value) => {
    setDipForm(prev => ({ ...prev, [key]: value }));
  };

  const updateWeight = (key, value) => {
    setWeightForm(prev => ({ ...prev, [key]: value }));
  };

  const updateCoating = (key, value) => {
    setCoatingForm(prev => ({ ...prev, [key]: value }));
  };

  const usePreviousBasic = () => {
    const last = dips[dips.length - 1];

    if (!last) {
      Alert.alert('No Previous Row', 'No previous basic details found.');
      return;
    }

    setBasicForm(prev => ({
      ...prev,
      challanNo: last.challanNo,
      partyName: last.partyName,
      material: last.material,
    }));
  };

  const fillFormFromSrNo = (srNo, type) => {
    const row = dips.find(x => x.srNo === srNo);

    if (!row) return;

    if (type === 'DIP') {
      setDipForm({
        srNo: row.srNo,
        time: row.time,
        temperature: row.temperature,
        dippingQty: row.dippingQty,
      });
    }

    if (type === 'WEIGHT') {
      setWeightForm({
        srNo: row.srNo,
        msWeight: row.msWeight,
        giWeight: row.giWeight,
      });
    }

    if (type === 'COATING') {
      setCoatingForm({
        srNo: row.srNo,
        c1: row.c1,
        c2: row.c2,
        c3: row.c3,
        c4: row.c4,
        c5: row.c5,
      });
    }
  };

  const saveBasicDetails = () => {
    if (
      !basicForm.srNo ||
      !basicForm.challanNo ||
      !basicForm.partyName ||
      !basicForm.material
    ) {
      Alert.alert(
        'Required',
        'Please enter Sr No, Challan, Party and Material.',
      );
      return;
    }

    const exists = dips.find(x => x.srNo === basicForm.srNo);

    if (exists) {
      setDips(prev =>
        prev.map(row =>
          row.srNo === basicForm.srNo ? { ...row, ...basicForm } : row,
        ),
      );
    } else {
      setDips(prev =>
        [...prev, { ...emptyRow, ...basicForm }].sort(
          (a, b) => Number(a.srNo) - Number(b.srNo),
        ),
      );
    }

    setBasicForm(emptyBasic);
    closeModal();
  };

  const saveDipDetails = () => {
    if (!dipForm.srNo) {
      Alert.alert('Required', 'Please enter Sr No.');
      return;
    }

    const exists = dips.find(x => x.srNo === dipForm.srNo);

    if (!exists) {
      Alert.alert('Not Found', 'This Sr No is not created in Basic Entry.');
      return;
    }

    setDips(prev =>
      prev.map(row =>
        row.srNo === dipForm.srNo ? { ...row, ...dipForm } : row,
      ),
    );

    setDipForm(emptyDip);
    closeModal();
  };

  const saveWeightDetails = () => {
    if (!weightForm.srNo) {
      Alert.alert('Required', 'Please enter Sr No.');
      return;
    }

    const exists = dips.find(x => x.srNo === weightForm.srNo);

    if (!exists) {
      Alert.alert('Not Found', 'This Sr No is not created in Basic Entry.');
      return;
    }

    const ms = Number(weightForm.msWeight);
    const gi = Number(weightForm.giWeight);

    const zincPercentage =
      ms > 0 && gi > 0 ? (((gi - ms) / ms) * 100).toFixed(2) : '';

    setDips(prev =>
      prev.map(row =>
        row.srNo === weightForm.srNo
          ? {
              ...row,
              msWeight: weightForm.msWeight,
              giWeight: weightForm.giWeight,
              zincPercentage,
            }
          : row,
      ),
    );

    setWeightForm(emptyWeight);
    closeModal();
  };

  const saveCoatingDetails = () => {
    if (!coatingForm.srNo) {
      Alert.alert('Required', 'Please enter Sr No.');
      return;
    }

    const exists = dips.find(x => x.srNo === coatingForm.srNo);

    if (!exists) {
      Alert.alert('Not Found', 'This Sr No is not created in Basic Entry.');
      return;
    }

    const values = [
      coatingForm.c1,
      coatingForm.c2,
      coatingForm.c3,
      coatingForm.c4,
      coatingForm.c5,
    ]
      .map(Number)
      .filter(v => v > 0);

    const avgCoating =
      values.length > 0
        ? Math.round(
            values.reduce((a, b) => a + b, 0) / values.length,
          ).toString()
        : '';

    setDips(prev =>
      prev.map(row =>
        row.srNo === coatingForm.srNo
          ? {
              ...row,
              ...coatingForm,
              avgCoating,
            }
          : row,
      ),
    );

    setCoatingForm(emptyCoating);
    closeModal();
  };

  const renderSame = (current, previous) => {
    if (previous && current && current === previous) return '"';
    return current || '-';
  };

  const Input = ({ label, value, onChangeText, keyboardType = 'default' }) => (
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

  const HeaderCell = ({ children, width }) => (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );

  const Cell = ({ children, width, bold }) => (
    <View style={[styles.cell, { width }]}>
      <Text
        style={[styles.cellText, bold && styles.boldCellText]}
        numberOfLines={2}
      >
        {children}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Live Production</Text>
          <Text style={styles.description}>Sr No wise production register</Text>
        </View>

        <View style={styles.entrySection}>
          <Text style={styles.sectionTitle}>Production Entry Forms</Text>

          <View style={styles.formButtonGrid}>
            <TouchableOpacity
              style={styles.entryButton}
              onPress={() => openModal('BASIC')}
              activeOpacity={0.8}
            >
              <View style={styles.entryIconCircle}>
                <Text style={styles.entryIcon}>1</Text>
              </View>

              <View style={styles.entryTextWrap}>
                <Text style={styles.entryTitle}>Basic Entry</Text>
                <Text style={styles.entryDescription}>
                  Challan, party & material
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.entryButton}
              onPress={() => openModal('DIP')}
              activeOpacity={0.8}
            >
              <View style={styles.entryIconCircle}>
                <Text style={styles.entryIcon}>2</Text>
              </View>

              <View style={styles.entryTextWrap}>
                <Text style={styles.entryTitle}>Dip Details</Text>
                <Text style={styles.entryDescription}>
                  Time, temp & quantity
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.entryButton}
              onPress={() => openModal('WEIGHT')}
              activeOpacity={0.8}
            >
              <View style={styles.entryIconCircle}>
                <Text style={styles.entryIcon}>3</Text>
              </View>

              <View style={styles.entryTextWrap}>
                <Text style={styles.entryTitle}>Weight Details</Text>
                <Text style={styles.entryDescription}>MS, GI & zinc %</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.entryButton}
              onPress={() => openModal('COATING')}
              activeOpacity={0.8}
            >
              <View style={styles.entryIconCircle}>
                <Text style={styles.entryIcon}>4</Text>
              </View>

              <View style={styles.entryTextWrap}>
                <Text style={styles.entryTitle}>Coating Details</Text>
                <Text style={styles.entryDescription}>C1 to C5 readings</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableContainer}>
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
                {dips.map((item, index) => {
                  const previous = dips[index - 1];

                  return (
                    <View
                      key={item.srNo}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.altRow,
                      ]}
                    >
                      <Cell width={55} bold>
                        {item.srNo}
                      </Cell>
                      <Cell width={90}>
                        {renderSame(item.challanNo, previous?.challanNo)}
                      </Cell>
                      <Cell width={150}>
                        {renderSame(item.partyName, previous?.partyName)}
                      </Cell>
                      <Cell width={150}>
                        {renderSame(item.material, previous?.material)}
                      </Cell>
                      <Cell width={90}>{item.time || '-'}</Cell>
                      <Cell width={80}>{item.dippingQty || '-'}</Cell>
                      <Cell width={90}>
                        {item.temperature ? `${item.temperature}°` : '-'}
                      </Cell>
                      <Cell width={90}>{item.msWeight || '-'}</Cell>
                      <Cell width={90}>{item.giWeight || '-'}</Cell>
                      <Cell width={90}>{item.zincPercentage || '-'}</Cell>
                      <Cell width={80}>{item.c1 || '-'}</Cell>
                      <Cell width={80}>{item.c2 || '-'}</Cell>
                      <Cell width={80}>{item.c3 || '-'}</Cell>
                      <Cell width={80}>{item.c4 || '-'}</Cell>
                      <Cell width={80}>{item.c5 || '-'}</Cell>
                      <Cell width={90} bold>
                        {item.avgCoating || '-'}
                      </Cell>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        <Modal visible={!!modalType} animationType="slide">
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalType === 'BASIC'
                    ? 'Basic Entry'
                    : modalType === 'DIP'
                    ? 'Dip Details'
                    : modalType === 'WEIGHT'
                    ? 'Weight Details'
                    : 'Coating Details'}
                </Text>
                <Text style={styles.modalDesc}>Update data by Sr No</Text>
              </View>

              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {modalType === 'BASIC' && (
                <FormSection title="Sr No + Basic Details">
                  <Input
                    label="Sr No"
                    value={basicForm.srNo}
                    onChangeText={v => updateBasic('srNo', v)}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={styles.previousBtn}
                    onPress={usePreviousBasic}
                  >
                    <Text style={styles.previousText}>
                      Use Previous Basic Details
                    </Text>
                  </TouchableOpacity>

                  <Input
                    label="Challan No"
                    value={basicForm.challanNo}
                    onChangeText={v => updateBasic('challanNo', v)}
                  />

                  <Input
                    label="Party Name"
                    value={basicForm.partyName}
                    onChangeText={v => updateBasic('partyName', v)}
                  />

                  <Input
                    label="Material"
                    value={basicForm.material}
                    onChangeText={v => updateBasic('material', v)}
                  />

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveBasicDetails}
                  >
                    <Text style={styles.saveText}>SAVE BASIC DETAILS</Text>
                  </TouchableOpacity>
                </FormSection>
              )}

              {modalType === 'DIP' && (
                <FormSection title="Select Sr No + Dip Details">
                  <Input
                    label="Sr No"
                    value={dipForm.srNo}
                    onChangeText={v => {
                      updateDip('srNo', v);
                      fillFormFromSrNo(v, 'DIP');
                    }}
                    keyboardType="numeric"
                  />

                  <Input
                    label="Production Time"
                    value={dipForm.time}
                    onChangeText={v => updateDip('time', v)}
                  />

                  <Input
                    label="Dipping Qty"
                    value={dipForm.dippingQty}
                    onChangeText={v => updateDip('dippingQty', v)}
                    keyboardType="numeric"
                  />

                  <Input
                    label="Kettle Temperature °C"
                    value={dipForm.temperature}
                    onChangeText={v => updateDip('temperature', v)}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveDipDetails}
                  >
                    <Text style={styles.saveText}>SAVE DIP DETAILS</Text>
                  </TouchableOpacity>
                </FormSection>
              )}

              {modalType === 'WEIGHT' && (
                <FormSection title="Select Sr No + Weight Details">
                  <Input
                    label="Sr No"
                    value={weightForm.srNo}
                    onChangeText={v => {
                      updateWeight('srNo', v);
                      fillFormFromSrNo(v, 'WEIGHT');
                    }}
                    keyboardType="numeric"
                  />

                  <Input
                    label="MS Weight"
                    value={weightForm.msWeight}
                    onChangeText={v => updateWeight('msWeight', v)}
                    keyboardType="numeric"
                  />

                  <Input
                    label="GI Weight"
                    value={weightForm.giWeight}
                    onChangeText={v => updateWeight('giWeight', v)}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveWeightDetails}
                  >
                    <Text style={styles.saveText}>SAVE WEIGHT DETAILS</Text>
                  </TouchableOpacity>
                </FormSection>
              )}

              {modalType === 'COATING' && (
                <FormSection title="Select Sr No + Coating Details">
                  <Input
                    label="Sr No"
                    value={coatingForm.srNo}
                    onChangeText={v => {
                      updateCoating('srNo', v);
                      fillFormFromSrNo(v, 'COATING');
                    }}
                    keyboardType="numeric"
                  />

                  <View style={styles.coatingRow}>
                    {['c1', 'c2', 'c3', 'c4', 'c5'].map((key, index) => (
                      <TextInput
                        key={key}
                        label={`C${index + 1}`}
                        value={coatingForm[key]}
                        onChangeText={v => updateCoating(key, v)}
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

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveCoatingDetails}
                  >
                    <Text style={styles.saveText}>SAVE COATING DETAILS</Text>
                  </TouchableOpacity>
                </FormSection>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function FormSection({ title, children }) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{title}</Text>
      {children}
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },

  description: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },

  entrySection: {
    marginTop: 14,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 12,
  },

  formButtonGrid: {
    gap: 12,
  },

  entryButton: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  entryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  entryIcon: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },

  entryTextWrap: {
    marginLeft: 14,
    flex: 1,
  },

  entryTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },

  entryDescription: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 3,
  },

  tableContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 4,
    marginBottom: 16,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },

  headerCell: {
    height: 52,
    borderRightWidth: 1,
    borderRightColor: '#3A4375',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  headerCellText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
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
    minHeight: 56,
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

  boldCellText: {
    fontWeight: '900',
    color: COLORS.primary,
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

  closeText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
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

  previousBtn: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
    alignItems: 'center',
  },

  previousText: {
    color: COLORS.primary,
    fontWeight: '900',
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
});
