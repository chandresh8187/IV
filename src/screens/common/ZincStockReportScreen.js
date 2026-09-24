import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getZincMovementsApi } from '../../api/zincStockApi';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { zincKg } from '../../utils/zincStock';
import { downloadZincStockReport } from '../../utils/serverZincStockReport';

const labels = {
  initialize: 'Opening stock',
  adjust: 'Stock balance correction',
  receive: 'Zinc received in plant',
  transfer: 'Zinc added to kettle',
  production_use: 'Production zinc consumed',
  production_restore: 'Production zinc restored',
};

const loadAllMovements = async () => {
  const data = [];
  let page = 1;
  for (;;) {
    const response = await getZincMovementsApi({ page, limit: 200 });
    const batch = response?.data || [];
    data.push(...batch);
    if (!response?.pagination?.has_more) break;
    page += 1;
  }
  return data;
};

export default function ZincStockReportScreen({ navigation }) {
  const [generating, setGenerating] = useState(false);
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canGeneratePdf = hasPermission(user, 'zinc_stock.report');
  const { contentMaxWidth } = useResponsive();
  const query = useQuery({
    queryKey: ['zinc-stock-movements', 'all'],
    queryFn: loadAllMovements,
    enabled: canView,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (canView) refetch();
    }, [canView, refetch]),
  );
  const generatePdf = async () => {
    setGenerating(true);
    try {
      const pdf = await downloadZincStockReport();
      navigation.navigate('PdfViewer', { ...pdf, title: 'Zinc Stock Report' });
    } catch (error) {
      Alert.alert(
        'Could not generate PDF',
        error?.response?.data?.message || error?.message || 'Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  if (!canView) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You do not have zinc stock access.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={refetch} />
      }
    >
      <Text style={styles.title}>Zinc Stock Report</Text>
      <Text style={styles.muted}>
        Complete history of zinc receipts, kettle additions, corrections, and production use.
      </Text>
      {canGeneratePdf && (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.pdfButton, generating && styles.disabled]}
          disabled={generating || query.isLoading || query.isError}
          onPress={generatePdf}
        >
          {generating ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.pdfButtonText}>Generate PDF Report</Text>
          )}
        </TouchableOpacity>
      )}
      {query.isLoading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : query.isError ? (
        <View style={styles.card}>
          <Text style={styles.error}>
            {query.error?.response?.data?.message || 'Could not load zinc transactions.'}
          </Text>
          <TouchableOpacity onPress={refetch} accessibilityRole="button">
            <Text style={styles.link}>Retry report</Text>
          </TouchableOpacity>
        </View>
      ) : query.data?.length ? (
        query.data.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.heading}>
                {labels[item.movement_type] || item.movement_type}
              </Text>
              {!['initialize', 'adjust'].includes(item.movement_type) && (
                <Text style={styles.amount}>{zincKg(item.amount_kg)} kg</Text>
              )}
            </View>
            <Text style={styles.muted}>
              Plant {zincKg(item.plant_after_kg)} kg · Kettle {zincKg(item.kettle_after_kg)} kg
            </Text>
            {item.zinc_rate_per_kg != null ? <Text style={styles.muted}>Purchase rate: ₹{Number(item.zinc_rate_per_kg).toFixed(2)} / kg</Text> : null}
            <Text style={styles.muted}>
              {item.created_at} · {item.actor_name || 'User'}
            </Text>
            {item.production_entry_id ? (
              <Text style={styles.muted}>Production entry #{item.production_entry_id}</Text>
            ) : null}
            {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          </View>
        ))
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>No zinc transactions have been recorded yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '700' },
  heading: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  amount: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  note: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16, gap: 6 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  error: { color: COLORS.danger, fontSize: 14 },
  link: { color: COLORS.accent, fontWeight: '700' },
  pdfButton: {
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButtonText: { color: COLORS.white, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
