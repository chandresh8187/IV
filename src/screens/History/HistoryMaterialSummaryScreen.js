import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { FileDown } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { getHistoryMaterialSummaryApi } from '../../api/historyApi';
import {
  centeredContent,
  gridItemWidth,
  useResponsive,
} from '../../utils/responsive';
import { formatQuantity, formatWeight } from '../../utils/format';

import { COLORS } from '../../assets/Colors';
import { downloadProductionReport } from '../../utils/serverProductionReport';
import { hasPermission } from '../../utils/permissions';

export default function HistoryMaterialSummaryScreen({ route, navigation }) {
  const { date } = route.params;
  const { isTablet, contentMaxWidth } = useResponsive();
  const infoBoxWidth = gridItemWidth(2, 3, isTablet);
  const loggedUser = useSelector(state => state.auth.user);
  const canGenerateReports = hasPermission(loggedUser, 'reports.generate');
  const [downloading, setDownloading] = useState(null);

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
                value={`${formatQuantity(item.total_dip_qty)} Nos`}
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
            {canGenerateReports && (
              <TouchableOpacity
                style={styles.reportBtn}
                disabled={downloading === item.material}
                onPress={async () => {
                  setDownloading(item.material);
                  try {
                    const pdf = await downloadProductionReport({
                      type: 'material',
                      value: item.material,
                      date,
                    });
                    navigation.navigate('PdfViewer', {
                      ...pdf,
                      title: 'Material Report',
                    });
                  } catch (error) {
                    Alert.alert('Error', error?.response?.data?.message || error.message || 'Could not create report');
                  } finally {
                    setDownloading(null);
                  }
                }}
              >
                <FileDown size={17} color={COLORS.white} />
                <Text style={styles.reportBtnText}>
                  {downloading === item.material ? 'GENERATING...' : 'MATERIAL REPORT'}
                </Text>
              </TouchableOpacity>
            )}
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
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
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
  },

  materialName: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  reportBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 14,
  },
  reportBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
});
