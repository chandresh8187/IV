import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getHistoryMaterialSummaryApi } from '../../api/historyApi';
import {
  centeredContent,
  gridItemWidth,
  useResponsive,
} from '../../utils/responsive';
import { formatWeight } from '../../utils/format';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
};

export default function HistoryMaterialSummaryScreen({ route }) {
  const { date } = route.params;
  const { isTablet, contentMaxWidth } = useResponsive();
  const infoBoxWidth = gridItemWidth(2, 3, isTablet);

  const { data, isLoading } = useQuery({
    queryKey: ['history-material-summary', date],
    queryFn: () => getHistoryMaterialSummaryApi(date),
  });

  const materials = data?.data || [];

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
      showsVerticalScrollIndicator={false}
    >
      {materials.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No material summary found</Text>
        </View>
      ) : (
        materials.map((item, index) => (
          <View key={`${item.material}-${index}`} style={styles.card}>
            <Text style={styles.materialName}>{item.material}</Text>

            <View style={styles.grid}>
              <InfoBox
                label="Qty"
                value={`${item.total_dip_qty || 0} Nos`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="MS Production"
                value={`${formatWeight(item.total_ms_production_kg) || 0} KG`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="GI Production"
                value={`${formatWeight(item.total_gi_production_kg) || 0} KG`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Zinc Used"
                value={`${formatWeight(item.zink_used) || 0} KG`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Zinc %"
                value={`${item.zinc_consumption || 0}%`}
                width={infoBoxWidth}
              />

              <InfoBox
                label="Avg Coating"
                value={`${item.avg_coating || 0}`}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },

  materialName: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
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
    fontWeight: '900',
    marginTop: 4,
  },
});
