import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import { getHistoryShiftTableApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import ProductionTable from '../../components/ProductionTable';
import { deleteProductionApi } from '../../api/productionApi';
import { hasPermission } from '../../utils/permissions';

export default function HistoryFullTableScreen({ route, navigation }) {
  const { date, shift_name } = route.params;
  const user = useSelector(state => state.auth.user);
  const canManage = hasPermission(user, 'production.manage_all');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['history-shift-table', date, shift_name],
    queryFn: () => getHistoryShiftTableApi({ date, shift_name }),
  });
  const tableData = data?.data?.table_data || [];

  const renderAction =
    canManage
      ? item => (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('HistoricalProductionEdit', { item, date, shift_name })}
            ><Text style={styles.editBtnText}>EDIT</Text></TouchableOpacity>
            <TouchableOpacity
              style={[styles.editBtn, styles.deleteBtn]}
              onPress={() => Alert.alert('Delete production entry', `Delete SR ${item.sr_no}? Zinc stock and planning totals will be recalculated.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try {
                    await deleteProductionApi(item.id);
                    ['history-shift-table', 'history-dates', 'history-date-summary', 'productions', 'dashboard', 'contractor-report', 'zinc-stock', 'labour-weights'].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
                  } catch (error) {
                    Alert.alert('Could not delete entry', error?.response?.data?.message || 'Please try again.');
                  }
                } },
              ])}
            ><Text style={styles.deleteText}>DELETE</Text></TouchableOpacity>
          </View>
        )
      : undefined;

  if (isLoading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ProductionTable
        rows={tableData}
        shiftName={shift_name}
        renderAction={renderAction}
        scrollRows
        emptyMessage="No production found"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 6 },
  screen: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.bg,
  },
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  editBtn: {
    width: 64,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: { backgroundColor: COLORS.dangerSoft },
  deleteText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
});
