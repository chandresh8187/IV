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

const ViewHistory = ({ route }) => {
  const { appliedFilters } = route?.params;
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['production-history', appliedFilters],
    queryFn: () => getProductionHistoryApi(appliedFilters),
  });
  const navigation = useNavigation();
  const history = data?.data;
  const summary = history?.summary || {};
  const materialSummary = history?.material_summary || [];
  const tableData = history?.table_data || [];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 15,
        paddingVertical: 10,
      }}
    >
      <View style={styles.summaryGrid}>
        <SummaryCard
          title="MS Production"
          value={`${summary.total_ms_production_kg || 0} kg`}
        />

        <SummaryCard
          title="GI Production"
          value={`${summary.total_gi_production_kg || 0} kg`}
        />

        <SummaryCard
          title="Zinc Kg"
          value={`${summary.zinc_consumption_kg || 0} kg`}
        />

        <SummaryCard
          title="Zinc %"
          value={`${summary.zinc_consumption_percentage || 0}%`}
        />
      </View>

      {/* <Text style={styles.blockTitle}>Material Summary</Text>

      {materialSummary.length === 0 ? (
        <Empty text="No material summary found" />
      ) : (
        materialSummary.map((item, index) => (
          <View key={`${item.material}-${index}`} style={styles.materialCard}>
            <Text style={styles.materialTitle}>{item.material}</Text>

            <InfoLine label="Date" value={item.shift_date} />
            <InfoLine label="Shift" value={item.shift_name} />
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
            <InfoLine
              label="Zinc %"
              value={`${item.zinc_consumption_percentage || 0}%`}
            />
          </View>
        ))
      )} */}
      <View
        style={{
          paddingTop: 20,
        }}
      >
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

function SummaryCard({ title, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function ButtonCard({ title, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 20,
      }}
      onPress={onPress}
    >
      <Text
        style={{
          color: '#0000FF',
          fontSize: 18,
          fontWeight: '500',
        }}
      >
        {title}
      </Text>
      <ChevronRight color={'#0000FF'} />
    </TouchableOpacity>
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

function Empty({ text }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },

  summaryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    elevation: 3,
  },

  summaryTitle: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },
  summaryValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },

  blockTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 12,
  },

  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },

  blockTitleNoMargin: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },

  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  fullBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
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
    marginBottom: 10,
  },

  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoLabel: { color: COLORS.gray, fontWeight: '700', fontSize: 13 },
  infoValue: { color: COLORS.text, fontWeight: '900', fontSize: 13 },
});
