import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import DateTimePicker from 'react-native-ui-datepicker';
import {
  CalendarDays,
  Filter,
  Maximize2,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react-native';

import { getProductionHistoryApi } from '../../api/historyApi';
import { useNavigation } from '@react-navigation/native';
const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
  inputBorder: '#B8C4D6',
  lightBlue: '#EEF7FD',
};

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

const formatDate = date => dayjs(date).format('YYYY-MM-DD');

export default function HistoryScreen() {
  const navigation = useNavigation();
  const today = formatDate(new Date());

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
    shift_name: 'day',
    material: '',
  });

  const [datePicker, setDatePicker] = useState({
    visible: false,
    type: null,
    value: dayjs(today),
  });

  // const tableData = history?.table_data || [];

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openDatePicker = () => {
    setDatePicker({
      visible: true,
      value: dayjs(filters.date),
    });
  };

  const closeDatePicker = () => {
    setDatePicker({
      visible: false,
      type: null,
      value: dayjs(),
    });
  };

  const handleDateChange = params => {
    const selectedDate = params?.date;

    if (!selectedDate) return;

    updateFilter('date', formatDate(selectedDate));

    setDatePicker(prev => ({
      ...prev,
      value: dayjs(selectedDate),
    }));
  };

  const applyFilters = () => {
    const finalFilters = {
      date: filters.date,
      shift_name: filters.shift_name,
      material: filters.material,
    };

    navigation.navigate('ViewHistory', {
      appliedFilters: finalFilters,
    });
  };

  const clearFilters = () => {
    const fresh = {
      date: today,
      shift_name: 'day',
      material: '',
    };

    setFilters(fresh);
  };

  return (
    <>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Production History</Text>
          <Text style={styles.description}>
            Date, shift and material wise report
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <CalendarDays size={24} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.sectionHeader}>
          <Filter size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Filters</Text>
        </View>

        <TouchableOpacity onPress={openDatePicker}>
          <TextInput
            label="Select Date"
            value={filters.date}
            mode="outlined"
            editable={false}
            pointerEvents="none"
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
            right={<TextInput.Icon icon="calendar" />}
          />
        </TouchableOpacity>

        <View style={styles.shiftRow}>
          <ShiftButton
            title="Day"
            active={filters.shift_name === 'day'}
            icon={
              <Sun
                size={16}
                color={
                  filters.shift_name === 'day' ? COLORS.white : COLORS.primary
                }
              />
            }
            onPress={() => updateFilter('shift_name', 'day')}
          />

          <ShiftButton
            title="Night"
            active={filters.shift_name === 'night'}
            icon={
              <Moon
                size={16}
                color={
                  filters.shift_name === 'night' ? COLORS.white : COLORS.primary
                }
              />
            }
            onPress={() => updateFilter('shift_name', 'night')}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.searchBtn} onPress={applyFilters}>
            <Search size={18} color={COLORS.white} />
            <Text style={styles.searchText}>SEARCH</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearText}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* {isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
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

            <Text style={styles.blockTitle}>Material Summary</Text>

            {materialSummary.length === 0 ? (
              <Empty text="No material summary found" />
            ) : (
              materialSummary.map((item, index) => (
                <View
                  key={`${item.material}-${index}`}
                  style={styles.materialCard}
                >
                  <Text style={styles.materialTitle}>{item.material}</Text>

                  <InfoLine label="Date" value={item.shift_date} />
                  <InfoLine label="Shift" value={item.shift_name} />
                  <InfoLine
                    label="Avg MS"
                    value={`${item.avg_ms_weight || 0} kg`}
                  />
                  <InfoLine
                    label="Avg GI"
                    value={`${item.avg_gi_weight || 0} kg`}
                  />
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
            )}
          </>
        )} */}

      <DatePickerModal
        visible={datePicker.visible}
        value={datePicker.value}
        onChange={handleDateChange}
        onClose={closeDatePicker}
      />
    </>
  );
}

function DatePickerModal({ visible, value, onChange, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.dateOverlay}>
        <View style={styles.dateCard}>
          <View style={styles.dateHeader}>
            <Text style={styles.dateTitle}>Select Date</Text>

            <TouchableOpacity style={styles.dateCloseBtn} onPress={onClose}>
              <X size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <DateTimePicker
            mode="single"
            date={value}
            onChange={onChange}
            styles={{
              selected: {
                backgroundColor: COLORS.primary,
                borderRadius: 99,
              },
              day_label: { color: COLORS.primary, fontWeight: 'bold' },
              selected_label: { color: COLORS.white },
              today_label: {
                color: COLORS.accent,
                fontWeight: 'bold',
              },
              weekday_label: {
                color: COLORS.primary,
                fontWeight: 'bold',
              },

              month_selector_label: {
                color: COLORS.primary,
                fontWeight: 'bold',
              },
              year_selector_label: {
                color: COLORS.primary,
                fontWeight: 'bold',
              },
            }}
          />

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ShiftButton({ title, active, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.shiftBtn, active && styles.shiftBtnActive]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.shiftBtnText, active && styles.shiftBtnTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 32 },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { color: COLORS.primary, fontSize: 26, fontWeight: '900' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },

  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 3,
    marginTop: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },

  shiftRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },

  shiftBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  shiftBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  shiftBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: 13 },
  shiftBtnTextActive: { color: COLORS.white },

  actionRow: { flexDirection: 'row', gap: 10 },

  searchBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  searchText: { color: COLORS.white, fontWeight: '900' },

  clearBtn: {
    width: 110,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearText: { color: COLORS.gray, fontWeight: '900' },

  dateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 18,
  },

  dateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 18,
    elevation: 12,
  },

  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dateTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  dateCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarText: {
    color: COLORS.text,
    fontWeight: '700',
  },

  calendarHeaderText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 17,
  },

  calendarWeekText: {
    color: COLORS.gray,
    fontWeight: '900',
  },

  calendarSelectedText: {
    color: COLORS.white,
    fontWeight: '900',
  },

  todayContainer: {
    borderColor: COLORS.accent,
    borderWidth: 1,
  },

  todayText: {
    color: COLORS.accent,
    fontWeight: '900',
  },

  monthYearContainer: {
    borderRadius: 14,
    backgroundColor: COLORS.lightBlue,
  },

  doneBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  doneText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
