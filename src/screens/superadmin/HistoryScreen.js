import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  CalendarDays,
  Filter,
  Search,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { centeredContent, useResponsive } from '../../utils/responsive';

import { COLORS } from '../../assets/Colors';
import { formatDateForApi, parseDateForPicker } from '../../utils/format';

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

export default function HistoryScreen() {
  const navigation = useNavigation();
  const { contentMaxWidth } = useResponsive();
  const today = formatDateForApi(new Date());

  const [filters, setFilters] = useState({
    date: today,
    shift_name: 'day',
    material: '',
  });

  const [datePicker, setDatePicker] = useState({
    visible: false,
    value: parseDateForPicker(today),
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openDatePicker = () => {
    setDatePicker({
      visible: true,
      value: parseDateForPicker(filters.date),
    });
  };

  const closeDatePicker = () => {
    setDatePicker(prev => ({
      ...prev,
      visible: false,
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    closeDatePicker();

    if (event?.type !== 'set' || !selectedDate) return;

    updateFilter('date', formatDateForApi(selectedDate));

    setDatePicker(prev => ({
      ...prev,
      value: parseDateForPicker(selectedDate),
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

      {datePicker.visible && (
        <DateTimePicker
          value={datePicker.value}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </ScrollView>
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
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { color: COLORS.primary, fontSize: 26, fontWeight: '800' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },

  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginTop: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },

  shiftRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },

  shiftBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
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

  shiftBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  shiftBtnTextActive: { color: COLORS.white },

  actionRow: { flexDirection: 'row', gap: 10 },

  searchBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  searchText: { color: COLORS.white, fontWeight: '800' },

  clearBtn: {
    width: 110,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearText: { color: COLORS.gray, fontWeight: '800' },

});
