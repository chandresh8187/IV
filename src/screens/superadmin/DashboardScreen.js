import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  Moon,
  Sun,
  Wrench,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import moment from 'moment';
import { getDashboardApi } from '../../api/dashboardApi';
import { formatDisplayDateTime, formatWeight } from '../../utils/format';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function DashboardScreen() {
  const { isTablet: tabletWindow, fontScale, wideMaxWidth } = useResponsive();
  const isTablet = tabletWindow && fontScale <= 1.3;

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error?.response?.data?.message || 'Failed to load dashboard'}
        </Text>
      </View>
    );
  }

  const dashboard = data?.data;
  const todaySummary = dashboard?.today_summary;
  const dayShift = todaySummary?.day_shift || {};
  const nightShift = todaySummary?.night_shift || {};
  const monthlySummary = dashboard?.current_month || {};
  const plantStatusData = dashboard?.plant_status || {};
  const plantStatus = plantStatusData?.status || 'running';
  const productionAllowed = plantStatusData?.production_allowed !== false;
  const plantStatusConfig = getPlantStatusConfig(plantStatus, plantStatusData);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, centeredContent(wideMaxWidth)]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.pageIntro}>
          <View style={styles.introCopy}>
            <Text style={styles.eyebrow}>Your plant at a glance</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.dateChip}>
            <CalendarDays size={16} color={COLORS.accent} />
            <Text style={styles.dateChipText}>
              {moment().format('DD/MM/YYYY')}
            </Text>
          </View>
        </View>

        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>Monthly production</Text>
            <Text style={styles.monthSubTitle}>
              {moment().format('MMMM YYYY')}
            </Text>
          </View>

          <View style={styles.monthGrid}>
            <SummaryBox
              label="MS Production"
              value={`${formatWeight(
                monthlySummary.total_ms_production_kg || 0,
              )} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="GI Production"
              value={`${formatWeight(
                monthlySummary.total_gi_production_kg || 0,
              )} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="Zinc Used"
              value={`${formatWeight(monthlySummary.zink_used || 0)} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="Zinc Consumption"
              value={`${formatWeight(monthlySummary.zinc_consumption || 0)}%`}
              isTablet={isTablet}
            />
          </View>
        </View>

        <SectionTitle title="Today’s shifts" />

        <View style={[styles.shiftGrid, isTablet && styles.shiftGridTablet]}>
          <ShiftSummaryCard
            title="Day Shift"
            icon={<Sun size={22} color={COLORS.accent} />}
            data={dayShift}
            isTablet={isTablet}
          />

          <ShiftSummaryCard
            title="Night Shift"
            icon={<Moon size={22} color={COLORS.primary} />}
            data={nightShift}
            isTablet={isTablet}
          />
        </View>
      </ScrollView>
      {!productionAllowed && (
        <PlantStatusBanner config={plantStatusConfig} data={plantStatusData} />
      )}
    </>
  );
}

function getPlantStatusConfig(status, data) {
  if (status === 'maintenance') {
    return {
      title: data?.title || 'Plant Under Maintenance',
      description:
        data?.message || 'Maintenance work is currently in progress.',
      icon: <Wrench size={24} color={COLORS.warning} />,
      containerStyle: styles.maintenanceStatusCard,
      badgeStyle: styles.maintenanceStatusBadge,
      badgeTextStyle: styles.maintenanceStatusText,
      badgeText: 'MAINTENANCE',
    };
  }

  if (status === 'stopped') {
    return {
      title: data?.title || 'Plant Stopped',
      description: data?.message || 'Plant operations are currently stopped.',
      icon: <AlertTriangle size={24} color={COLORS.danger} />,
      containerStyle: styles.stoppedStatusCard,
      badgeStyle: styles.stoppedStatusBadge,
      badgeTextStyle: styles.stoppedStatusText,
      badgeText: 'STOPPED',
    };
  }

  return {
    title: data?.title || 'Plant Running',
    description:
      data?.message || 'Plant operations and production entry are active.',
    icon: <CircleCheck size={24} color={COLORS.success} />,
    containerStyle: styles.runningStatusCard,
    badgeStyle: styles.runningStatusBadge,
    badgeTextStyle: styles.runningStatusText,
    badgeText: 'RUNNING',
  };
}

function PlantStatusBanner({ config, data }) {
  return (
    <View style={styles.bannerPadding}>
      <View style={[styles.plantStatusCard, config.containerStyle]}>
        <View style={styles.plantStatusHeader}>
          <View style={styles.plantStatusIcon}>{config.icon}</View>

          <View style={styles.plantStatusContent}>
            <Text style={styles.plantStatusTitle}>{config.title}</Text>
            <Text style={styles.plantStatusDescription}>
              {config.description}
            </Text>
          </View>

          <View style={[styles.plantStatusBadge, config.badgeStyle]}>
            <Text style={[styles.plantStatusBadgeText, config.badgeTextStyle]}>
              {config.badgeText}
            </Text>
          </View>
        </View>

        {data?.started_at ? (
          <InfoLine
            label="Status Since"
            value={formatDisplayDateTime(data.started_at)}
          />
        ) : null}

        {data?.expected_restart_at ? (
          <InfoLine
            label="Expected Restart"
            value={formatDisplayDateTime(data.expected_restart_at)}
          />
        ) : null}

        {data?.production_allowed === false ? (
          <Text style={styles.productionBlockedText}>
            Production entry is blocked. Dashboard totals show completed
            production only.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ShiftSummaryCard({ title, icon, data, isTablet }) {
  return (
    <View style={[styles.shiftCard, isTablet && styles.shiftCardTablet]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconBox}>{icon}</View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>

      <View style={styles.shiftMetrics}>
        <ShiftMetric
          label="MS production"
          value={`${formatWeight(data?.total_ms_production_kg || 0)} kg`}
        />
        <ShiftMetric
          label="GI production"
          value={`${formatWeight(data?.total_gi_production_kg || 0)} kg`}
        />
        <ShiftMetric
          label="Zinc used"
          value={`${formatWeight(data?.zink_used || 0)} kg`}
        />
        <ShiftMetric
          label="Zinc consumption"
          value={`${formatWeight(data?.zinc_consumption || 0)}%`}
        />
      </View>
    </View>
  );
}

function ShiftMetric({ label, value }) {
  return (
    <View style={styles.shiftMetric}>
      <Text style={styles.shiftMetricLabel}>{label}</Text>
      <Text style={styles.shiftMetricValue}>{value}</Text>
    </View>
  );
}

function SummaryBox({ label, value, isTablet }) {
  return (
    <View style={[styles.summaryBox, isTablet && styles.summaryBoxTablet]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryBoxValue}>{value}</Text>
    </View>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  bannerPadding: { padding: 20 },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  content: {
    paddingHorizontal: UI.pagePadding,
    paddingBottom: 30,
    paddingTop: 20,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
    fontWeight: '600',
  },

  errorText: {
    color: COLORS.red,
    fontWeight: '600',
  },

  pageIntro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  introCopy: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 6,
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },

  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  dateChipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  plantStatusCard: {
    borderRadius: UI.radius,
    padding: UI.cardPadding,
    borderWidth: 1,
    ...UI.shadow,
  },

  runningStatusCard: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.borderStrong,
  },

  maintenanceStatusCard: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
  },

  stoppedStatusCard: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
  },

  plantStatusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  plantStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  plantStatusContent: {
    flex: 1,
  },

  plantStatusTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },

  plantStatusDescription: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 18,
  },

  plantStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: UI.radiusSmall,
  },

  plantStatusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  runningStatusBadge: {
    backgroundColor: COLORS.tealSoft,
  },

  runningStatusText: {
    color: COLORS.success,
  },

  maintenanceStatusBadge: {
    backgroundColor: COLORS.warningSoft,
  },

  maintenanceStatusText: {
    color: COLORS.warning,
  },

  stoppedStatusBadge: {
    backgroundColor: COLORS.dangerSoft,
  },

  stoppedStatusText: {
    color: COLORS.danger,
  },

  productionBlockedText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    lineHeight: 18,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },

  sectionTitle: {
    color: COLORS.gray,
    letterSpacing: 0,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 12,
  },

  shiftMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  shiftMetric: { flexBasis: '43%', flexGrow: 1 },
  shiftMetricLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '400' },
  shiftMetricValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 5,
  },
  shiftGrid: {
    gap: 12,
  },

  shiftGridTablet: {
    flexDirection: 'row',
  },

  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: UI.cardPadding,
    ...UI.shadow,
    borderWidth: 0,
    borderColor: COLORS.border,
  },

  shiftCardTablet: {
    flex: 1,
  },

  monthCard: {
    backgroundColor: COLORS.hero,
    borderRadius: UI.radiusLarge,
    padding: UI.cardPadding,
    marginTop: 14,
    ...UI.shadow,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  monthHeader: {
    marginBottom: 14,
  },

  monthTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },

  monthSubTitle: {
    color: COLORS.onHero,
    letterSpacing: 0,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  summaryBox: {
    flexGrow: 1,
    flexBasis: '42%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: UI.radiusSmall,
    borderWidth: 0,
    borderColor: COLORS.border,
    padding: 13,
  },

  summaryBoxTablet: {
    flexBasis: '21%',
  },

  summaryLabel: {
    color: COLORS.onHero,
    fontSize: 12,
    fontWeight: '400',
  },

  // Named differently from summaryValue: duplicate StyleSheet keys silently
  // override each other, which was shrinking the summary card values.
  summaryBoxValue: {
    color: COLORS.white,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 5,
  },

  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoLabel: {
    flex: 1,
    marginRight: 10,
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
  },

  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
