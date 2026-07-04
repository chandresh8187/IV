import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Factory,
  Moon,
  Sun,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';

import { getDashboardApi } from '../../api/dashboardApi';
import { socket } from '../../socket/socket';
import { SafeAreaView } from 'react-native-safe-area-context';
import moment from 'moment';
import { COLORS } from '../../assets/Colors';

export default function DashboardScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    refetchInterval: 10000,
  });

  useEffect(() => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    socket.connect();

    socket.on('production_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('shift_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      socket.off('production_updated');
      socket.off('shift_updated');
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.activeShiftCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <Factory size={22} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Current Shift</Text>
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

      <View style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>Current Month Summary</Text>
          <Text style={styles.monthSubTitle}>Production overview</Text>
        </View>

        <View style={styles.monthGrid}>
          <SummaryBox
            label="MS Production"
            value={`${monthlySummary.total_ms_production_kg || 0} KG`}
          />

          <SummaryBox
            label="GI Production"
            value={`${monthlySummary.total_gi_production_kg || 0} KG`}
          />

          <SummaryBox
            label="Zinc Used"
            value={`${monthlySummary.zink_used || 0} KG`}
          />

          <SummaryBox
            label="Zinc Consumption"
            value={`${monthlySummary.zinc_consumption || 0}%`}
          />
        </View>
      </View>

      <View style={styles.grid}>
        <SummaryCard
          title="Active MS Production"
          value={`${activeShift.total_ms_production_kg || 0} kg`}
          icon={<TrendingUp size={22} color={COLORS.primary} />}
          isfull={true}
        />

        <SummaryCard
          title="Zinc Used"
          value={`${
            activeShift.zink_used || activeShift.difference_kg || 0
          } kg`}
          icon={<Zap size={22} color={COLORS.orange} />}
        />

        <SummaryCard
          title="Zinc Consumption"
          value={`${
            activeShift.zinc_consumption ||
            activeShift.difference_percentage ||
            0
          }%`}
          icon={<Zap size={22} color={COLORS.orange} />}
        />
      </View>

      <SectionTitle title="Today Shift Summary" />

      <View style={styles.shiftGrid}>
        <ShiftSummaryCard
          title="Day Shift"
          icon={<Sun size={22} color={COLORS.orange} />}
          data={dayShift}
        />

        <ShiftSummaryCard
          title="Night Shift"
          icon={<Moon size={22} color={COLORS.primary} />}
          data={nightShift}
        />
      </View>
    </ScrollView>
  );
}

function SummaryCard({ title, value, icon, isfull }) {
  return (
    <View style={[styles.summaryCard, { width: isfull ? '100%' : '48%' }]}>
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

function ShiftSummaryCard({ title, icon, data }) {
  return (
    <View style={styles.shiftCard}>
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

function SummaryBox({ label, value }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
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

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
  },

  subTitle: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
  },

  shiftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  idleBadge: {
    backgroundColor: '#FEE2E2',
  },

  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  activeText: {
    color: COLORS.green,
  },

  idleText: {
    color: COLORS.red,
  },

  activeShiftCard: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    elevation: 3,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
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
    borderRadius: 22,
    padding: 15,
    elevation: 3,
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
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
    fontWeight: '900',
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 12,
  },

  shiftGrid: {
    gap: 12,
  },

  shiftCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 3,
  },

  monthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginTop: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  monthHeader: {
    marginBottom: 14,
  },

  monthTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
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
    backgroundColor: COLORS.bg,
    borderRadius: 14,
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
    fontWeight: '900',
    marginTop: 5,
  },

  monthValues: {
    marginTop: 14,
  },

  materialCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 3,
    marginBottom: 12,
  },

  materialTitle: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
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
    fontWeight: '900',
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 18,
    elevation: 2,
  },

  emptyText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
});
