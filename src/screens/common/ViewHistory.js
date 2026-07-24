import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { getProductionHistoryApi } from './../../api/historyApi';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../../assets/Colors';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import {
  centeredContent,
  gridItemWidth,
  useResponsive,
} from '../../utils/responsive';

const ViewHistory = ({ route }) => {
  const { appliedFilters } = route?.params || {};
  const { isTablet, contentMaxWidth } = useResponsive();
  const summaryCardWidth = gridItemWidth(2, 4, isTablet);

  const { data } = useQuery({
    queryKey: ['production-history', appliedFilters],
    queryFn: () => getProductionHistoryApi(appliedFilters),
  });
  const navigation = useNavigation();
  const history = data?.data;
  const summary = history?.summary || {};
  const tableData = history?.table_data || [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        centeredContent(contentMaxWidth),
      ]}
    >
      <View style={styles.summaryGrid}>
        <SummaryCard
          title="MS Production"
          value={`${Math.round(summary.total_ms_production_kg) || 0} kg`}
          width={summaryCardWidth}
        />

        <SummaryCard
          title="GI Production"
          value={`${Math.round(summary.total_gi_production_kg) || 0} kg`}
          width={summaryCardWidth}
        />

        <SummaryCard
          title="Zinc Kg"
          value={`${Math.round(summary.zinc_consumption_kg) || 0} kg`}
          width={summaryCardWidth}
        />

        <SummaryCard
          title="Zinc %"
          value={`${summary.zinc_consumption_percentage || 0}%`}
          width={summaryCardWidth}
        />
      </View>

      <View style={styles.buttonWrap}>
        <ButtonCard
          title={'View Production Report'}
          onPress={() => {
            navigation.navigate('ViewReport', {
              tableData: tableData,
            });
          }}
        />
      </View>
    </ScrollView>
  );
};

export default ViewHistory;

function SummaryCard({ title, value, width }) {
  return (
    <View style={[styles.summaryCard, { width }]}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ButtonCard({ title, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.buttonCard}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
      <ChevronRight color={COLORS.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  screenContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },

  summaryTitle: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },

  buttonWrap: {
    paddingTop: 20,
  },

  buttonCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },

  buttonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
