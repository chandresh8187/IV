import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  CalendarDays,
  FileCheck2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';

import { COLORS, PAPER_THEME } from '../../assets/Colors';
import {
  createCertificateApi,
  getCertificateReadingsApi,
} from '../../api/certificateApi';
import { getProductionPlanningApi } from '../../api/productionPlanningApi';
import { downloadCertificatePdf } from '../../utils/serverCertificatePdf';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { formatDateForApi, parseDateForPicker } from '../../utils/format';
import { getCoatingRange } from '../../utils/coatingRange';

const DEFAULT_REFERENCE_STANDARD = 'IS 4759, IS 6745, IS 2633, IS 2629';
const FIXED_QUANTITY = 'As per challan';
const MAX_READING_ROWS = 10;

const STRUCTURE_OPTIONS = [
  { label: 'Solar Mounting Structure', value: 'SOLAR MOUNTING STRUCTURE' },
  {
    label: 'Highway / Railway Structure',
    value: 'HIGHWAY / RAILWAY STRUCTURE',
  },
  { label: 'Grating', value: 'GRATING' },
  { label: 'Cable Tray', value: 'CABLE TRAY' },
  { label: 'Earthing Strip', value: 'EARTHING STRIP' },
  { label: 'MS Structure (General)', value: 'MS STRUCTURE' },
];

const CHECKLIST_DEFAULTS = [
  {
    key: 'visual_check',
    label: 'Visual Check (IS 2629)',
    result: 'Free From Flux, Ash Dross Black soot',
    observation: 'OK',
  },
  {
    key: 'adhesion_test',
    label: 'Adhesion Test (IS 2629)',
    result: 'NO Flacking of Zinc Coating',
    observation: 'OK',
  },
  {
    key: 'knife_test',
    label: 'Knife Test (IS 2629)',
    result: 'NO Peeling of Zinc Coating',
    observation: 'OK',
  },
  {
    key: 'mass_test',
    label: 'Mass of Zinc Coating Test (IS 4759 / IS 6745)',
    result: '',
    observation: 'As per below mention',
  },
  {
    key: 'preece_test',
    label: 'Preece Test (IS 2633)',
    result: 'NO Copper effect',
    observation: 'NA',
  },
];

const emptyManualRow = id => ({
  id,
  c1: '',
  c2: '',
  c3: '',
  c4: '',
  c5: '',
});

function AppInput({ style, ...props }) {
  return (
    <TextInput
      {...props}
      mode="outlined"
      style={[styles.input, style]}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      textColor={COLORS.text}
      theme={PAPER_THEME}
    />
  );
}

