import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getHistoryPlanningSummaryApi } from '../../api/historyApi';
import {
  centeredContent,
  gridItemWidth,
  useResponsive,
} from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';
import { formatQuantity } from '../../utils/format';

export default function HistoryPlanningSummaryScreen({ route }) {
  const { date } = route.params;
  const { isTablet, contentMaxWidth } = useResponsive();
  const infoBoxWidth = gridItemWidth(2, 4, isTablet);

  const { data, isLoading } = useQuery({
    queryKey: ['history-planning-summary', date],
    queryFn: () => getHistoryPlanningSummaryApi(date),
  });

  const planningList = data?.data || [];

  if (isLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
    >
      <View style={styles.dateCard}>
        <Text style={styles.dateLabel}>PRODUCTION DATE</Text>
        <Text style={styles.dateValue}>{date}</Text>
      </View>

      {planningList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No planning summary found</Text>
        </View>
      ) : (
        planningList.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.flex}>
                <Text style={styles.challan}>{item.challan_no}</Text>

                <Text style={styles.party}>
                  {item.third_party_name
                    ? `${item.party_name} (${item.third_party_name})`
                    : item.party_name}
                </Text>
              </View>

              <Text
                style={[
                  styles.badge,
                  item.status === 'completed' && styles.completedBadge,
                  item.status === 'canceled' && styles.canceledBadge,
                ]}
              >
                {String(item.status || 'pending').toUpperCase()}
              </Text>
            </View>

            <Text style={styles.materialDesc}>
              {item.material_description || '-'}
            </Text>

            <View style={styles.grid}>
              <InfoBox
                label="Planning Qty"
                value={`${formatQuantity(item.planned_qty)} NOS`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Day Shift"
                value={`${formatQuantity(item.day_produced_qty)} NOS`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Night Shift"
                value={`${formatQuantity(item.night_produced_qty)} NOS`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Total Produced"
                value={`${formatQuantity(item.total_produced_qty)} NOS`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Remaining Qty"
                value={`${formatQuantity(item.remaining_qty)} NOS`}
                width={infoBoxWidth}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function InfoBox({ label, value, width }) {
  return (
    <View style={[styles.infoBox, { width }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

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

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
  },

  dateCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },

  dateLabel: {
    color: COLORS.borderStrong,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  dateValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  dateDescription: {
    color: COLORS.border,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  challan: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  party: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  badge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },

  completedBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },

  canceledBadge: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },

  materialDesc: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 10,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '800',
  },

  infoValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
});
