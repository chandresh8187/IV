import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { formatDateForApi, parseDateForPicker } from '../../utils/format';
import { hasPermission } from '../../utils/permissions';
import {
  activeContractorRule,
  contractorWeight,
} from '../../utils/contractors';
import {
  createContractorApi,
  getContractorsApi,
  getContractorReportApi,
  saveContractorAssignmentApi,
} from '../../api/contractorApi';

function Button({ label, onPress, selected, disabled, primary }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        selected && styles.selected,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.white]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ContractorScreen() {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'contractors.view');
  const canManage = canView && hasPermission(user, 'contractors.manage');
  const client = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const [name, setName] = useState('');
  const [tab, setTab] = useState('report');
  const [unit, setUnit] = useState('kg');
  const [contractor, setContractor] = useState('all');
  const [shift, setShift] = useState('day');
  const [effective, setEffective] = useState(() =>
    formatDateForApi(new Date()),
  );
  const [assigned, setAssigned] = useState(undefined);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState({});
  const [picker, setPicker] = useState(null);
  const directory = useQuery({
    queryKey: ['contractors'],
    queryFn: getContractorsApi,
    enabled: canView,
  });
  const report = useQuery({
    queryKey: ['contractor-report', range],
    queryFn: () => getContractorReportApi(range),
    enabled: canView,
  });
  const contractors = directory.data?.data?.contractors || [];
  const assignments = directory.data?.data?.assignments || [];
  const result = report.data?.data;
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['contractors'] });
    client.invalidateQueries({ queryKey: ['contractor-report'] });
  };
  const onError = error => {
    refresh();
    Alert.alert(
      'Could not save',
      error?.response?.data?.message || 'Check your connection and try again.',
    );
  };
  const create = useMutation({
    mutationFn: createContractorApi,
    onError,
    onSuccess: () => {
      setName('');
      refresh();
    },
  });
  const save = useMutation({
    mutationFn: saveContractorAssignmentApi,
    onError,
    onSuccess: () => {
      refresh();
      Alert.alert('Saved', 'Repeating shift assignment updated.');
    },
  });
  const busy = create.isPending || save.isPending;
  const exactRule = assignments.find(
    rule => rule.shift_name === shift && rule.effective_from === effective,
  );
  const currentRule = activeContractorRule(assignments, shift, effective);
  const selectedContractor =
    assigned === undefined
      ? currentRule?.contractor_id == null
        ? null
        : Number(currentRule.contractor_id)
      : assigned;
  const saveRule = () => {
    const contractorName =
      contractors.find(item => Number(item.id) === selectedContractor)?.name ||
      'Unassigned';
    const payload = {
      shift_name: shift,
      effective_from: effective,
      contractor_id: selectedContractor,
      expected_id: exactRule ? Number(exactRule.id) : null,
      expected_contractor_id:
        exactRule?.contractor_id == null
          ? null
          : Number(exactRule.contractor_id),
    };
    Alert.alert(
      'Save repeating assignment?',
      `${shift.toUpperCase()} shifts from ${effective} will belong to ${contractorName}, until the next scheduled assignment. Existing production in that period will be attributed to this contractor. Earlier dates stay unchanged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save assignment', onPress: () => save.mutate(payload) },
      ],
    );
  };
  const match = row =>
    contractor === 'all' ||
    String(row.contractor_id ?? 'unassigned') === contractor;
  const summaries = (result?.summaries || []).filter(match);
  const shifts = (result?.shifts || []).filter(match);
  const pickerValue =
    picker === 'effective'
      ? effective
      : picker === 'from'
      ? from || result?.from
      : to || result?.to;
  if (!canView)
    return (
      <View style={styles.page}>
        <Text style={styles.body}>You do not have contractor access.</Text>
      </View>
    );

  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={directory.isRefetching || report.isRefetching}
          onRefresh={refresh}
        />
      }
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
    >
      <Text style={styles.eyebrow}>WORKFORCE / PRODUCTION</Text>
      <Text style={styles.title}>Contractor production</Text>
      <Text style={styles.body}>
        Repeating shift ownership, with production calculated from saved
        entries.
      </Text>
      <View style={styles.row}>
        <Button
          label="Production report"
          selected={tab === 'report'}
          onPress={() => setTab('report')}
        />
        <Button
          label="Shift assignments"
          selected={tab === 'assign'}
          onPress={() => setTab('assign')}
        />
      </View>
      {directory.isLoading && <ActivityIndicator color={COLORS.primary} />}
      {directory.isError && (
        <Button
          label="Could not load contractors · Retry"
          onPress={() => directory.refetch()}
        />
      )}

      {tab === 'assign' ? (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>Repeating assignments</Text>
            <Text style={styles.body}>
              Each rule starts on its production date, including Night shifts
              that end the following morning. No need to assign every day.
            </Text>
            {['day', 'night'].map(value => {
              const rule = activeContractorRule(
                assignments,
                value,
                formatDateForApi(new Date()),
              );
              return (
                <View key={value} style={styles.rule}>
                  <Text style={styles.heading}>
                    {value.toUpperCase()} SHIFT · TODAY
                  </Text>
                  <Text style={styles.body}>
                    {rule?.contractor_name || 'Unassigned'}
                    {rule ? ` · since ${rule.effective_from}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
          {canManage && (
            <>
              <View style={styles.card}>
                <Text style={styles.heading}>Add contractor</Text>
                <TextInput
                  accessibilityLabel="Contractor name"
                  placeholder="Contractor / company name"
                  placeholderTextColor={COLORS.muted}
                  value={name}
                  onChangeText={setName}
                  maxLength={120}
                  style={styles.input}
                  editable={!busy}
                />
                <Button
                  primary
                  label={create.isPending ? 'Adding…' : 'Add contractor'}
                  disabled={busy || !name.trim()}
                  onPress={() => create.mutate(name.trim())}
                />
                {!contractors.length && !directory.isLoading && (
                  <Text style={styles.body}>
                    Add your two contractors here, then assign their shifts
                    below.
                  </Text>
                )}
              </View>
              <View style={styles.card}>
                <Text style={styles.heading}>Assign repeating shift</Text>
                <View style={styles.row}>
                  {['day', 'night'].map(value => (
                    <Button
                      key={value}
                      label={`${value.toUpperCase()} shift`}
                      selected={shift === value}
                      onPress={() => {
                        setShift(value);
                        setAssigned(
                          activeContractorRule(assignments, value, effective)
                            ?.contractor_id ?? null,
                        );
                      }}
                    />
                  ))}
                </View>
                <Button
                  label={`Effective from: ${effective}`}
                  onPress={() => setPicker('effective')}
                />
                <Text style={styles.body}>
                  Currently assigned for this date:{' '}
                  {currentRule?.contractor_name || 'Unassigned'}
                </Text>
                <Text style={styles.label}>Assign to</Text>
                <View style={styles.row}>
                  {contractors.map(item => (
                    <Button
                      key={item.id}
                      label={item.name}
                      selected={selectedContractor === Number(item.id)}
                      onPress={() => setAssigned(Number(item.id))}
                    />
                  ))}
                  <Button
                    label="Unassigned"
                    selected={selectedContractor === null}
                    onPress={() => setAssigned(null)}
                  />
                </View>
                <Button
                  primary
                  label={
                    save.isPending ? 'Saving…' : 'Save repeating assignment'
                  }
                  disabled={busy || directory.isError || directory.isLoading}
                  onPress={saveRule}
                />
              </View>
            </>
          )}
          <View style={styles.card}>
            <Text style={styles.heading}>
              Assignment history & upcoming rules
            </Text>
            <Text style={styles.body}>
              A rule continues until the next effective date for the same shift.
            </Text>
            {!assignments.length && (
              <Text style={styles.body}>
                No assignments yet. Production remains unassigned.
              </Text>
            )}
            {assignments.map(rule => (
              <View key={rule.id} style={styles.rule}>
                <Text style={styles.heading}>
                  {rule.contractor_name || 'Unassigned'}
                </Text>
                <Text style={styles.body}>
                  {rule.shift_name.toUpperCase()} · from {rule.effective_from}
                </Text>
                {canManage && (
                  <Button
                    label="Edit this assignment"
                    disabled={busy}
                    onPress={() => {
                      setShift(rule.shift_name);
                      setEffective(rule.effective_from);
                      setAssigned(
                        rule.contractor_id == null
                          ? null
                          : Number(rule.contractor_id),
                      );
                      Alert.alert(
                        'Assignment selected',
                        'The assignment form above now contains this rule. Changes affect production from its effective date until the next rule.',
                      );
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>Production period</Text>
            <Text style={styles.body}>
              Current financial year
              {result ? ` · ${result.financial_year}` : ''}
            </Text>
            <View style={styles.row}>
              <Button
                label={`From: ${from || result?.from || 'Select date'}`}
                onPress={() => setPicker('from')}
              />
              <Button
                label={`To: ${to || result?.to || 'Select date'}`}
                onPress={() => setPicker('to')}
              />
            </View>
            <View style={styles.row}>
              <Button
                primary
                label="Fetch report"
                onPress={() => {
                  const start = from || result?.from;
                  const end = to || result?.to;
                  if (!start || !end || start > end)
                    return Alert.alert(
                      'Check dates',
                      'Choose a valid start and end date.',
                    );
                  setRange({ from: start, to: end });
                }}
              />
              <Button
                label="Full current year"
                onPress={() => {
                  setFrom('');
                  setTo('');
                  setRange({});
                }}
              />
            </View>
            <Text style={styles.label}>Contractor</Text>
            <View style={styles.row}>
              <Button
                label="All"
                selected={contractor === 'all'}
                onPress={() => setContractor('all')}
              />
              {contractors.map(item => (
                <Button
                  key={item.id}
                  label={item.name}
                  selected={contractor === String(item.id)}
                  onPress={() => setContractor(String(item.id))}
                />
              ))}
              <Button
                label="Unassigned"
                selected={contractor === 'unassigned'}
                onPress={() => setContractor('unassigned')}
              />
            </View>
            <View style={styles.row}>
              <Button
                label="Kilograms (kg)"
                selected={unit === 'kg'}
                onPress={() => setUnit('kg')}
              />
              <Button
                label="Tonnes (t)"
                selected={unit === 't'}
                onPress={() => setUnit('t')}
              />
            </View>
          </View>
          {report.isFetching && <ActivityIndicator color={COLORS.primary} />}
          {report.isError ? (
            <View style={styles.card}>
              <Text style={styles.body}>
                {report.error?.response?.data?.message ||
                  'Could not load the report.'}
              </Text>
              <Button label="Retry" onPress={() => report.refetch()} />
            </View>
          ) : (
            result && (
              <>
                <Text style={styles.heading}>
                  Showing {result.from} — {result.to}
                </Text>
                {!shifts.length && (
                  <View style={styles.card}>
                    <Text style={styles.heading}>
                      No production in this period
                    </Text>
                    <Text style={styles.body}>
                      Select another contractor or period. Assignment alone does
                      not create production.
                    </Text>
                  </View>
                )}
                {summaries.map(item => (
                  <View
                    key={item.contractor_id ?? 'unassigned'}
                    style={styles.card}
                  >
                    <Text style={styles.heading}>{item.contractor_name}</Text>
                    <View style={styles.row}>
                      <View style={styles.metric}>
                        <Text style={styles.label}>GI PRODUCTION</Text>
                        <Text style={styles.value}>
                          {contractorWeight(item.gi_kg, unit)} {unit}
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <Text style={styles.label}>MS PRODUCTION</Text>
                        <Text style={styles.value}>
                          {contractorWeight(item.ms_kg, unit)} {unit}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.body}>
                      {item.shift_count} shifts with production · {item.qty} nos
                      · {item.entry_count} entries
                    </Text>
                  </View>
                ))}
                {!!shifts.length && (
                  <View style={styles.card}>
                    <Text style={styles.heading}>
                      Date-wise shift breakdown
                    </Text>
                    {shifts.map(item => (
                      <View
                        key={`${item.shift_date}-${item.shift_name}-${item.contractor_id}`}
                        style={styles.rule}
                      >
                        <Text style={styles.heading}>
                          {item.shift_date} · {item.shift_name.toUpperCase()}
                        </Text>
                        <Text style={styles.body}>
                          {item.contractor_name} · {item.qty} nos
                        </Text>
                        <Text style={styles.production}>
                          GI {contractorWeight(item.gi_kg, unit)} {unit} / MS{' '}
                          {contractorWeight(item.ms_kg, unit)} {unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.body}>
                  Weight = unit weight × produced quantity for each entry. 1
                  tonne = 1,000 kg. Corrections are reflected automatically.
                </Text>
              </>
            )
          )}
        </>
      )}
      {picker && (
        <DateTimePicker
          mode="date"
          value={parseDateForPicker(
            pickerValue || formatDateForApi(new Date()),
          )}
          onChange={(event, value) => {
            const target = picker;
            setPicker(null);
            if (event.type !== 'set' || !value) return;
            const date = formatDateForApi(value);
            if (target === 'effective') {
              setEffective(date);
              setAssigned(
                activeContractorRule(assignments, shift, date)?.contractor_id ??
                  null,
              );
            } else if (target === 'from') setFrom(date);
            else setTo(date);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40, gap: 16 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  title: { fontSize: 27, fontWeight: '700', color: COLORS.text },
  heading: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  body: { fontSize: 13, lineHeight: 21, color: COLORS.gray },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.gray, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.white,
    minHeight: 46,
  },
  buttonText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  selected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  primary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  white: { color: COLORS.white },
  disabled: { opacity: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  rule: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: COLORS.surfaceMuted,
    padding: 14,
    borderRadius: UI.radiusSmall,
    gap: 8,
  },
  value: { fontSize: 23, fontWeight: '700', color: COLORS.primary },
  production: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
});