export default function GenerateCertificateScreen({ route, navigation }) {
  // A planning object may still arrive via route params (from the
  // "Generate Certificate" button on ProductionPlanningScreen) - it just
  // pre-selects the challan dropdown now instead of being mandatory.
  const initialPlanning = route?.params?.planning || null;

  const { contentMaxWidth } = useResponsive();

  /* ------------------------------ form state ----------------------------- */
  const certificateType = 'auto';

  const [inspectionDate, setInspectionDate] = useState(
    dayjs().format('YYYY-MM-DD'),
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const handleInspectionDateChange = (event, selectedDate) => {
    setDatePickerVisible(false);

    if (event?.type === 'set' && selectedDate) {
      setInspectionDate(formatDateForApi(selectedDate));
    }
  };

  const [clientName, setClientName] = useState(
    initialPlanning?.party_name || '',
  );
  const [clientAddress, setClientAddress] = useState('');
  const [thirdPartyName, setThirdPartyName] = useState(
    initialPlanning?.third_party_name || '',
  );
  const [invoiceNo, setInvoiceNo] = useState('');

  const [structureOpen, setStructureOpen] = useState(false);
  const [structure, setStructure] = useState(null);

  const [challanOpen, setChallanOpen] = useState(false);
  const [selectedChallanNo, setSelectedChallanNo] = useState(
    initialPlanning?.challan_no || null,
  );

  const [materialDescription, setMaterialDescription] = useState(
    initialPlanning?.material_description || '',
  );
  const [minimumCoating, setMinimumCoating] = useState('');
  const [maximumCoating, setMaximumCoating] = useState('');

  const [checklist, setChecklist] = useState(CHECKLIST_DEFAULTS);
  const [remarks, setRemarks] = useState(
    'The average coating found within limit, so found satisfactory.',
  );

  const [manualRows, setManualRows] = useState([emptyManualRow(1)]);
  const [saving, setSaving] = useState(false);

  /* -------------------------- challan / planning ------------------------- */
  const { data: planningData, isLoading: loadingPlanning } = useQuery({
    queryKey: ['production-planning'],
    queryFn: getProductionPlanningApi,
  });

  // Merge the route-param planning into the dropdown list in case that
  // challan is no longer in the "available" list (e.g. already completed).
  const planningList = useMemo(() => {
    const list = planningData?.data || [];
    if (
      initialPlanning &&
      !list.some(p => p.challan_no === initialPlanning.challan_no)
    ) {
      return [initialPlanning, ...list];
    }
    return list;
  }, [planningData, initialPlanning]);

  const challanItems = useMemo(
    () =>
      planningList.map(p => ({
        label: `${p.challan_no}  •  ${p.party_name || '-'}  [${(
          p.status || 'pending'
        ).toUpperCase()}]`,
        value: p.challan_no,
      })),
    [planningList],
  );

  const selectedPlanning = useMemo(
    () => planningList.find(p => p.challan_no === selectedChallanNo) || null,
    [planningList, selectedChallanNo],
  );
  const coatingRange = useMemo(
    () => getCoatingRange(minimumCoating, maximumCoating),
    [maximumCoating, minimumCoating],
  );

  // Auto-fill (but keep editable) when a challan is picked.
  const onChallanSelected = challanNo => {
    const found = planningList.find(p => p.challan_no === challanNo);
    if (!found) return;

    setMaterialDescription(found.material_description || '');
    // Only pre-fill client / third party if the user hasn't typed anything
    // yet, so a picked challan never overwrites manual entries.
    setClientName(prev => prev || found.party_name || '');
    setThirdPartyName(prev => prev || found.third_party_name || '');
  };

  /* -------------------- auto readings (production entries) --------------- */
  const {
    data: readingsData,
    isLoading: loadingReadings,
    isRefetching: reshufflingReadings,
    isError: readingsError,
    refetch: reshuffleReadings,
  } = useQuery({
    queryKey: [
      'certificate-readings',
      selectedPlanning?.id,
      coatingRange.minimum,
      coatingRange.maximum,
    ],
    queryFn: () =>
      getCertificateReadingsApi({
        planningId: selectedPlanning.id,
        minimum:
          coatingRange.minimum == null ? '' : String(coatingRange.minimum),
        maximum:
          coatingRange.maximum == null ? '' : String(coatingRange.maximum),
      }),
    enabled:
      certificateType === 'auto' &&
      !!selectedPlanning?.id &&
      !coatingRange.error,
    staleTime: Infinity,
  });

  const autoReadings = Array.isArray(readingsData?.data?.readings)
    ? readingsData.data.readings
    : [];
  const matchingReadingsCount =
    Number(readingsData?.data?.matching_count) || 0;

  /* ------------------------------ checklist ------------------------------ */
  const updateChecklistField = (key, field, value) => {
    setChecklist(prev =>
      prev.map(item => (item.key === key ? { ...item, [field]: value } : item)),
    );
  };

  /* ----------------------------- manual rows ----------------------------- */
  const addManualRow = () => {
    setManualRows(prev =>
      prev.length >= MAX_READING_ROWS
        ? prev
        : [...prev, emptyManualRow(Date.now())],
    );
  };

  const removeManualRow = id => {
    setManualRows(prev =>
      prev.length === 1 ? prev : prev.filter(row => row.id !== id),
    );
  };

  const updateManualRow = (id, key, value) => {
    setManualRows(prev =>
      prev.map(row => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  /* ------------------------------- generate ------------------------------ */
  const handleGenerate = async () => {
    if (!selectedPlanning?.id) {
      Alert.alert('Error', 'Please select a challan number');
      return;
    }
    if (!structure) {
      Alert.alert('Error', 'Please select a structure');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter the client name');
      return;
    }
    if (!invoiceNo.trim()) {
      Alert.alert('Error', 'Please enter the invoice number');
      return;
    }
    if (!inspectionDate) {
      Alert.alert('Error', 'Please select the date of inspection');
      return;
    }
    if (coatingRange.error) {
      Alert.alert('Invalid Coating Range', coatingRange.error);
      return;
    }

    // Build the readings the certificate table will show.
    let readings;
    if (certificateType === 'auto') {
      readings = autoReadings;
      if (!readings.length) {
        Alert.alert(
          'Error',
          `No complete C1-C5 production readings found with ${coatingRange.description}.`,
        );
        return;
      }
    } else {
      readings = manualRows
        .filter(row =>
          [row.c1, row.c2, row.c3, row.c4, row.c5].some(v => v !== ''),
        )
        .map(row => ({
          c1: row.c1,
          c2: row.c2,
          c3: row.c3,
          c4: row.c4,
          c5: row.c5,
        }));
      if (!readings.length) {
        Alert.alert('Error', 'Please enter at least one row of readings');
        return;
      }
    }

    setSaving(true);

    try {
      const checklistPayload = checklist.reduce((acc, item) => {
        acc[`${item.key}_result`] = item.result;
        acc[`${item.key}_observation`] = item.observation;
        return acc;
      }, {});

      const res = await createCertificateApi({
        planning_id: selectedPlanning.id,
        certificate_type: certificateType,
        client_name: clientName.trim(),
        client_address: clientAddress.trim(),
        third_party_name: thirdPartyName.trim(),
        invoice_no: invoiceNo.trim(),
        structure,
        material_description: materialDescription,
        quantity: FIXED_QUANTITY,
        inspection_date: inspectionDate,
        reference_standard: DEFAULT_REFERENCE_STANDARD,
        coating_readings: readings,
        remarks,
        ...checklistPayload,
      });

      const tcNo = res?.data?.tc_no;

      if (!tcNo) {
        throw new Error(
          res?.message ||
            'Server did not return a certificate number - check the API response shape',
        );
      }

      const certificate = {
        tc_no: tcNo,
        challan_no: selectedPlanning.challan_no,
        client_name: clientName.trim(),
        client_address: clientAddress.trim(),
        third_party_name: thirdPartyName.trim(),
        invoice_no: invoiceNo.trim(),
        structure,
        material_description: materialDescription,
        quantity: FIXED_QUANTITY,
        inspection_date: inspectionDate,
        reference_standard: DEFAULT_REFERENCE_STANDARD,
        remarks,
        ...checklistPayload,
      };
      const pdf = await downloadCertificatePdf({ certificate, readings });
      navigation.navigate('PdfViewer', {
        ...pdf,
        title: 'Certificate Preview',
      });
    } catch (error) {
      // Log the full error so the real cause (network vs server vs a plain
      // JS exception in PDF generation) is visible in Metro/adb logs.

      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          error?.message ||
          'Could not generate certificate',
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- render -------------------------------- */
  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          centeredContent(contentMaxWidth),
        ]}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Generate Certificate</Text>
          <Text style={styles.description}>
            TC No. is generated automatically when you save
          </Text>
        </View>

        {/* --------------------- challan + structure ---------------------- */}
        <View style={[styles.formCard, styles.dropdownFormCard]}>
          <Text style={styles.formTitle}>Challan & Structure</Text>

          <Text style={styles.fieldLabel}>Challan No.</Text>
          <DropDownPicker
            open={challanOpen}
            setOpen={setChallanOpen}
            value={selectedChallanNo}
            setValue={setSelectedChallanNo}
            items={challanItems}
            onSelectItem={item => onChallanSelected(item.value)}
            loading={loadingPlanning}
            placeholder="Select challan from planning"
            listMode="MODAL"
            modalTitle="Select Challan"
            searchable
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
            textStyle={styles.dropdownText}
          />

          <Text style={styles.fieldLabel}>Structure</Text>
          <DropDownPicker
            open={structureOpen}
            setOpen={setStructureOpen}
            value={structure}
            setValue={setStructure}
            items={STRUCTURE_OPTIONS}
            placeholder="Select structure"
            listMode="MODAL"
            modalTitle="Select Structure"
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownList}
            textStyle={styles.dropdownText}
          />

          <AppInput
            label="Material Description (auto-filled from challan, editable)"
            value={materialDescription}
            onChangeText={setMaterialDescription}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.rangeTitle}>Production Reading Range</Text>
          <View style={styles.rangeRow}>
            <AppInput
              style={styles.rangeInput}
              label="Minimum Avg. Coating"
              value={minimumCoating}
              onChangeText={setMinimumCoating}
              keyboardType="decimal-pad"
            />
            <AppInput
              style={styles.rangeInput}
              label="Maximum Avg. Coating"
              value={maximumCoating}
              onChangeText={setMaximumCoating}
              keyboardType="decimal-pad"
            />
          </View>
          <Text
            style={[
              styles.rangeHelp,
              coatingRange.error && styles.rangeError,
            ]}
          >
            {coatingRange.error ||
              `Leave both empty to randomly select entries with ${coatingRange.description}.`}
          </Text>
        </View>

        {/* ------------------------ certificate info ---------------------- */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Certificate Details</Text>

          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setDatePickerVisible(true)}
          >
            <CalendarDays size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.dateLabel}>Date of Inspection</Text>
              <Text style={styles.dateValue}>{inspectionDate}</Text>
            </View>
          </TouchableOpacity>
          {datePickerVisible && (
            <DateTimePicker
              value={parseDateForPicker(inspectionDate)}
              mode="date"
              display="default"
              onChange={handleInspectionDateChange}
            />
          )}

          <AppInput
            label="Client Name"
            value={clientName}
            onChangeText={setClientName}
          />
          <AppInput
            label="Client Address (shown under client name on certificate)"
            value={clientAddress}
            onChangeText={setClientAddress}
            multiline
            numberOfLines={2}
          />
          <AppInput
            label="Third Party Name"
            value={thirdPartyName}
            onChangeText={setThirdPartyName}
          />
          <AppInput
            label="Invoice No."
            value={invoiceNo}
            onChangeText={setInvoiceNo}
          />

          {/* Fixed values, shown for clarity but not editable */}
          <View style={styles.fixedRow}>
            <Text style={styles.fixedLabel}>Supplier</Text>
            <Text style={styles.fixedValue}>
              IV SQUARE STRUCTURE INDIA PVT LTD
            </Text>
          </View>
          <View style={styles.fixedRow}>
            <Text style={styles.fixedLabel}>Quantity</Text>
            <Text style={styles.fixedValue}>{FIXED_QUANTITY}</Text>
          </View>
          <View style={styles.fixedRow}>
            <Text style={styles.fixedLabel}>Reference Standard</Text>
            <Text style={styles.fixedValue}>{DEFAULT_REFERENCE_STANDARD}</Text>
          </View>
        </View>

        {/* --------------------------- readings --------------------------- */}
        {certificateType === 'auto' ? (
          <View style={styles.readingsInfo}>
            {!selectedChallanNo ? (
              <Text style={styles.readingsText}>
                Select a challan to load its production coating readings.
              </Text>
            ) : coatingRange.error ? (
              <Text style={[styles.readingsText, styles.rangeError]}>
                {coatingRange.error}
              </Text>
            ) : loadingReadings ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : readingsError ? (
              <Text style={styles.readingsText}>
                Could not load production entries for this challan.
              </Text>
            ) : (
              <>
                <Text style={styles.readingsText}>
                  {autoReadings.length} random production entr
                  {autoReadings.length === 1 ? 'y' : 'ies'} selected from{' '}
                  {matchingReadingsCount} matching entr
                  {matchingReadingsCount === 1 ? 'y' : 'ies'} with{' '}
                  {coatingRange.description}. A maximum of 10 will appear in
                  the PDF.
                </Text>

                {matchingReadingsCount > 1 && (
                  <TouchableOpacity
                    style={styles.reshuffleBtn}
                    disabled={reshufflingReadings}
                    onPress={() => reshuffleReadings()}
                  >
                    {reshufflingReadings ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <RefreshCw size={15} color={COLORS.white} />
                    )}
                    <Text style={styles.reshuffleText}>
                      {reshufflingReadings ? 'SELECTING...' : 'RESHUFFLE'}
                    </Text>
                  </TouchableOpacity>
                )}

                {autoReadings.map((row, index) => (
                  <ReadingPreviewRow
                    key={row.id || `${row.sr_no}-${index}`}
                    row={row}
                    position={index + 1}
                  />
                ))}
              </>
            )}
          </View>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.manualHeader}>
              <Text style={styles.formTitle}>Coating Readings (Micron)</Text>
              <TouchableOpacity
                style={[
                  styles.addRowBtn,
                  manualRows.length >= MAX_READING_ROWS &&
                    styles.addRowBtnDisabled,
                ]}
                disabled={manualRows.length >= MAX_READING_ROWS}
                onPress={addManualRow}
              >
                <Plus size={16} color={COLORS.white} />
                <Text style={styles.addRowText}>ADD ROW</Text>
              </TouchableOpacity>
            </View>

            {manualRows.map((row, index) => (
              <View key={row.id} style={styles.manualRow}>
                <Text style={styles.manualSr}>{index + 1}</Text>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map((key, i) => (
                  <TextInput
                    key={key}
                    label={`${i + 1}`}
                    value={row[key]}
                    onChangeText={v => updateManualRow(row.id, key, v)}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.manualInput}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                    dense
                  />
                ))}
                <TouchableOpacity
                  style={styles.removeRowBtn}
                  onPress={() => removeManualRow(row.id)}
                >
                  <Trash2 size={16} color="#B91C1C" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* --------------------------- checklist -------------------------- */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>QC Checklist</Text>

          {checklist.map(item => (
            <View key={item.key} style={styles.checklistBlock}>
              <Text style={styles.checklistLabel}>{item.label}</Text>

              <AppInput
                label="Test Result"
                value={item.result}
                onChangeText={value =>
                  updateChecklistField(item.key, 'result', value)
                }
              />

              <AppInput
                label="Observation"
                value={item.observation}
                onChangeText={value =>
                  updateChecklistField(item.key, 'observation', value)
                }
              />
            </View>
          ))}
        </View>

        {/* ---------------------------- remarks --------------------------- */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Remarks</Text>
          <AppInput
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, saving && styles.generateBtnDisabled]}
          activeOpacity={0.85}
          disabled={saving}
          onPress={handleGenerate}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <FileCheck2 size={20} color={COLORS.white} />
              <Text style={styles.generateText}>GENERATE CERTIFICATE</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

    </>
  );
}

