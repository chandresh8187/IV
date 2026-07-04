import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { FileCheck2 } from 'lucide-react-native';

import { COLORS, PAPER_THEME } from '../../assets/Colors';
import {
  createCertificateApi,
  getProductionsByChallanApi,
} from '../../api/certificateApi';
import { generateCoatingCertificatePdf } from '../../utils/certificatePdfGenerator';

const DEFAULT_REFERENCE_STANDARD = 'IS 4759, IS 6745, IS 2633, IS 2629';

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
  const planning = route?.params?.planning;

  const [inspectionDate, setInspectionDate] = useState(
    dayjs().format('YYYY-MM-DD'),
  );
  const [referenceStandard, setReferenceStandard] = useState(
    DEFAULT_REFERENCE_STANDARD,
  );
  const [structure, setStructure] = useState(
    planning?.material_description || '',
  );
  const [quantity, setQuantity] = useState(
    planning?.planned_qty ? `${planning.planned_qty} NOS` : 'As per challan',
  );
  const [checklist, setChecklist] = useState(CHECKLIST_DEFAULTS);
  const [remarks, setRemarks] = useState(
    'The average coating found within limit, so found satisfactory.',
  );

  const [readings, setReadings] = useState([]);
  const [loadingReadings, setLoadingReadings] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReadings = async () => {
      if (!planning?.challan_no) {
        setLoadingReadings(false);
        return;
      }

      try {
        const res = await getProductionsByChallanApi(planning.challan_no);
        if (isMounted) {
          setReadings(res?.data || []);
        }
      } catch (error) {
        console.log('Failed to load production entries', error);
      } finally {
        if (isMounted) {
          setLoadingReadings(false);
        }
      }
    };

    loadReadings();

    return () => {
      isMounted = false;
    };
  }, [planning?.challan_no]);

  const updateChecklistField = (key, field, value) => {
    setChecklist(prev =>
      prev.map(item => (item.key === key ? { ...item, [field]: value } : item)),
    );
  };

  const handleGenerate = async () => {
    if (!planning?.id) {
      Alert.alert('Error', 'Missing planning reference for this challan');
      return;
    }

    if (!inspectionDate || !referenceStandard) {
      Alert.alert(
        'Error',
        'Inspection date and reference standard are required',
      );
      return;
    }

    setSaving(true);

    try {
      const checklistPayload = checklist.reduce((acc, item) => {
        acc[`${item.key}_result`] = item.result;
        acc[`${item.key}_observation`] = item.observation;
        return acc;
      }, {});

      const res = await createCertificateApi({
        planning_id: planning.id,
        structure,
        quantity,
        inspection_date: inspectionDate,
        reference_standard: referenceStandard,
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
        challan_no: planning.challan_no,
        party_name: planning.party_name,
        third_party_name: planning.third_party_name,
        structure,
        quantity,
        inspection_date: inspectionDate,
        reference_standard: referenceStandard,
        remarks,
        ...checklistPayload,
      };

      await generateCoatingCertificatePdf({ certificate, readings });

      Alert.alert('Success', `Certificate ${tcNo} generated successfully`);
      navigation.goBack();
    } catch (error) {
      // Log the full error so the real cause (network vs server vs a plain
      // JS exception in PDF generation) is visible in Metro/adb logs, since
      // the alert alone can't show a stack trace.
      console.log('Certificate generation failed:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      const serverMessage = error?.response?.data?.message;
      const networkOrClientMessage = error?.message;

      Alert.alert(
        'Error',
        serverMessage ||
          networkOrClientMessage ||
          'Could not generate certificate',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!planning) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No challan selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Generate Certificate</Text>
          <Text style={styles.description}>
            Challan {planning.challan_no} • {planning.party_name}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Certificate Details</Text>

          <AppInput
            label="Date of Inspection (YYYY-MM-DD)"
            value={inspectionDate}
            onChangeText={setInspectionDate}
          />

          <AppInput
            label="Reference Standard"
            value={referenceStandard}
            onChangeText={setReferenceStandard}
          />

          <AppInput
            label="Structure / Section as per BOM"
            value={structure}
            onChangeText={setStructure}
          />

          <AppInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

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

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Remarks</Text>
          <AppInput
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.readingsInfo}>
          {loadingReadings ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.readingsText}>
              {readings.length} production entr
              {readings.length === 1 ? 'y' : 'ies'} found for this challan and
              will be included in the certificate table.
            </Text>
          )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.gray, fontWeight: '700' },

  container: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 3,
    marginBottom: 12,
  },

  title: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  description: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '700',
  },

  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 2,
    marginBottom: 12,
  },

  formTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },

  input: { backgroundColor: COLORS.white, marginBottom: 12 },

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

  readingsInfo: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
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

  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  generateBtnDisabled: { opacity: 0.6 },

  generateText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
