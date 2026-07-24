import { useQuery } from '@tanstack/react-query';
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
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';

export default function HistoryDateDetailsScreen({ navigation, route }) {
  const { date } = route.params;
  const { isTablet, contentMaxWidth } = useResponsive();

  const { data, isLoading } = useQuery({
    queryKey: ['history-date-summary', date],
    queryFn: () => getHistoryDateSummaryApi(date),
  });

  const summary = data?.data || {};

  const day = summary.day_shift || {};
  const night = summary.night_shift || {};
  const total = summary.total || {};

  if (isLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      showsVerticalScrollIndicator={false}
    >
      <SummaryCard
        title="Day Shift"
        ms={day.total_ms_production_kg}
        gi={day.total_gi_production_kg}
        zinc={day.zinc_consumption}
      />

      <SummaryCard
        title="Night Shift"
        ms={night.total_ms_production_kg}
        gi={night.total_gi_production_kg}
        zinc={night.zinc_consumption}
      />

      <View style={styles.totalCard}>
        <Text style={styles.totalTitle}>Total Production</Text>

        <View style={styles.totalRow}>
          <InfoBox
            label="MS Production"
            value={`${total.total_ms_production_kg || 0} KG`}
          />

          <InfoBox
            label="GI Production"
            value={`${total.total_gi_production_kg || 0} KG`}
          />
        </View>

        <View style={styles.zincBox}>
          <Text style={styles.zincLabel}>Zinc Consumption</Text>

          <Text style={styles.zincValue}>{total.zinc_consumption || 0}%</Text>
        </View>
      </View>

      <View style={[styles.buttonGrid, isTablet && styles.buttonGridTablet]}>
        <MenuButton
          title="View Day Shift"
          isTablet={isTablet}
          onPress={() =>
            navigation.navigate('HistoryShiftTable', {
              date,
              shift_name: 'day',
            })
          }
        />

        <MenuButton
          title="View Night Shift"
          isTablet={isTablet}
          onPress={() =>
            navigation.navigate('HistoryShiftTable', {
              date,
              shift_name: 'night',
            })
          }
        />

        <MenuButton
          title="Material Summary"
          isTablet={isTablet}
          onPress={() =>
            navigation.navigate('HistoryMaterialSummary', { date })
          }
        />

        <MenuButton
          title="Planning Summary"
          isTablet={isTablet}
          onPress={() =>
            navigation.navigate('HistoryPlanningSummary', { date })
          }
        />
      </View>
    </ScrollView>
  );
}

function SummaryCard({ title, ms, gi, zinc }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.infoRow}>
        <InfoBox label="MS" value={`${ms || 0} KG`} />

        <InfoBox label="GI" value={`${gi || 0} KG`} />

        <InfoBox label="Zinc" value={`${zinc || 0}%`} />
      </View>
    </View>
  );
}

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuButton({ title, onPress, isTablet }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.menuButton, isTablet && styles.menuButtonTablet]}
      onPress={onPress}
    >
      <Text style={styles.menuButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },

  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },

  infoBox: {
    flex: 1,
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
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },

  totalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginTop: 5,
    elevation: 2,
  },

  totalTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },

  totalRow: {
    flexDirection: 'row',
    gap: 8,
  },

  zincBox: {
    marginTop: 12,
    alignItems: 'center',
  },

  zincLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },

  zincValue: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },

  buttonGrid: {
    marginTop: 16,
    gap: 10,
  },

  buttonGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  menuButton: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuButtonTablet: {
    flexGrow: 1,
    flexBasis: '45%',
  },

  menuButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
