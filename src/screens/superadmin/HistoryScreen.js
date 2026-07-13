import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import dayjs from 'dayjs';
import DateTimePicker from 'react-native-ui-datepicker';
import {
  CalendarDays,
  Filter,
  Search,
  Sun,
  Moon,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { centeredContent, useResponsive } from '../../utils/responsive';

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
  const { contentMaxWidth } = useResponsive();
  const today = formatDate(new Date());

  const [filters, setFilters] = useState({
    date: today,
    shift_name: 'day',
    material: '',
  });

  const [datePicker, setDatePicker] = useState({
    visible: false,
    value: dayjs(today),
  });

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
    setDatePicker(prev => ({
      ...prev,
      visible: false,
    }));
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
    navigation.navigate('ViewHistory', {
      appliedFilters: {
        date: filters.date,
        shift_name: filters.shift_name,
        material: filters.material,
      },
    });
  };

  const clearFilters = () => {
    setFilters({
      date: today,
      shift_name: 'day',
      material: '',
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        centeredContent(contentMaxWidth),
      ]}
    >
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

      <DatePickerModal
        visible={datePicker.visible}
        value={datePicker.value}
        onChange={handleDateChange}
        onClose={closeDatePicker}
      />
    </ScrollView>
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
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  screenContent: {
    padding: 16,
    paddingBottom: 32,
  },

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
    // Keep the calendar a comfortable size on tablets instead of
    // stretching the full window width.
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dateTitle: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },

  dateCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
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
