import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MoonStar, SunMedium } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getHistoryDateSummaryApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import {
  formatQuantity,
  formatDisplayDate,
  formatWeight,
} from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';

export default function HistoryDateDetailsScreen({ navigation, route }) {
  const { date } = route.params;
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading } = useQuery({
    queryKey: ['history-date-summary', date],
    queryFn: () => getHistoryDateSummaryApi(date),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  const summary = data?.data || {};
  const total = summary.total || {};

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PRODUCTION HISTORY</Text>
        <Text style={styles.date}>
          {formatDisplayDate(date)}
        </Text>
        <Text style={styles.heroSubtitle}>Day + night combined</Text>
        <View style={styles.heroStats}>
          <HeroMetric
            label="MS production"
            value={`${formatWeight(total.total_ms_production_kg)} KG`}
          />
          <HeroMetric
            label="GI production"
            value={`${formatWeight(total.total_gi_production_kg)} KG`}
          />
          <HeroMetric
            label="Zinc used"
            value={`${formatWeight(total.zink_used)} KG`}
          />
          <HeroMetric
            label="Zinc consumption"
            value={`${formatWeight(total.zinc_consumption)}%`}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shift production</Text>
      <ResponsiveGrid>
        <ShiftCard
          title="Day shift"
          icon={<SunMedium size={22} color={COLORS.accent} />}
          summary={summary.day_shift}
          accentStyle={styles.dayIcon}
          onPress={() =>
            navigation.navigate('HistoryShiftTable', {
              date,
              shift_name: 'day',
            })
          }
        />
        <ShiftCard
          title="Night shift"
          icon={<MoonStar size={22} color={COLORS.teal} />}
          summary={summary.night_shift}
          accentStyle={styles.nightIcon}
          onPress={() =>
            navigation.navigate('HistoryShiftTable', {
              date,
              shift_name: 'night',
            })
          }
        />
      </ResponsiveGrid>
    </ScrollView>
  );
}

function LoadingState() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}

function HeroMetric({ label, value }) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
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

function ShiftCard({ title, icon, summary = {}, accentStyle, onPress }) {
  return (
    <TouchableOpacity
      style={styles.shiftCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.shiftHeader}>
        <View style={[styles.shiftIcon, accentStyle]}>{icon}</View>
        <View style={styles.grow}>
          <Text style={styles.shiftTitle}>{title}</Text>
          <Text style={styles.shiftHint}>Tap to view production entries</Text>
        </View>
        <ChevronRight size={20} color={COLORS.muted} />
      </View>
      <View style={styles.shiftMetrics}>
        <Metric
          label="Qty"
          value={`${formatQuantity(summary.total_production_qty)} NOS`}
        />
        <Metric
          label="MS"
          value={`${formatWeight(summary.total_ms_production_kg)} KG`}
        />
        <Metric
          label="GI"
          value={`${formatWeight(summary.total_gi_production_kg)} KG`}
        />
        <Metric
          label="Zinc"
          value={`${formatWeight(summary.zinc_consumption)}%`}
        />
      </View>
    </TouchableOpacity>
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
  hero: {
    padding: 20,
    borderRadius: UI.radiusLarge,
    backgroundColor: COLORS.primary,
    ...UI.shadow,
  },
  eyebrow: {
    color: COLORS.borderStrong,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  date: { color: COLORS.white, fontSize: 21, fontWeight: '600', marginTop: 5 },
  heroSubtitle: { color: COLORS.borderStrong, fontSize: 12, marginTop: 6 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 8 },
  heroMetric: {
    flexGrow: 1,
    flexBasis: '42%',
    minWidth: 0,
    padding: 12,
    borderRadius: UI.radiusSmall,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  heroMetricValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroMetricLabel: {
    color: COLORS.borderStrong,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 19,
    marginBottom: 9,
  },
  shiftCard: {
    padding: 15,
    marginBottom: 11,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  shiftHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shiftIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIcon: { backgroundColor: COLORS.accentSoft },
  nightIcon: { backgroundColor: COLORS.tealSoft },
  grow: { flex: 1, minWidth: 0 },
  shiftTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  shiftHint: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  shiftMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
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
});
