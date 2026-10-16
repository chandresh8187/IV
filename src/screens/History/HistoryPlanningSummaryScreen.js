import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileDown, MoonStar, SunMedium } from 'lucide-react-native';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';
import { downloadProductionReport } from '../../utils/serverProductionReport';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getHistoryPlanningSummaryApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import { formatDisplayDate, formatQuantity, formatWeight } from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';

export default function HistoryPlanningSummaryScreen({ route, navigation }) {
  const { date, shift_name: shiftName } = route.params;
  const { contentMaxWidth } = useResponsive();
  const user = useSelector(state => state.auth.user);
  const canGenerateReports = hasPermission(user, 'reports.generate');
  const [downloadingItemId, setDownloadingItemId] = useState(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['history-planning-summary', date, shiftName || 'all'],
    queryFn: () =>
      getHistoryPlanningSummaryApi({ date, shift_name: shiftName }),
  });
  const planningItems = data?.data || [];

  const createReport = async item => {
    const key = item.planning_item_id || `plan-${item.planning_id}`;
    setDownloadingItemId(key);
    try {
      const pdf = await downloadProductionReport({ type: 'challan', value: item.challan_no,
        date, shift_name: shiftName, planning_id: item.planning_id,
        planning_item_id: item.planning_item_id || undefined });
      navigation.navigate('PdfViewer', { ...pdf, title: `${item.challan_no} Report` });
    } catch (error) {
      Alert.alert('Could not create report', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally { setDownloadingItemId(null); }
  };

  if (isLoading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );

  if (isError) return <View style={styles.loader}><Text style={styles.subtitle}>Could not load planning summary.</Text><TouchableOpacity accessibilityRole="button" style={styles.reportButton} onPress={() => refetch()}><Text style={styles.reportButtonText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    >
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <ClipboardList size={22} color={COLORS.accent} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.title}>
            {shiftName
              ? `${shiftName[0].toUpperCase()}${shiftName.slice(
                  1,
                )} shift planning output`
              : 'Planning flow output'}
          </Text>
          <Text style={styles.subtitle}>
            {formatDisplayDate(date)} · {shiftName ? 'only this shift' : 'all shifts'} · one card
            per challan item
          </Text>
        </View>
      </View>
      <ResponsiveGrid>
        {!planningItems.length ? (
          <EmptyState />
        ) : (
          planningItems.map(item => (
            <PlanningItemCard
              key={item.planning_item_id || `plan-${item.planning_id}`}
              item={item}
              shiftName={shiftName}
              onReport={canGenerateReports ? () => createReport(item) : null}
              downloading={downloadingItemId === (item.planning_item_id || `plan-${item.planning_id}`)}
              reportDisabled={downloadingItemId != null}
            />
          ))
        )}
      </ResponsiveGrid>
    </ScrollView>
  );
}

