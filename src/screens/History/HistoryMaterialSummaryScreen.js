import { useQuery } from '@tanstack/react-query';
import { FileDown, Layers3 } from 'lucide-react-native';
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
import { useSelector } from 'react-redux';

import { getHistoryMaterialSummaryApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import { formatQuantity, formatWeight } from '../../utils/format';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';
import { downloadProductionReport } from '../../utils/serverProductionReport';

export default function HistoryMaterialSummaryScreen({ navigation, route }) {
  const { date, shift_name: shiftName } = route.params;
  const { contentMaxWidth } = useResponsive();
  const loggedUser = useSelector(state => state.auth.user);
  const canGenerateReports = hasPermission(loggedUser, 'reports.generate');
  const [downloadingItemId, setDownloadingItemId] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['history-material-summary', date, shiftName || 'all'],
    queryFn: () =>
      getHistoryMaterialSummaryApi({ date, shift_name: shiftName }),
  });
  const materials = data?.data || [];

  const createReport = async material => {
    setDownloadingItemId(material.item_id || material.material_name);
    try {
      const pdf = await downloadProductionReport({
        type: 'material',
        value: material.material_name,
        date,
        item_id: material.item_id || undefined,
        shift_name: shiftName,
      });
      navigation.navigate('PdfViewer', {
        ...pdf,
        title: `${material.material_name} Report`,
      });
    } catch (error) {
      Alert.alert(
        'Could not create report',
        error?.response?.data?.message || error?.message || 'Please try again.',
      );
    } finally {
      setDownloadingItemId(null);
    }
  };

  if (isLoading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    >
      <View style={styles.intro}>
        <Layers3 size={21} color={COLORS.accent} />
        <View style={styles.grow}>
          <Text style={styles.title}>
            {shiftName
              ? `${shiftName[0].toUpperCase()}${shiftName.slice(
                  1,
                )} shift material output`
              : 'Material output'}
          </Text>
          <Text style={styles.subtitle}>
            {shiftName
              ? 'Only this shift is included in every material total.'
              : 'Each total is grouped by the material selected in production planning.'}
          </Text>
        </View>
      </View>
      <ResponsiveGrid>
        {!materials.length ? (
          <EmptyState />
        ) : (
          materials.map(material => {
            const reportKey = material.item_id || material.material_name;
            return (
              <View key={String(reportKey)} style={styles.card}>
                <Text style={styles.materialName}>
                  {material.material_name}
                </Text>
                {material.material_descriptions ? (
                  <Text style={styles.variants}>
                    {material.material_descriptions}
                  </Text>
                ) : null}
                {shiftName ? (
                  <View style={styles.singleShiftStrip}>
                    <ShiftTotal
                      label={`${shiftName[0].toUpperCase()}${shiftName.slice(
                        1,
                      )} shift output`}
                      value={material.total_production_qty}
                      strong
                    />
                  </View>
                ) : (
                  <View style={styles.shiftStrip}>
                    <ShiftTotal label="Day" value={material.day_produced_qty} />
                    <ShiftTotal
                      label="Night"
                      value={material.night_produced_qty}
                    />
                    <ShiftTotal
                      label="Total"
                      value={material.total_production_qty}
                      strong
                    />
                  </View>
                )}
                <View style={styles.grid}>
                  <Metric
                    label="MS production"
                    value={`${formatWeight(
                      material.total_ms_production_kg,
                    )} KG`}
                  />
                  <Metric
                    label="GI production"
                    value={`${formatWeight(
                      material.total_gi_production_kg,
                    )} KG`}
                  />
                  <Metric
                    label="Zinc used"
                    value={`${formatWeight(material.zink_used)} KG`}
                  />
                  <Metric
                    label="Zinc consumption"
                    value={`${formatWeight(material.zinc_consumption)}%`}
                  />
                  <Metric
                    label="Avg coating"
                    value={
                      material.avg_coating
                        ? formatQuantity(material.avg_coating)
                        : '—'
                    }
                  />
                  <Metric
                    label="Production entries"
                    value={formatQuantity(material.entry_count)}
                  />
                </View>
                {canGenerateReports ? (
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={() => createReport(material)}
                    disabled={downloadingItemId === reportKey}
                  >
                    {downloadingItemId === reportKey ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <FileDown size={16} color={COLORS.white} />
                        <Text style={styles.reportButtonText}>
                          MATERIAL REPORT
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ResponsiveGrid>
    </ScrollView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No production for this date</Text>
      <Text style={styles.emptyText}>
        Material totals will appear after production entries are saved.
      </Text>
    </View>
  );
}
function ShiftTotal({ label, value, strong }) {
  return (
    <View style={styles.shiftTotal}>
      <Text style={styles.shiftLabel}>{label}</Text>
      <Text style={[styles.shiftValue, strong && styles.shiftValueStrong]}>
        {formatQuantity(value)} NOS
      </Text>
    </View>
  );
}
function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  intro: {
    padding: 14,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 13,
    ...UI.shadow,
  },
  grow: { flex: 1, minWidth: 0 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: COLORS.gray, fontSize: 12, lineHeight: 15, marginTop: 2 },
  card: {
    padding: 16,
    marginBottom: 13,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  materialName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  variants: { color: COLORS.gray, fontSize: 12, lineHeight: 16, marginTop: 4 },
  shiftStrip: { flexDirection: 'row', gap: 7, marginTop: 14 },
  singleShiftStrip: { marginTop: 14 },
  shiftTotal: {
    flex: 1,
    padding: 10,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
  shiftLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  shiftValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  shiftValueStrong: { color: COLORS.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  metric: {
    flexGrow: 1,
    flexBasis: '42%',
    padding: 10,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
  metricLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  metricValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  reportButton: {
    minHeight: 44,
    marginTop: 14,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  reportButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    padding: 28,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
  },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
  },
});
