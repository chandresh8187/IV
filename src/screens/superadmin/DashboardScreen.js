import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  Factory,
  Moon,
  Sun,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
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
import { COLORS, UI } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const { isTablet, wideMaxWidth } = useResponsive();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    refetchInterval: 10000,
  });

  useEffect(() => {
    // Notification permission is already requested once at login
    // (LoginScreen.js) - asking again here just re-prompts on every
    // dashboard mount/focus.
    if (!socket.connected) {
      socket.connect();
    }

    const handleProductionUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handleShiftUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const handlePlantStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    socket.on('production_updated', handleProductionUpdated);
    socket.on('shift_updated', handleShiftUpdated);
    socket.on('plant_status_updated', handlePlantStatusUpdated);

    return () => {
      // Passing the specific handler (not just the event name) means this
      // cleanup won't accidentally remove listeners other screens
      // (ProductionScreen, ShiftScreen) registered for the same events.
      socket.off('production_updated', handleProductionUpdated);
      socket.off('shift_updated', handleShiftUpdated);
      socket.off('plant_status_updated', handlePlantStatusUpdated);
    };
  }, [queryClient]);

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

  const shiftStatus = dashboard?.shift_status;
  const todaySummary = dashboard?.today_summary;
  const dayShift = todaySummary?.day_shift || {};
  const nightShift = todaySummary?.night_shift || {};
  const activeShift = dashboard?.active_shift_summary || {};
  const monthlySummary = dashboard?.current_month || {};
  const monthlyRows = Array.isArray(monthlySummary.daily_summary)
    ? monthlySummary.daily_summary
    : [];
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
            <Text style={styles.eyebrow}>PLANT OPERATIONS</Text>
            <Text style={styles.title}>Operations overview IV</Text>
            <Text style={styles.subTitle}>
              Live production and plant performance at a glance
            </Text>
          </View>
          <View style={styles.dateChip}>
            <CalendarDays size={16} color={COLORS.accent} />
            <Text style={styles.dateChipText}>{moment().format('DD MMM')}</Text>
          </View>
        </View>

        {productionAllowed && (
          <View style={styles.activeShiftCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconBox}>
                <Factory size={22} color={COLORS.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {productionAllowed
                    ? 'Current Shift'
                    : plantStatus === 'maintenance'
                    ? 'Production Before Maintenance'
                    : 'Production Before Plant Stop'}
                </Text>
              </View>
              <View
                style={[
                  styles.shiftBadge,
                  shiftStatus?.is_shift_active
                    ? styles.activeBadge
                    : styles.idleBadge,
                ]}
              >
                <Text
                  style={[
                    styles.shiftBadgeText,
                    shiftStatus?.is_shift_active
                      ? styles.activeText
                      : styles.idleText,
                  ]}
                >
                  {shiftStatus?.is_shift_active
                    ? shiftStatus.active_shift.shift_name?.toUpperCase()
                    : 'NO SHIFT'}
                </Text>
              </View>
            </View>

            {shiftStatus?.active_shift ? (
              <View style={styles.shiftInfoBox}>
                <InfoLine
                  label="Shift Date"
                  value={moment(shiftStatus.active_shift.shift_date).format(
                    'DD/MM/YYYY',
                  )}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No active shift right now.</Text>
            )}
          </View>
        )}

        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>Current Month Summary</Text>
            <Text style={styles.monthSubTitle}>Production overview</Text>
          </View>

          <View style={styles.monthGrid}>
            <SummaryBox
              label="MS Production"
              value={`${monthlySummary.total_ms_production_kg || 0} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="GI Production"
              value={`${monthlySummary.total_gi_production_kg || 0} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="Zinc Used"
              value={`${monthlySummary.zink_used || 0} KG`}
              isTablet={isTablet}
            />

            <SummaryBox
              label="Zinc Consumption"
              value={`${monthlySummary.zinc_consumption || 0}%`}
              isTablet={isTablet}
            />
          </View>
        </View>

        <View style={styles.monthlyProductionCard}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>Monthly Production Summary</Text>
            <Text style={styles.monthSubTitle}>Day-by-day production</Text>
          </View>
          {monthlyRows.length ? (
            monthlyRows.map(row => (
              <View key={row.production_date} style={styles.monthlyRow}>
                <View style={styles.monthlyDateBox}>
                  <Text style={styles.monthlyDateDay}>
                    {moment(row.production_date).format('DD')}
                  </Text>
                  <Text style={styles.monthlyDateMonth}>
                    {moment(row.production_date).format('MMM')}
                  </Text>
                </View>
                <View style={styles.monthlyMetric}>
                  <Text style={styles.monthlyMetricLabel}>Qty</Text>
                  <Text style={styles.monthlyMetricValue}>
                    {row.total_dipping_qty || 0}
                  </Text>
                </View>
                <View style={styles.monthlyMetric}>
                  <Text style={styles.monthlyMetricLabel}>MS</Text>
                  <Text style={styles.monthlyMetricValue}>
                    {row.total_ms || 0}
                  </Text>
                </View>
                <View style={styles.monthlyMetric}>
                  <Text style={styles.monthlyMetricLabel}>GI</Text>
                  <Text style={styles.monthlyMetricValue}>
                    {row.total_gi || 0}
                  </Text>
                </View>
                <View style={styles.monthlyMetric}>
                  <Text style={styles.monthlyMetricLabel}>Zinc</Text>
                  <Text style={styles.monthlyMetricValue}>
                    {row.zinc_consumption || 0}%
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No monthly production available.
            </Text>
          )}
        </View>

        <View style={styles.grid}>
          <SummaryCard
            title={
              productionAllowed
                ? 'Active MS Production'
                : plantStatus === 'maintenance'
                ? 'MS Before Maintenance'
                : 'MS Before Plant Stop'
            }
            value={`${activeShift.total_ms_production_kg || 0} kg`}
            icon={<TrendingUp size={22} color={COLORS.primary} />}
            isfull={!isTablet}
            isTablet={isTablet}
          />

          <SummaryCard
            title="Zinc Used"
            value={`${
              activeShift.zink_used || activeShift.difference_kg || 0
            } kg`}
            icon={<Zap size={22} color={COLORS.orange} />}
            isTablet={isTablet}
          />

          <SummaryCard
            title="Zinc Consumption"
            value={`${
              activeShift.zinc_consumption ||
              activeShift.difference_percentage ||
              0
            }%`}
            icon={<Zap size={22} color={COLORS.orange} />}
            isTablet={isTablet}
          />
        </View>

        {productionAllowed && <SectionTitle title="Today Shift Summary" />}

        {productionAllowed && (
          <View style={[styles.shiftGrid, isTablet && styles.shiftGridTablet]}>
            <ShiftSummaryCard
              title="Day Shift"
              icon={<Sun size={22} color={COLORS.orange} />}
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
        )}
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
      icon: <Wrench size={24} color="#B26A00" />,
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
      icon: <AlertTriangle size={24} color="#C62828" />,
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
    icon: <CircleCheck size={24} color="#1B7F3A" />,
    containerStyle: styles.runningStatusCard,
    badgeStyle: styles.runningStatusBadge,
    badgeTextStyle: styles.runningStatusText,
    badgeText: 'RUNNING',
  };
}

function PlantStatusBanner({ config, data }) {
  return (
    <View
      style={{
        padding: 20,
      }}
    >
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
            value={moment(data.started_at).format('DD MMM YYYY, hh:mm A')}
          />
        ) : null}

        {data?.expected_restart_at ? (
          <InfoLine
            label="Expected Restart"
            value={moment(data.expected_restart_at).format(
              'DD MMM YYYY, hh:mm A',
            )}
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

function SummaryCard({ title, value, icon, isfull, isTablet }) {
  // Tablets have room for all three cards in a single row.
  const width = isfull ? '100%' : isTablet ? '31.5%' : '48%';

  return (
    <View style={[styles.summaryCard, { width }]}>
      <View
        style={[
          isfull
            ? {
                flexDirection: 'row',
                alignItems: 'center',
              }
            : {},
        ]}
      >
        <View style={[styles.summaryIcon, isfull && { marginRight: 10 }]}>
          {icon}
        </View>
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <Text style={[styles.summaryValue, isfull && { fontSize: 25 }]}>
        {value}
      </Text>
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

      <InfoLine label="MS" value={`${data?.total_ms_production_kg || 0} kg`} />
      <InfoLine label="Zinc Used" value={`${data?.zink_used || 0} kg`} />
      <InfoLine
        label="Zinc Consumption"
        value={`${data?.zinc_consumption || 0}%`}
      />
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
    fontWeight: '700',
  },

  errorText: {
    color: COLORS.red,
    fontWeight: '800',
  },

  pageIntro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  introCopy: {
    flex: 1,
    paddingRight: 12,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
  },

  title: {
    color: COLORS.primary,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  subTitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
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
    fontWeight: '700',
  },

  shiftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  idleBadge: {
    backgroundColor: '#FEE2E2',
  },

  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  activeText: {
    color: COLORS.green,
  },

  idleText: {
    color: COLORS.red,
  },

  plantStatusCard: {
    borderRadius: UI.radius,
    padding: UI.cardPadding,
    borderWidth: 1,
    ...UI.shadow,
  },

  runningStatusCard: {
    backgroundColor: '#ECFDF3',
    borderColor: '#86D69D',
  },

  maintenanceStatusCard: {
    backgroundColor: '#FFF8E1',
    borderColor: '#F2C15B',
  },

  stoppedStatusCard: {
    backgroundColor: '#FFF0F0',
    borderColor: '#EF9A9A',
  },

  plantStatusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  plantStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  plantStatusContent: {
    flex: 1,
  },

  plantStatusTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },

  plantStatusDescription: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },

  plantStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },

  plantStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  runningStatusBadge: {
    backgroundColor: '#D8F3E1',
  },

  runningStatusText: {
    color: '#1B7F3A',
  },

  maintenanceStatusBadge: {
    backgroundColor: '#FCE7AE',
  },

  maintenanceStatusText: {
    color: '#9A5A00',
  },

  stoppedStatusBadge: {
    backgroundColor: '#FFDADA',
  },

  stoppedStatusText: {
    color: '#B71C1C',
  },

  productionBlockedText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    lineHeight: 18,
  },

  activeShiftCard: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: UI.cardPadding,
    ...UI.shadow,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.teal,
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
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  cardDesc: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },

  shiftInfoBox: {
    marginTop: 14,
  },

  grid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  summaryCard: {
    // width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 16,
    ...UI.shadow,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  summaryTitle: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },

  summaryValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 12,
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
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  shiftCardTablet: {
    flex: 1,
  },

  monthCard: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
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
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },

  monthSubTitle: {
    color: COLORS.gray,
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
    width: '48%',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
  },

  summaryBoxTablet: {
    width: '23.5%',
  },

  summaryLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
  },

  // Named differently from summaryValue: duplicate StyleSheet keys silently
  // override each other, which was shrinking the summary card values.
  summaryBoxValue: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },

  monthValues: {
    marginTop: 14,
  },

  materialCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 12,
  },

  materialTitle: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  materialGrid: {
    gap: 6,
  },

  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  monthlyProductionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 16,
  },
  monthlyRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 9,
    gap: 8,
  },
  monthlyDateBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyDateDay: { color: COLORS.primary, fontSize: 16, fontWeight: '900' },
  monthlyDateMonth: { color: COLORS.gray, fontSize: 9, fontWeight: '800' },
  monthlyMetric: { flex: 1, minWidth: 0 },
  monthlyMetricLabel: { color: COLORS.gray, fontSize: 9, fontWeight: '800' },
  monthlyMetricValue: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
});
