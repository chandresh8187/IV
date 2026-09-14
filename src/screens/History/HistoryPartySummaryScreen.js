import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getHistoryPartySummaryApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import { formatQuantity, formatWeight } from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';
import ResponsiveGrid from '../../components/ResponsiveGrid';

export default function HistoryPartySummaryScreen({ route }) {
  const { date, shift_name } = route.params;
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['history-party-summary', date, shift_name || 'all'],
    queryFn: () => getHistoryPartySummaryApi({ date, shift_name }),
  });
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    >
      <Text style={styles.title}>Party-wise material output</Text>
      <Text style={styles.subtitle}>
        {date} ·{' '}
        {shift_name ? `${shift_name.toUpperCase()} SHIFT` : 'BOTH SHIFTS'}
      </Text>
      <Text style={styles.description}>
        Produced quantities are separated by party and planning material. The
        same material from different parties is not combined.
      </Text>
      <ResponsiveGrid>
        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : isError ? (
          <TouchableOpacity style={styles.card} onPress={refetch}>
            <Text style={styles.material}>Could not load party summary</Text>
            <Text style={styles.description}>Tap to retry.</Text>
          </TouchableOpacity>
        ) : !data?.data?.length ? (
          <View style={styles.card}>
            <Text style={styles.material}>No production for this shift</Text>
          </View>
        ) : (
          data.data.map(row => (
            <View
              key={JSON.stringify([
                row.party_name,
                row.item_id,
                row.material_name,
              ])}
              style={styles.card}
            >
              <Text style={styles.party}>{row.party_name}</Text>
              <Text style={styles.material}>{row.material_name}</Text>
              <View style={styles.output}>
                <Text style={styles.label}>Produced quantity</Text>
                <Text style={styles.quantity}>
                  {formatQuantity(row.total_production_qty)} NOS
                </Text>
              </View>
              <View style={styles.metrics}>
                <Text style={styles.metric}>
                  MS: {formatWeight(row.total_ms_production_kg)} KG
                </Text>
                <Text style={styles.metric}>
                  GI: {formatWeight(row.total_gi_production_kg)} KG
                </Text>
                <Text style={styles.metric}>
                  Zinc used: {formatWeight(row.zink_used)} KG
                </Text>
                <Text style={styles.metric}>
                  Zinc: {formatWeight(row.zinc_consumption)}%
                </Text>
              </View>
            </View>
          ))
        )}
      </ResponsiveGrid>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40 },
  title: { fontSize: 21, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.primary, marginTop: 8 },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.gray,
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    marginBottom: 14,
  },
  party: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  material: { fontSize: 14, color: COLORS.gray, marginTop: 6 },
  output: {
    backgroundColor: COLORS.accentSoft,
    padding: 14,
    borderRadius: UI.radiusSmall,
    marginTop: 16,
  },
  label: { fontSize: 12, color: COLORS.gray },
  quantity: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  metric: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.text,
    flexBasis: '45%',
    flexGrow: 1,
  },
});
