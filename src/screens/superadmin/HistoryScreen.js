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
  const today = formatDate(new Date());

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
    shift_name: '',
    material: '',
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [datePicker, setDatePicker] = useState({
    visible: false,
    type: null,
    value: dayjs(today),
  });

  const [fullTableVisible, setFullTableVisible] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['production-history', appliedFilters],
    queryFn: () => getProductionHistoryApi(appliedFilters),
  });

  const history = data?.data;
  const summary = history?.summary || {};
  const materialSummary = history?.material_summary || [];
  const tableData = history?.table_data || [];

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openDatePicker = type => {
    setDatePicker({
      visible: true,
      type,
      value: dayjs(filters[type]),
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

    if (!selectedDate || !datePicker.type) {
      return;
    }

    const finalDate = formatDate(selectedDate);

    updateFilter(datePicker.type, finalDate);

    setDatePicker(prev => ({
      ...prev,
      value: dayjs(selectedDate),
    }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const fresh = {
      from_date: today,
      to_date: today,
      shift_name: '',
      material: '',
    };

    setFilters(fresh);
    setAppliedFilters(fresh);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
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

          <TouchableOpacity onPress={() => openDatePicker('from_date')}>
            <TextInput
              label="From Date"
              value={filters.from_date}
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

          <TouchableOpacity onPress={() => openDatePicker('to_date')}>
            <TextInput
              label="To Date"
              value={filters.to_date}
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
              title="All"
              active={filters.shift_name === ''}
              onPress={() => updateFilter('shift_name', '')}
            />

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
                    filters.shift_name === 'night'
                      ? COLORS.white
                      : COLORS.primary
                  }
                />
              }
              onPress={() => updateFilter('shift_name', 'night')}
            />
          </View>

          <TextInput
            label="Material Search"
            value={filters.material}
            onChangeText={v => updateFilter('material', v)}
            mode="outlined"
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
          />

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

        {isLoading ? (
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

            <View style={styles.blockHeader}>
              <Text style={styles.blockTitleNoMargin}>Production Entries</Text>

              <TouchableOpacity
                style={styles.fullBtn}
                onPress={() => setFullTableVisible(true)}
              >
                <Maximize2 size={18} color={COLORS.primary} />
                <Text style={styles.fullBtnText}>Full Screen</Text>
              </TouchableOpacity>
            </View>

            <HistoryTable tableData={tableData} />
          </>
        )}
      </ScrollView>

      <DatePickerModal
        visible={datePicker.visible}
        value={datePicker.value}
        onChange={handleDateChange}
        onClose={closeDatePicker}
      />

      <Modal visible={fullTableVisible} animationType="slide">
        <SafeAreaView style={styles.fullSafe}>
          <View style={styles.fullHeader}>
            <Text style={styles.fullTitle}>Production Entries</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFullTableVisible(false)}
            >
              <X size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fullBody}>
            <HistoryTable tableData={tableData} fullScreen />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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

function HistoryTable({ tableData, fullScreen = false }) {
  return (
    <View style={[styles.tableCard, fullScreen && styles.fullTableCard]}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <ScrollView style={fullScreen && styles.fullVerticalScroll}>
          <View>
            <View style={styles.tableHeader}>
              <HeaderCell width={90}>Date</HeaderCell>
              <HeaderCell width={70}>Shift</HeaderCell>
              <HeaderCell width={55}>Sr</HeaderCell>
              <HeaderCell width={90}>Challan</HeaderCell>
              <HeaderCell width={150}>Party</HeaderCell>
              <HeaderCell width={150}>Material</HeaderCell>
              <HeaderCell width={80}>Qty</HeaderCell>
              <HeaderCell width={90}>MS</HeaderCell>
              <HeaderCell width={90}>GI</HeaderCell>
              <HeaderCell width={90}>Zn %</HeaderCell>
              <HeaderCell width={90}>Avg</HeaderCell>
            </View>

            {tableData.length === 0 ? (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyText}>No entries found</Text>
              </View>
            ) : (
              tableData.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.tableRow, index % 2 === 1 && styles.altRow]}
                >
                  <Cell width={90}>{item.shift_date}</Cell>
                  <Cell width={70}>{item.shift_name}</Cell>
                  <Cell width={55} bold>
                    {item.sr_no}
                  </Cell>
                  <Cell width={90}>{item.challan_no || '-'}</Cell>
                  <Cell width={150}>{item.party_name || '-'}</Cell>
                  <Cell width={150}>{item.material || '-'}</Cell>
                  <Cell width={80}>{item.dipping_qty || '-'}</Cell>
                  <Cell width={90}>{item.ms_weight || '-'}</Cell>
                  <Cell width={90}>{item.gi_weight || '-'}</Cell>
                  <Cell width={90}>{item.zinc_percentage || '-'}</Cell>
                  <Cell width={90}>
                    {item.avg_coating
                      ? Math.round(Number(item.avg_coating))
                      : '-'}
                  </Cell>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
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

function SummaryCard({ title, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
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

function HeaderCell({ children, width }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );
}

function Cell({ children, width, bold }) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text
        style={[styles.cellText, bold && styles.boldCell]}
        numberOfLines={2}
      >
        {children}
      </Text>
    </View>
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

  loaderBox: { padding: 40 },

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

  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    elevation: 2,
  },

  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
  },

  fullTableCard: {
    flex: 1,
    height: '100%',
  },

  fullVerticalScroll: {
    flex: 1,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },

  headerCell: {
    height: 50,
    borderRightWidth: 1,
    borderRightColor: '#3A4375',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  headerCellText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  altRow: { backgroundColor: '#FAFBFD' },

  cell: {
    minHeight: 54,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  cellText: { color: COLORS.text, fontSize: 12, textAlign: 'center' },
  boldCell: { fontWeight: '900', color: COLORS.primary },

  emptyTable: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: { color: COLORS.gray, fontWeight: '700' },

  fullSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  fullHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  fullTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  fullBody: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.bg,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
