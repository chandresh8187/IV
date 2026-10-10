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
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  CalendarDays,
  Eye,
  FileCheck2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';

import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import {
  createCertificateApi,
  deleteCertificatesApi,
  getCertificatesApi,
  getCertificateReadingsApi,
} from '../../api/certificateApi';
import { getProductionPlanningApi } from '../../api/productionPlanningApi';
import { downloadCertificatePdf, downloadSavedCertificatePdf } from '../../utils/serverCertificatePdf';
import { centeredContent, useResponsive } from '../../utils/responsive';
import {
  formatDateForApi,
  formatDisplayDate,
  parseDateForPicker,
} from '../../utils/format';
import { getCoatingRange } from '../../utils/coatingRange';
import { hasPermission } from '../../utils/permissions';

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
  const currentUser = useSelector(state => state.auth.user);
  const canDeleteCertificates = hasPermission(currentUser, 'certificates.generate');
  // A planning object may still arrive via route params (from the
  // "Generate Certificate" button on ProductionPlanningScreen) - it just
  // pre-selects the challan dropdown now instead of being mandatory.
  const initialPlanning = route?.params?.planning || null;
  const [formVisible, setFormVisible] = useState(Boolean(initialPlanning));

  const { formMaxWidth: contentMaxWidth } = useResponsive();

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
  const [certificateSearch, setCertificateSearch] = useState('');
  const [openingCertificate, setOpeningCertificate] = useState(null);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState([]);
  const [deletingCertificates, setDeletingCertificates] = useState(false);
  const openNewForm = () => {
    setInspectionDate(dayjs().format('YYYY-MM-DD'));
    setClientName('');
    setClientAddress('');
    setThirdPartyName('');
    setInvoiceNo('');
    setStructure(null);
    setSelectedChallanNo(null);
    setMaterialDescription('');
    setMinimumCoating('');
    setMaximumCoating('');
    setChecklist(CHECKLIST_DEFAULTS.map(item => ({ ...item })));
    setRemarks('The average coating found within limit, so found satisfactory.');
    setManualRows([emptyManualRow(1)]);
    setFormVisible(true);
  };
  const certificateQuery = useQuery({ queryKey: ['certificates'], queryFn: getCertificatesApi });
  const certificates = (certificateQuery.data?.data || []).filter(item =>
    [item.tc_no, item.challan_no, item.party_name, item.client_name, item.structure, item.third_party_name]
      .some(value => String(value || '').toLowerCase().includes(certificateSearch.trim().toLowerCase())),
  );

  const openCertificate = async item => {
    setOpeningCertificate(item.id);
    try {
      const pdf = await downloadSavedCertificatePdf(item);
      navigation.navigate('PdfViewer', { ...pdf, title: `Certificate · ${item.tc_no}` });
    } catch (error) {
      Alert.alert('Could not open certificate', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally {
      setOpeningCertificate(null);
    }
  };

  const toggleCertificateSelection = id => {
    setSelectedCertificateIds(previous => previous.includes(id)
      ? previous.filter(selectedId => selectedId !== id)
      : [...previous, id]);
  };
  const confirmDeleteCertificates = ids => {
    Alert.alert('Delete test certificate',
      `Delete ${ids.length} selected TC${ids.length === 1 ? '' : 's'}? Issued TC numbers will not be reused.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setDeletingCertificates(true);
          try {
            await deleteCertificatesApi(ids);
            setSelectedCertificateIds(previous => previous.filter(id => !ids.includes(id)));
            await certificateQuery.refetch();
          } catch (error) {
            Alert.alert('Could not delete certificate', error?.response?.data?.message || 'Please try again.');
          } finally { setDeletingCertificates(false); }
        } },
      ]);
  };

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
        minimum_coating: coatingRange.minimum,
        maximum_coating: coatingRange.maximum,
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
      certificateQuery.refetch();
      setFormVisible(false);
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
          <Text style={styles.title}>{formVisible ? 'Generate Certificate' : 'Test Certificates'}</Text>
          <Text style={styles.description}>
            {formVisible ? 'TC No. is generated automatically when you save' : 'View and manage generated coating test certificates'}
          </Text>
          {formVisible ? <TouchableOpacity style={styles.headerAction} disabled={saving} onPress={() => setFormVisible(false)}><Text style={styles.headerActionText}>Back to certificates</Text></TouchableOpacity> : <TouchableOpacity style={styles.headerAction} onPress={openNewForm}><Plus size={18} color={COLORS.primary} /><Text style={styles.headerActionText}>Generate New</Text></TouchableOpacity>}
        </View>

        {!formVisible && <>
        <View style={styles.formCard}>
          <View style={styles.listHeading}><Text style={styles.formTitle}>Generated certificates</Text><TouchableOpacity style={styles.refreshButton} onPress={() => certificateQuery.refetch()}><RefreshCw size={15} color={COLORS.primary} /><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity></View>
          <AppInput label="Search TC, challan, party or structure" value={certificateSearch} onChangeText={setCertificateSearch} />
          {canDeleteCertificates && selectedCertificateIds.length > 0 && <TouchableOpacity style={styles.deleteSelectedButton} disabled={deletingCertificates} onPress={() => confirmDeleteCertificates(selectedCertificateIds)}><Trash2 size={16} color={COLORS.white} /><Text style={styles.deleteSelectedText}>Delete selected ({selectedCertificateIds.length})</Text></TouchableOpacity>}
          {certificateQuery.isLoading ? <ActivityIndicator color={COLORS.accent} /> : certificateQuery.isError ? <TouchableOpacity onPress={() => certificateQuery.refetch()}><Text style={styles.description}>Could not load certificates. Tap to retry.</Text></TouchableOpacity> : certificates.length ? <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator><View style={styles.certificateTable}>
            <View style={[styles.certificateTableRow, styles.certificateTableHeader]}>
              {canDeleteCertificates && <Text style={[styles.tableHeadingText, styles.selectCell]}>Select</Text>}
              <Text style={[styles.tableHeadingText, styles.tcCell]}>TC No.</Text><Text style={[styles.tableHeadingText, styles.dateCell]}>Inspection Date</Text><Text style={[styles.tableHeadingText, styles.challanCell]}>Challan No.</Text><Text style={[styles.tableHeadingText, styles.clientCell]}>Client / Party</Text><Text style={[styles.tableHeadingText, styles.structureCell]}>Structure</Text><Text style={[styles.tableHeadingText, styles.actionsCell]}>Actions</Text>
            </View>
            {certificates.map(item => <View key={item.id} style={styles.certificateTableRow}>
              {canDeleteCertificates && <TouchableOpacity style={styles.selectCell} accessibilityLabel={`${selectedCertificateIds.includes(item.id) ? 'Deselect' : 'Select'} certificate ${item.tc_no}`} onPress={() => toggleCertificateSelection(item.id)}><Text style={styles.selectMark}>{selectedCertificateIds.includes(item.id) ? '☑' : '□'}</Text></TouchableOpacity>}
              <Text style={[styles.tableValue, styles.tcCell, styles.tcText]} numberOfLines={2}>{item.tc_no}</Text>
              <Text style={[styles.tableValue, styles.dateCell]}>{item.inspection_date ? formatDisplayDate(item.inspection_date) : '—'}</Text>
              <Text style={[styles.tableValue, styles.challanCell]} numberOfLines={2}>{item.challan_no || '—'}</Text>
              <Text style={[styles.tableValue, styles.clientCell]} numberOfLines={2}>{item.client_name || item.party_name || '—'}</Text>
              <Text style={[styles.tableValue, styles.structureCell]} numberOfLines={2}>{item.structure || '—'}</Text>
              <View style={[styles.actionsCell, styles.rowActions]}><TouchableOpacity style={styles.viewButton} onPress={() => openCertificate(item)} disabled={openingCertificate != null || deletingCertificates}><Eye size={15} color={COLORS.primary} /><Text style={styles.viewButtonText}>{openingCertificate === item.id ? 'Opening…' : 'View'}</Text></TouchableOpacity>
                {canDeleteCertificates && <TouchableOpacity style={styles.deleteButton} accessibilityLabel={`Delete certificate ${item.tc_no}`} disabled={deletingCertificates} onPress={() => confirmDeleteCertificates([item.id])}><Trash2 size={15} color={COLORS.danger} /><Text style={styles.deleteButtonText}>Delete</Text></TouchableOpacity>}
              </View>
            </View>)}
          </View></ScrollView> : <Text style={styles.description}>{certificateSearch ? 'No certificates match your search.' : 'Generated certificates will appear here.'}</Text>}
        </View>
        </>}

        {formVisible && <>
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
              <Text style={styles.dateValue}>{formatDisplayDate(inspectionDate)}</Text>
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
                  <Trash2 size={16} color={COLORS.danger} />
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
        </>}
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
        Position {position} - SR {row.sr_no || '-'} -{' '}
        {formatDisplayDate(row.shift_date)} -{' '}
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

  headerCard: { borderWidth: 0, borderColor: COLORS.border,
    backgroundColor: COLORS.primary,
    borderRadius: UI.radius,
    padding: 16,
    elevation: 1,
    marginBottom: 12,
  },

  title: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  description: {
    color: COLORS.white,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  headerAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: UI.radiusSmall, paddingHorizontal: 14, minHeight: 44, marginTop: 14 },
  headerActionText: { color: COLORS.primary, fontWeight: '700' },

  formCard: { borderWidth: 0, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 16,
    elevation: 1,
    marginBottom: 12,
  },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 8, backgroundColor: COLORS.surfaceMuted, paddingHorizontal: 10, minHeight: 34 },
  refreshText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  certificateTable: { marginTop: 4 },
  certificateTableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  certificateTableHeader: { minHeight: 42, backgroundColor: COLORS.surfaceMuted },
  tableHeadingText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
  tableValue: { color: COLORS.text, fontSize: 12 },
  tcText: { fontWeight: '800' },
  selectCell: { width: 58, paddingHorizontal: 8 },
  tcCell: { width: 115, paddingHorizontal: 8 },
  dateCell: { width: 110, paddingHorizontal: 8 },
  challanCell: { width: 115, paddingHorizontal: 8 },
  clientCell: { width: 155, paddingHorizontal: 8 },
  structureCell: { width: 165, paddingHorizontal: 8 },
  actionsCell: { width: 160, paddingHorizontal: 8 },
  selectMark: { color: COLORS.primary, fontSize: 20 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 7, padding: 6, backgroundColor: COLORS.surfaceMuted },
  viewButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 7, padding: 6 },
  deleteButtonText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },
  deleteSelectedButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, padding: 10, marginTop: 10, borderRadius: 8, backgroundColor: COLORS.danger },
  deleteSelectedText: { color: COLORS.white, fontWeight: '700' },
  dropdownFormCard: { zIndex: 3000 },

  formTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  fieldLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },

  dropdown: {
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
    marginBottom: 14,
    minHeight: 48,
  },

  dropdownList: { borderColor: COLORS.inputBorder },

  dropdownText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },

  input: { backgroundColor: COLORS.white, marginBottom: 12 },

  rangeTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: UI.radiusSmall,
    padding: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },

  dateLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  dateValue: { fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
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

  fixedLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  fixedValue: { fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },

  readingsInfo: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: UI.radiusSmall,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  readingsText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },

  reshuffleBtn: {
    height: 44,
    borderRadius: UI.radiusSmall,
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
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  readingPreviewCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    padding: 10,
    marginTop: 9,
  },

  readingPreviewMeta: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: UI.radiusSmall,
    paddingVertical: 6,
    alignItems: 'center',
  },

  averageValueBox: {
    backgroundColor: COLORS.accentSoft,
  },

  readingValueLabel: { fontVariant: ['tabular-nums'],
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },

  readingValueText: { fontVariant: ['tabular-nums'],
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 12,
    height: 44,
  },

  addRowBtnDisabled: { opacity: 0.5 },

  addRowText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

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
    fontWeight: '600',
    textAlign: 'center',
  },

  manualInput: { flex: 1, backgroundColor: COLORS.white, height: 42 },

  removeRowBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.dangerSoft,
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
    fontWeight: '600',
    marginBottom: 8,
  },

  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  generateBtnDisabled: { opacity: 0.6 },

  generateText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

});