function PlanningItemCard({ item, shiftName, onReport, downloading, reportDisabled }) {
  const planned = Number(item.planned_qty) || 0;
  const completed = Number(item.completed_qty) || 0;
  const progress = planned ? Math.min(100, (completed / planned) * 100) : 0;
  const isComplete = String(item.status).toLowerCase() === 'completed';
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.grow}>
          <Text style={styles.challan}>
            {item.challan_no || 'Linked planning item'}
          </Text>
          <Text style={styles.party}>{item.party_name || '—'}</Text>
        </View>
        <View style={[styles.status, isComplete && styles.statusComplete]}>
          <Text
            style={[styles.statusText, isComplete && styles.statusTextComplete]}
          >
            {isComplete ? 'COMPLETED' : 'PENDING'}
          </Text>
        </View>
      </View>
      <Text style={styles.material}>
        {item.material_description || item.item_name || '—'}
      </Text>
      <View style={styles.progressMeta}>
        <Text style={styles.progressLabel}>Overall plan progress</Text>
        <Text style={styles.progressValue}>
          {formatQuantity(completed)} / {formatQuantity(planned)} NOS
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            isComplete && styles.progressFillComplete,
            { width: `${progress}%` },
          ]}
        />
      </View>
      {shiftName ? (
        <View style={styles.singleShiftGrid}>
          <ShiftBox
            icon={
              shiftName === 'day' ? (
                <SunMedium size={15} color={COLORS.accent} />
              ) : (
                <MoonStar size={15} color={COLORS.teal} />
              )
            }
            label={`${shiftName[0].toUpperCase()}${shiftName.slice(
              1,
            )} shift output`}
            value={item.total_produced_qty}
            strong
          />
        </View>
      ) : (
        <View style={styles.shiftGrid}>
          <ShiftBox
            icon={<SunMedium size={15} color={COLORS.accent} />}
            label="Day shift"
            value={item.day_produced_qty}
          />
          <ShiftBox
            icon={<MoonStar size={15} color={COLORS.teal} />}
            label="Night shift"
            value={item.night_produced_qty}
          />
          <ShiftBox
            label="Produced today"
            value={item.total_produced_qty}
            strong
          />
        </View>
      )}
      <View style={styles.bottomGrid}>
        <Metric
          label="Remaining"
          value={`${formatQuantity(item.remaining_qty)} NOS`}
        />
        <Metric
          label="Target zinc"
          value={
            item.target_zinc_percentage
              ? `${item.target_zinc_percentage}%`
              : '—'
          }
        />
        <Metric
          label="Actual zinc"
          value={item.actual_zinc_percentage == null
            ? '—'
            : `${formatWeight(item.actual_zinc_percentage)}% · ${formatWeight(item.actual_zinc_consumption_kg)} kg`}
        />
      </View>
      {onReport ? <View style={styles.reportActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`PDF report for ${item.challan_no}`} style={styles.reportButton} disabled={reportDisabled} onPress={onReport}>{downloading ? <ActivityIndicator color={COLORS.white} /> : <><FileDown size={16} color={COLORS.white} /><Text style={styles.reportButtonText}>PDF Report</Text></>}</TouchableOpacity></View> : null}
    </View>
  );
}

function ShiftBox({ icon, label, value, strong }) {
  return (
    <View style={styles.shiftBox}>
      {icon ? (
        <View style={styles.shiftLabelRow}>
          {icon}
          <Text style={styles.shiftLabel}>{label}</Text>
        </View>
      ) : (
        <Text style={styles.shiftLabel}>{label}</Text>
      )}
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
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No linked planning production</Text>
      <Text style={styles.emptyText}>
        This date has no production entries connected to a planning item yet.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  reportActions: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  reportButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  reportButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  intro: {
    padding: 15,
    marginBottom: 13,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    ...UI.shadow,
  },
  introIcon: {
    width: 43,
    height: 43,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, minWidth: 0 },
  title: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: COLORS.gray, fontSize: 12, lineHeight: 16, marginTop: 3 },
  card: {
    padding: 16,
    marginBottom: 13,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  challan: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  party: { color: COLORS.gray, fontSize: 12, marginTop: 4 },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.warningSoft,
  },
  statusComplete: { backgroundColor: COLORS.tealSoft },
  statusText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },
  statusTextComplete: { color: COLORS.teal },
  material: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 13,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  progressLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  progressValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 7,
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent },
  progressFillComplete: { backgroundColor: COLORS.teal },
  shiftGrid: { flexDirection: 'row', gap: 7, marginTop: 15 },
  singleShiftGrid: { marginTop: 15 },
  shiftBox: {
    flex: 1,
    padding: 9,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
  shiftLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shiftLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  shiftValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  shiftValueStrong: { color: COLORS.accent },
  bottomGrid: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metric: {
    flex: 1,
    padding: 10,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
  metricLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  metricValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 4,
  },
  empty: {
    padding: 28,
    alignItems: 'center',
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
