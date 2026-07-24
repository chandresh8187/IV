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
import { FileCheck2, Maximize2 } from 'lucide-react-native';

import { getHistoryShiftTableApi } from '../../api/historyApi';
import { generateProductionPdf } from '../../utils/productionPdfGenerator';
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';

export default function HistoryShiftTableScreen({ navigation, route }) {
  const { date, shift_name } = route.params;
  const [saving, setSaving] = useState(false);
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
      await generateProductionPdf({
        date,
        shiftName: shift_name,
        summary,
        tableData,
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
                tableData,
              })
            }
          >
            <Maximize2 size={16} color={COLORS.white} />
            <Text style={styles.fullBtnText}>FULL</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHead}>
              <Cell width={55} header>
                Sr
              </Cell>
              <Cell width={100} header>
                Time
              </Cell>
              <Cell width={120} header>
                Challan
              </Cell>
              <Cell width={160} header>
                Party
              </Cell>
              <Cell width={180} header>
                Material
              </Cell>
              <Cell width={80} header>
                Qty
              </Cell>
              <Cell width={90} header>
                MS
              </Cell>
              <Cell width={90} header>
                GI
              </Cell>
              <Cell width={90} header>
                Zinc %
              </Cell>
              <Cell width={80} header>
                Avg
              </Cell>
            </View>

            {tableData.length === 0 ? (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyText}>No production found</Text>
              </View>
            ) : (
              tableData.slice(0, 8).map(item => (
                <View key={item.id} style={styles.tableRow}>
                  <Cell width={55}>{item.sr_no || '-'}</Cell>
                  <Cell width={100}>{item.production_time || '-'}</Cell>
                  <Cell width={120}>{item.challan_no || '-'}</Cell>
                  <Cell width={160}>{item.party_name || '-'}</Cell>
                  <Cell width={180}>{item.material || '-'}</Cell>
                  <Cell width={80}>{item.dipping_qty || '-'}</Cell>
                  <Cell width={90}>
                    {item.ms_weight !== null &&
                    item.ms_weight !== undefined &&
                    item.ms_weight !== ''
                      ? `${item.ms_weight} KG`
                      : '-'}
                  </Cell>
                  <Cell width={90}>
                    {item.gi_weight !== null &&
                    item.gi_weight !== undefined &&
                    item.gi_weight !== ''
                      ? `${item.gi_weight} KG`
                      : '-'}
                  </Cell>
                  <Cell width={90}>
                    {item.zinc_percentage ? `${item.zinc_percentage}%` : '-'}
                  </Cell>
                  <Cell width={80}>{item.avg_coating || '-'}</Cell>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {tableData.length > 8 && (
          <Text style={styles.moreText}>
            Showing 8 of {tableData.length} rows. Tap FULL to view all.
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
            <Text style={styles.generateText}>GENERATE REPORT</Text>
          </>
        )}
      </TouchableOpacity>
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

function Cell({ children, width, header }) {
  return (
    <View style={[styles.cell, { width }, header && styles.headCell]}>
      <Text
        numberOfLines={2}
        style={[styles.cellText, header && styles.headText]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

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

  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },

  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cell: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  headCell: {
    minHeight: 46,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  headText: {
    color: COLORS.white,
    fontWeight: '800',
  },

  emptyTable: {
    padding: 20,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
  },

  moreText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  pdfBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  pdfBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
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
