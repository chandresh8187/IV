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
import {
  Boxes,
  ClipboardList,
  FileCheck2,
  Maximize2,
  ChevronRight,
  Users,
} from 'lucide-react-native';

import { getHistoryShiftTableApi } from '../../api/historyApi';
import ProductionTable from '../../components/ProductionTable';
import { downloadProductionReport } from '../../utils/serverProductionReport';
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { formatQuantity, formatWeight } from '../../utils/format';

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
            label="Produced Qty"
            value={`${formatQuantity(summary.total_production_qty)} NOS`}
          />
          <SummaryBox
            label="MS Production"
            value={`${formatWeight(summary.total_ms_production_kg)} KG`}
          />
          <SummaryBox
            label="GI Production"
            value={`${formatWeight(summary.total_gi_production_kg)} KG`}
          />
          <SummaryBox
            label="Zinc Used"
            value={`${formatWeight(summary.zink_used)} KG`}
          />
          <SummaryBox
            label="Zinc %"
            value={`${formatWeight(summary.zinc_consumption)}%`}
          />
        </View>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Explore shift summaries</Text>
        <View style={styles.breakdownButtons}>
          {[
            {
              title: 'Material Summary',
              description: 'Output and zinc usage by material',
              route: 'HistoryMaterialSummary',
              Icon: Boxes,
            },
            {
              title: 'Planning Summary',
              description: 'Challan progress and remaining quantity',
              route: 'HistoryPlanningSummary',
              Icon: ClipboardList,
            },
            {
              title: 'Party Summary',
              description: 'Material quantities produced for each party',
              route: 'HistoryPartySummary',
              Icon: Users,
            },
          ].map(({ title, description, route: screen, Icon }) => (
            <TouchableOpacity
              key={screen}
              accessibilityRole="button"
              accessibilityLabel={`Open ${title}`}
              accessibilityHint="Opens details for this production date and shift"
              activeOpacity={0.65}
              style={styles.breakdownButton}
              onPress={() => navigation.navigate(screen, { date, shift_name })}
            >
              <View style={styles.breakdownIcon}>
                <Icon size={21} color={COLORS.accent} />
              </View>
              <View style={styles.breakdownCopy}>
                <Text style={styles.breakdownText}>{title}</Text>
                <Text style={styles.breakdownDescription}>{description}</Text>
              </View>
              <ChevronRight size={20} color={COLORS.accent} />
            </TouchableOpacity>
          ))}
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
          shiftName={shift_name}
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

      {canGenerateReports && (
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
              <Text style={styles.generateText}>GENERATE REPORT</Text>
            </>
          )}
        </TouchableOpacity>
      )}
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
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 15,
    elevation: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  breakdownCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    marginTop: 14,
    padding: 14,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  breakdownTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  breakdownButtons: { gap: 10, marginTop: 14 },
  breakdownButton: {
    minHeight: 82,
    padding: 14,
    flexDirection: 'row',
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  breakdownText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  breakdownIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCopy: { flex: 1, minWidth: 0 },
  breakdownDescription: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  summaryBox: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: UI.radiusSmall,
    padding: 12,
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },

  summaryValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },

  tableCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 14,
    marginTop: 14,
    elevation: 0,
  },

  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  fullBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  fullBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  moreText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  generateBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: UI.radiusSmall,
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
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});
