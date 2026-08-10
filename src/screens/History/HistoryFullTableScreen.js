import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import { getHistoryShiftTableApi } from '../../api/historyApi';
import { COLORS } from '../../assets/Colors';
import ProductionTable from '../../components/ProductionTable';

export default function HistoryFullTableScreen({ route, navigation }) {
  const { date, shift_name } = route.params;
  const role = String(
    useSelector(state => state.auth.user?.role) || '',
  ).toLowerCase();
  const { data, isLoading } = useQuery({
    queryKey: ['history-shift-table', date, shift_name],
    queryFn: () => getHistoryShiftTableApi({ date, shift_name }),
  });
  const tableData = data?.data?.table_data || [];

  const renderAction =
    role === 'superadmin'
      ? item => (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('HistoricalProductionEdit', {
                item,
                date,
                shift_name,
              })
            }
          >
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
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
        renderAction={renderAction}
        scrollRows
        emptyMessage="No production found"
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
