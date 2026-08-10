import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getHistoryDateSummaryApi } from '../../api/historyApi';
import { COLORS, UI } from '../../assets/Colors';
import { formatDateForApi, parseDateForPicker } from '../../utils/format';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function HistoryListScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateForApi(new Date()),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);

    if (event?.type === 'set' && date) {
      setSelectedDate(formatDateForApi(date));
    }
  };

  const handleFetch = async () => {
    if (isFetching) return;

    setIsFetching(true);

    try {
      await queryClient.fetchQuery({
        queryKey: ['history-date-summary', selectedDate],
        queryFn: () => getHistoryDateSummaryApi(selectedDate),
        staleTime: 30_000,
      });

      navigation.navigate('HistoryDateDetails', { date: selectedDate });
    } catch (error) {
      Alert.alert(
        'Unable to fetch history',
        error?.response?.data?.message ||
          'Production history could not be loaded. Please try again.',
      );
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.content, centeredContent(contentMaxWidth)]}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <CalendarDays size={30} color={COLORS.accent} />
          </View>

          <Text style={styles.title}>Select Production Date</Text>
          <Text style={styles.description}>
            Choose a date to view its day and night production details.
          </Text>

          <Text style={styles.label}>PRODUCTION DATE</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.dateField}
            onPress={() => setShowDatePicker(true)}
            disabled={isFetching}
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
            onPress={handleFetch}
            disabled={isFetching}
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
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={parseDateForPicker(selectedDate)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    ...UI.shadow,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  description: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
    marginBottom: 24,
  },
  label: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '800',
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
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  apiDate: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  fetchButton: {
    height: 54,
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
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
