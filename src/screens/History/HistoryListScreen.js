import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react-native';

import { getHistoryDatesApi } from '../../api/historyApi';
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

export default function HistoryListScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { contentMaxWidth } = useResponsive();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['history-dates'],
    queryFn: getHistoryDatesApi,
  });

  const historyDates = data?.data || [];

  const filteredDates = historyDates.filter(item =>
    String(item.shift_date).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, styles.safe]}>
      <View
        style={[
          {
            paddingHorizontal: 16,
            paddingTop: 16,
          },
          centeredContent(contentMaxWidth),
        ]}
      >
        <View style={styles.searchCard}>
          <Search size={20} color={COLORS.gray} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search date..."
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={styles.searchInput}
            textColor={COLORS.text}
            placeholderTextColor={COLORS.gray}
            theme={PAPER_THEME}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            centeredContent(contentMaxWidth),
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          {filteredDates.length === 0 ? (
            <View style={styles.emptyCard}>
              <CalendarDays size={34} color={COLORS.gray} />
              <Text style={styles.emptyText}>No production history found</Text>
            </View>
          ) : (
            filteredDates.map(item => (
              <TouchableOpacity
                key={item.shift_date}
                activeOpacity={0.85}
                style={styles.dateCard}
                onPress={() =>
                  navigation.navigate('HistoryDateDetails', {
                    date: item.shift_date,
                  })
                }
              >
                <View style={styles.iconBox}>
                  <CalendarDays size={24} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.dateText}>{item.shift_date}</Text>

                  <Text style={styles.metaText}>
                    Day + Night production report
                  </Text>

                  <View style={styles.summaryRow}>
                    <MiniInfo
                      label="MS"
                      value={`${item.total_ms_production_kg || 0} KG`}
                    />
                    <MiniInfo
                      label="GI"
                      value={`${item.total_gi_production_kg || 0} KG`}
                    />
                    <MiniInfo
                      label="Zinc"
                      value={`${item.zinc_consumption || 0}%`}
                    />
                  </View>
                </View>

                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function MiniInfo({ label, value }) {
  return (
    <View style={styles.miniBox}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
  },

  searchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    height: 50,
  },

  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },

  listContent: {
    paddingTop: 14,
    paddingBottom: 30,
    padding: 16,
  },

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
    marginTop: 10,
  },

  dateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },

  metaText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  miniBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 8,
  },

  miniLabel: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '800',
  },

  miniValue: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  arrow: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '800',
  },
});
