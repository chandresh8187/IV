import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
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

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
  lightBlue: '#EEF7FD',
  green: '#16A34A',
  orange: '#F97316',
  red: '#DC2626',
};

export default function DashboardScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    refetchInterval: 10000,
  });

  useEffect(() => {
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
  const month = dashboard?.current_month || {};

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subTitle}>Today: {dashboard?.today_date}</Text>
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
            {shiftStatus?.is_shift_active ? 'ACTIVE' : 'NO SHIFT'}
          </Text>
        </View>
      </View>

      <View style={styles.activeShiftCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <Factory size={22} color={COLORS.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Current Shift</Text>
            <Text style={styles.cardDesc}>
              {shiftStatus?.button_text || '-'}
            </Text>
          </View>
        </View>

        {shiftStatus?.active_shift ? (
          <View style={styles.shiftInfoBox}>
            <InfoLine
              label="Running Shift"
              value={shiftStatus.active_shift.shift_name?.toUpperCase()}
            />
            <InfoLine
              label="Shift Date"
              value={shiftStatus.active_shift.shift_date}
            />
            <InfoLine
              label="Supervisor"
              value={shiftStatus.active_shift.supervisor_name || '-'}
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>No active shift right now.</Text>
        )}
      </View>

      <View style={styles.grid}>
        <SummaryCard
          title="Active MS Production"
          value={`${activeShift.total_ms_production_kg || 0} kg`}
          icon={<TrendingUp size={22} color={COLORS.primary} />}
        />

        <SummaryCard
          title="Active GI Production"
          value={`${activeShift.total_gi_production_kg || 0} kg`}
          icon={<Factory size={22} color={COLORS.primary} />}
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

      <SectionTitle title="Current Month" />

      <View style={styles.monthCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <TrendingUp size={22} color={COLORS.primary} />
          </View>

          <View>
            <Text style={styles.cardTitle}>Monthly Production</Text>
            <Text style={styles.cardDesc}>All shifts combined</Text>
          </View>
        </View>

        <View style={styles.monthValues}>
          <InfoLine
            label="MS Production"
            value={`${month.total_ms_production_kg || 0} kg`}
          />
          <InfoLine
            label="GI Production"
            value={`${month.total_gi_production_kg || 0} kg`}
          />
          <InfoLine label="Zinc Used" value={`${month.zink_used || 0} kg`} />
          <InfoLine
            label="Zinc Consumption"
            value={`${month.zinc_consumption || 0}%`}
          />
        </View>
      </View>

      <SectionTitle title="Active Shift Material Summary" />

      {activeShift?.material_summary?.length > 0 ? (
        activeShift.material_summary.map((item, index) => (
          <MaterialCard key={`${item.material}-${index}`} item={item} />
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No material production yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>{icon}</View>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
      <InfoLine label="GI" value={`${data?.total_gi_production_kg || 0} kg`} />
      <InfoLine label="Zinc Used" value={`${data?.zink_used || 0} kg`} />
      <InfoLine
        label="Zinc Consumption"
        value={`${data?.zinc_consumption || 0}%`}
      />
    </View>
  );
}

function MaterialCard({ item }) {
  return (
    <View style={styles.materialCard}>
      <Text style={styles.materialTitle}>{item.material}</Text>

      <View style={styles.materialGrid}>
        <InfoLine label="Avg MS" value={`${item.avg_ms_weight || 0} kg`} />
        <InfoLine label="Avg GI" value={`${item.avg_gi_weight || 0} kg`} />
        <InfoLine label="Qty" value={item.total_dip_qty || 0} />
        <InfoLine
          label="MS Total"
          value={`${item.total_ms_production_kg || 0} kg`}
        />
        <InfoLine
          label="GI Total"
          value={`${item.total_gi_production_kg || 0} kg`}
        />
        <InfoLine label="Zinc Used" value={`${item.zink_used || 0}kg`} />
        <InfoLine
          label="Zinc Consumption"
          value={`${item.zinc_consumption || 0}%`}
        />
      </View>
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
    width: '48%',
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
    elevation: 3,
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