function ReadingPreviewRow({ row, position }) {
  const displayNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? String(Number(number.toFixed(2))) : '-';
  };

  return (
    <View style={styles.readingPreviewCard}>
      <Text style={styles.readingPreviewMeta}>
        Position {position} - SR {row.sr_no || '-'} - {row.shift_date || '-'} -{' '}
        {String(row.shift_name || '-').toUpperCase()}
      </Text>
      <View style={styles.readingValuesRow}>
        {[row.c1, row.c2, row.c3, row.c4, row.c5].map((value, index) => (
          <View key={index} style={styles.readingValueBox}>
            <Text style={styles.readingValueLabel}>C{index + 1}</Text>
            <Text style={styles.readingValueText}>{displayNumber(value)}</Text>
          </View>
        ))}
        <View style={[styles.readingValueBox, styles.averageValueBox]}>
          <Text style={styles.readingValueLabel}>AVG</Text>
          <Text style={styles.readingValueText}>
            {displayNumber(row.avg_coating)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 12,
  },

  title: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  description: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 12,
  },
  dropdownFormCard: { zIndex: 3000 },

  formTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  fieldLabel: {
    color: COLORS.gray,
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 6,
  },

  dropdown: {
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    marginBottom: 14,
    minHeight: 48,
  },

  dropdownList: { borderColor: COLORS.inputBorder },

  dropdownText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },

  input: { backgroundColor: COLORS.white, marginBottom: 12 },

  rangeTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 9,
  },

  rangeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  rangeInput: {
    flex: 1,
  },

  rangeHelp: {
    color: COLORS.gray,
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: -3,
  },

  rangeError: {
    color: COLORS.danger,
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },

  dateLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '800' },
  dateValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  fixedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },

  fixedLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '800' },
  fixedValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },

  readingsInfo: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8ECFA',
    alignItems: 'center',
  },

  readingsText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },

  reshuffleBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 12,
    alignSelf: 'center',
  },

  reshuffleText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  readingPreviewCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginTop: 9,
  },

  readingPreviewMeta: {
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 7,
  },

  readingValuesRow: {
    flexDirection: 'row',
    gap: 5,
  },

  readingValueBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 7,
    paddingVertical: 6,
    alignItems: 'center',
  },

  averageValueBox: {
    backgroundColor: COLORS.accentSoft,
  },

  readingValueLabel: {
    color: COLORS.gray,
    fontSize: 8,
    fontWeight: '800',
  },

  readingValueText: {
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
  },

  manualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 34,
  },

  addRowBtnDisabled: { opacity: 0.5 },

  addRowText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  manualSr: {
    width: 18,
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  manualInput: { flex: 1, backgroundColor: COLORS.white, height: 42 },

  removeRowBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checklistBlock: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  checklistLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },

  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  generateBtnDisabled: { opacity: 0.6 },

  generateText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

});
