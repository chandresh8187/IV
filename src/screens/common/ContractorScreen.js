import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import DropDownPicker from 'react-native-dropdown-picker';
import { getContractProductionApi } from '../../api/contractorApi';
import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import { COLORS, UI } from '../../assets/Colors';
import { contractorWeight } from '../../utils/contractors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const indiaMonth = () =>
  new Date(Date.now() + 330 * 60 * 1000).getUTCMonth() + 1;

function MonthlyProduction({ year }) {
  const [month, setMonth] = useState(indiaMonth);
  const [draftMonth, setDraftMonth] = useState(month);
  const [showPrevious, setShowPrevious] = useState(false);
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState('kg');
  const report = useQuery({
    queryKey: [
      'contractor-report',
      'selected-entries',
      year.id,
      year.financial_year,
      month,
    ],
    queryFn: () =>
      getContractProductionApi({ month, financial_year_id: year.id }),
    retry: false,
  });
  const { refetch } = report;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const data = report.data?.data;
  const startYear = Number(year.start_date.slice(0, 4));
  const items = Array.from({ length: 12 }, (_, index) => {
    const value = ((index + 3) % 12) + 1;
    return {
      value,
      label: `${MONTHS[value - 1]} ${startYear + (value < 4 ? 1 : 0)}`,
    };
  });
  const label = items.find(item => item.value === month)?.label;
  const renderTotals = totals => (
    <View style={styles.metrics}>
      <View style={styles.metric}>
        <Text style={styles.value}>{contractorWeight(totals.ms_kg, unit)}</Text>
        <Text style={styles.muted}>MS production ({unit})</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.value}>{contractorWeight(totals.gi_kg, unit)}</Text>
        <Text style={styles.muted}>GI production ({unit})</Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.value}>
          {Number(totals.qty).toLocaleString('en-IN')}
        </Text>
        <Text style={styles.muted}>Quantity (NOS)</Text>
      </View>
    </View>
  );
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.heading}>{label}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setUnit(unit === 'kg' ? 't' : 'kg')}
          style={styles.secondary}
        >
          <Text style={styles.link}>
            {unit === 'kg' ? 'Show tonnes' : 'Show kg'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowPrevious(value => !value)}
          style={styles.secondary}
        >
          <Text style={styles.link}>Fetch Previous Production</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => refetch()}
          disabled={report.isFetching}
          style={styles.secondary}
        >
          <Text style={styles.link}>
            {report.isFetching ? 'Refreshing…' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>
      {showPrevious && (
        <View style={styles.card}>
          <Text style={styles.heading}>Select month</Text>
          <DropDownPicker
            open={open}
            setOpen={setOpen}
            value={draftMonth}
            setValue={setDraftMonth}
            items={items}
            listMode="MODAL"
            modalTitle="Select production month"
            placeholder="Select month"
            style={styles.dropdown}
          />
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.button}
            disabled={report.isFetching}
            onPress={() => {
              setMonth(draftMonth);
              if (draftMonth === month) refetch();
            }}
          >
            <Text style={styles.buttonText}>Fetch Production</Text>
          </TouchableOpacity>
        </View>
      )}
      {report.isLoading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : report.isError ? (
        <View style={styles.card}>
          <Text style={styles.error}>
            {report.error?.response?.data?.message ||
              'Could not load contract production.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => refetch()}
          >
            <Text style={styles.link}>Retry production</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <>
          <View style={[styles.card, styles.totalCard]}>
            <Text style={styles.heading}>All contractors · Monthly total</Text>
            {renderTotals(data.totals)}
          </View>
          {data.summaries.map(contractor => (
            <View key={contractor.contractor_id} style={styles.card}>
              <Text style={styles.heading}>{contractor.contractor_name}</Text>
              {renderTotals(contractor)}
              <Text style={styles.muted}>
                {contractor.entry_count} production entries
              </Text>
            </View>
          ))}
          {!data.summaries.length && (
            <Text style={styles.muted}>
              No contractors added yet. Add contractors in Settings.
            </Text>
          )}
          {data.summaries.length > 0 && data.totals.entry_count === 0 && (
            <Text style={styles.muted}>
              No contractor production recorded for this month.
            </Text>
          )}
          <Text style={styles.muted}>
            Totals include entries with a selected contractor, using their
            production shift date.
          </Text>
        </>
      ) : null}
    </View>
  );
}

export default function ContractorScreen() {
  const { contentMaxWidth } = useResponsive();
  const yearQuery = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  const { refetch } = yearQuery;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const year = yearQuery.data?.data;
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    >
      <Text style={styles.title}>Contract Production</Text>
      {yearQuery.isLoading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : yearQuery.isError || !year?.start_date ? (
        <View style={styles.card}>
          <Text style={styles.error}>
            {yearQuery.error?.response?.data?.message ||
              'Set a current financial year in Settings > Financial Year.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => refetch()}
          >
            <Text style={styles.link}>Retry financial year</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.muted}>Financial year {year.financial_year}</Text>
          <Text style={styles.muted}>
            To view another year, change the current year in Settings >
            Financial Year.
          </Text>
          <MonthlyProduction
            key={`${year.id}:${year.financial_year}`}
            year={year}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 12, paddingBottom: 40 },
  section: { gap: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  heading: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    gap: 16,
  },
  totalCard: { borderWidth: 1, borderColor: COLORS.accent },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  metric: { minWidth: 120, flexGrow: 1, gap: 4 },
  value: { color: COLORS.text, fontSize: 21, fontWeight: '700' },
  secondary: {
    padding: 12,
    minHeight: 44,
    backgroundColor: COLORS.accentSoft,
    borderRadius: UI.radiusSmall,
  },
  link: { color: COLORS.accent, fontWeight: '600', paddingVertical: 4 },
  dropdown: { borderColor: COLORS.border },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: UI.radiusSmall,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  error: { color: COLORS.danger, lineHeight: 22 },
});
