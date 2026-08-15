import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { FileCheck2, Maximize2 } from 'lucide-react-native';

import { getHistoryShiftTableApi } from '../../api/historyApi';
import ProductionTable from '../../components/ProductionTable';
import { downloadProductionReport } from '../../utils/serverProductionReport';
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';

export default function HistoryShiftTableScreen({ navigation, route }) {
  const { date, shift_name } = route.params;
  const [saving, setSaving] = useState(false);
  const loggedUser = useSelector(state => state.auth.user);
  const canGenerateReports = hasPermission(loggedUser, 'reports.generate');
  const { wideMaxWidth } = useResponsive();
  const { data, isLoading } = useQuery({
    queryKey: ['history-shift-table', date, shift_name],
    queryFn: () =>
      getHistoryShiftTableApi({
        date,
        shift_name,
      }),
  });

  const handleGenerate = async () => {
    setSaving(true);

    try {
      const pdf = await downloadProductionReport({
        type: 'shift',
        value: shift_name,
        date,
      });
      navigation.navigate('PdfViewer', {
        ...pdf,
        title: 'Production Report',
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          error?.message ||
          'Could not generate pdf',
      );
    } finally {
      setSaving(false);
    }
  };

  const summary = data?.data?.summary || {};
  const tableData = data?.data?.table_data || [];

  if (isLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, centeredContent(wideMaxWidth)]}
    >
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Shift Summary</Text>

        <View style={styles.summaryGrid}>
          <SummaryBox
            label="MS Production"
            value={`${summary.total_ms_production_kg || 0} KG`}
          />
          <SummaryBox
            label="GI Production"
            value={`${summary.total_gi_production_kg || 0} KG`}
          />
          <SummaryBox
            label="Zinc Used"
            value={`${summary.zink_used || 0} KG`}
          />
          <SummaryBox
            label="Zinc %"
            value={`${summary.zinc_consumption || 0}%`}
          />
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.sectionTitle}>Production Table</Text>

          <TouchableOpacity
            style={styles.fullBtn}
            onPress={() =>
              navigation.navigate('HistoryFullTable', {
                date,
                shift_name,
              })
            }
          >
            <Maximize2 size={16} color={COLORS.white} />
            <Text style={styles.fullBtnText}>FULL</Text>
          </TouchableOpacity>
        </View>

        <ProductionTable
          rows={tableData}
          rowLimit={8}
          emptyMessage="No production found"
          showsHorizontalScrollIndicator={false}
        />

        {tableData.length > 8 && (
          <Text style={styles.moreText}>
            Showing 8 of {tableData.length} rows. Tap FULL to view all.
          </Text>
        )}
      </View>

      {canGenerateReports && <TouchableOpacity
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
            <Text style={styles.generateText}>GENERATE REPORT</Text>
          </>
        )}
      </TouchableOpacity>}
    </ScrollView>
  );
}

function SummaryBox({ label, value }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },

  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },

  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  summaryBox: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '800',
  },

  summaryValue: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 5,
  },

  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    elevation: 2,
  },

  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  fullBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  fullBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  moreText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  generateBtnDisabled: { opacity: 0.6 },

  generateText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
