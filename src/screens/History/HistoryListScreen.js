import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';

import {
  getHistoryDatesApi,
  getHistoryDateSummaryApi,
} from '../../api/historyApi';
import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import { COLORS, UI } from '../../assets/Colors';
import { formatDateForApi, parseDateForPicker } from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function HistoryListScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateForApi(new Date()),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const yearQuery = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  const year = yearQuery.data?.data;
  const yearReady =
    Boolean(year?.start_date && year?.end_date) && !yearQuery.isError;
  const datesQuery = useQuery({
    queryKey: ['history-dates', year?.id],
    queryFn: getHistoryDatesApi,
    enabled: yearReady,
  });
  useEffect(() => {
    if (!yearReady) return;
    setSelectedDate(date =>
      date < year.start_date
        ? year.start_date
        : date > year.end_date
        ? year.end_date
        : date,
    );
  }, [yearReady, year?.start_date, year?.end_date]);

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);

    if (event?.type === 'set' && date) {
      setSelectedDate(formatDateForApi(date));
    }
  };

  const handleFetch = async (date = selectedDate) => {
    if (isFetching || !yearReady) return;
    if (date < year.start_date || date > year.end_date) return;

    setIsFetching(true);

    try {
      await queryClient.fetchQuery({
        queryKey: ['history-date-summary', date],
        queryFn: () => getHistoryDateSummaryApi(date),
        staleTime: 30_000,
      });

      if (mounted.current) navigation.navigate('HistoryDateDetails', { date });
    } catch (error) {
      if (!mounted.current) return;
      Alert.alert(
        'Unable to fetch history',
        error?.response?.data?.message ||
          'Production history could not be loaded. Please try again.',
      );
    } finally {
      if (mounted.current) setIsFetching(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          centeredContent(contentMaxWidth),
        ]}
      >
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <CalendarDays size={30} color={COLORS.accent} />
          </View>

          <Text style={styles.title}>Production archive</Text>
          <Text style={styles.label}>
            {yearReady
              ? `FINANCIAL YEAR ${year.financial_year}`
              : yearQuery.isLoading
              ? 'Loading financial year…'
              : 'Set a current financial year in Settings to view history.'}
          </Text>
          {yearQuery.isError && (
            <TouchableOpacity onPress={() => yearQuery.refetch()}>
              <Text style={styles.apiDate}>Retry loading current year</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.description}>
            Select the operating date to review shift entries, material output
            and challan progress.
          </Text>

          <Text style={styles.label}>PRODUCTION DATE</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.dateField}
            onPress={() => setShowDatePicker(true)}
            disabled={isFetching || !yearReady}
          >
            <CalendarDays size={21} color={COLORS.primary} />
            <View style={styles.dateTextWrap}>
              <Text style={styles.dateValue}>
                {parseDateForPicker(selectedDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.apiDate}>{selectedDate}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.fetchButton, isFetching && styles.buttonDisabled]}
            onPress={() => handleFetch()}
            disabled={isFetching || !yearReady}
          >
            {isFetching ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Search size={19} color={COLORS.white} />
            )}
            <Text style={styles.fetchButtonText}>
              {isFetching ? 'FETCHING...' : 'FETCH PRODUCTION'}
            </Text>
          </TouchableOpacity>
          {yearReady && (
            <View style={styles.archiveDates}>
              <Text style={styles.label}>
                PRODUCTION DATES · {year.financial_year}
              </Text>
              {datesQuery.isLoading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : datesQuery.isError ? (
                <TouchableOpacity onPress={() => datesQuery.refetch()}>
                  <Text style={styles.apiDate}>
                    Could not load dates. Tap to retry.
                  </Text>
                </TouchableOpacity>
              ) : (datesQuery.data?.data || []).length === 0 ? (
                <Text style={styles.description}>
                  No production recorded in this financial year.
                </Text>
              ) : (
                (datesQuery.data?.data || []).map(row => (
                  <TouchableOpacity
                    key={row.shift_date}
                    style={styles.archiveDateRow}
                    disabled={isFetching}
                    onPress={() => {
                      setSelectedDate(row.shift_date);
                      handleFetch(row.shift_date);
                    }}
                  >
                    <Text style={styles.dateValue}>
                      {parseDateForPicker(row.shift_date).toLocaleDateString(
                        'en-IN',
                      )}
                    </Text>
                    <Text style={styles.apiDate}>
                      {row.entry_count} entries · View shifts
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {showDatePicker && yearReady && (
        <DateTimePicker
          value={parseDateForPicker(selectedDate)}
          mode="date"
          display="default"
          minimumDate={parseDateForPicker(year.start_date)}
          maximumDate={parseDateForPicker(year.end_date)}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  archiveDates: { marginTop: 24 },
  archiveDateRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusLarge,
    borderWidth: 0,
    borderColor: COLORS.border,
    padding: 22,
    ...UI.shadow,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'left',
    marginTop: 16,
  },
  description: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'left',
    marginTop: 7,
    marginBottom: 24,
  },
  label: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  dateField: {
    minHeight: 64,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTextWrap: {
    flex: 1,
  },
  dateValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  apiDate: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  fetchButton: {
    minHeight: 54,
    backgroundColor: COLORS.primary,
    borderRadius: UI.radius,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  fetchButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
});
