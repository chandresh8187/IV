import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange,
  CheckCircle2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';

import {
  createFinancialYearApi,
  deleteFinancialYearApi,
  getFinancialYearsApi,
  getCurrentFinancialYearApi,
  setCurrentFinancialYearApi,
  updateFinancialYearApi,
} from '../../api/financialYearsApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const normalizeFinancialYear = value =>
  String(value || '')
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');

const validateFinancialYear = value => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return 'Use YYYY-YY format, for example 2026-27.';
  }

  const startYear = Number(match[1]);
  const expectedEnd = String((startYear + 1) % 100).padStart(2, '0');
  if (match[2] !== expectedEnd) {
    return `Ending year must be ${expectedEnd} for ${startYear}.`;
  }

  return '';
};

const formatCreatedDetails = record => {
  const details = [];

  if (record?.created_by_name) {
    details.push(`Added by ${record.created_by_name}`);
  }

  if (record?.created_at) {
    const date = new Date(record.created_at);
    if (!Number.isNaN(date.getTime())) {
      details.push(
        date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      );
    }
  }

  return details.join(' · ');
};

export default function FinancialYearScreen() {
  const { contentMaxWidth } = useResponsive();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [financialYear, setFinancialYear] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { data, isError, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['financial-years'],
    queryFn: getFinancialYearsApi,
  });
  const records = Array.isArray(data?.data) ? data.data : [];
  const currentYearQuery = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  const currentYearId =
    Number(currentYearQuery.data?.data?.is_current) === 1
      ? currentYearQuery.data.data.id
      : null;
  const currentMutation = useMutation({
    mutationFn: setCurrentFinancialYearApi,
    onSuccess: response => {
      queryClient.setQueryData(['current-financial-year'], response);
      queryClient.invalidateQueries({ queryKey: ['financial-years'] });
      queryClient.resetQueries({
        predicate: query => String(query.queryKey[0]).startsWith('history-'),
      });
      setSuccessMessage(response.message);
    },
    onError: error =>
      Alert.alert(
        'Could not change current year',
        error?.response?.data?.message || 'Please try again.',
      ),
  });
  const searchQuery = search.trim().toLowerCase();
  const visibleRecords = searchQuery
    ? records.filter(record =>
        String(record.financial_year || '')
          .toLowerCase()
          .includes(searchQuery),
      )
    : records;

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const finishSave = (response, fallbackMessage) => {
    Keyboard.dismiss();
    setFinancialYear('');
    setFormError('');
    setEditingRecord(null);
    setShowForm(false);
    setSuccessMessage(response?.message || fallbackMessage);
    queryClient.invalidateQueries({ queryKey: ['financial-years'] });
    queryClient.invalidateQueries({ queryKey: ['current-financial-year'] });
  };

  const handleSaveError = error => {
    setFormError(
      error?.response?.data?.message ||
        'The financial year could not be saved. Please try again.',
    );
  };

  const createMutation = useMutation({
    mutationFn: createFinancialYearApi,
    onSuccess: response =>
      finishSave(response, 'Financial year added successfully'),
    onError: handleSaveError,
  });

  const updateMutation = useMutation({
    mutationFn: updateFinancialYearApi,
    onSuccess: response =>
      finishSave(response, 'Financial year updated successfully'),
    onError: handleSaveError,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFinancialYearApi,
    onSuccess: response => {
      setSuccessMessage(
        response?.message || 'Financial year deleted successfully',
      );
      queryClient.invalidateQueries({ queryKey: ['financial-years'] });
    },
    onError: error => {
      Alert.alert(
        'Could not delete financial year',
        error?.response?.data?.message || 'Please try again.',
      );
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openForm = () => {
    setEditingRecord(null);
    setFinancialYear('');
    setFormError('');
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const openEditForm = record => {
    setEditingRecord(record);
    setFinancialYear(String(record?.financial_year || ''));
    setFormError('');
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    setShowForm(false);
    setEditingRecord(null);
    setFinancialYear('');
    setFormError('');
  };

  const confirmDelete = record => {
    closeForm();
    Alert.alert(
      'Delete financial year?',
      `“${record.financial_year}” will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(record.id),
        },
      ],
    );
  };

  const saveFinancialYear = () => {
    if (isSaving) return;

    const normalizedValue = normalizeFinancialYear(financialYear);
    const validationError = validateFinancialYear(normalizedValue);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    if (editingRecord) {
      updateMutation.mutate({
        id: editingRecord.id,
        financialYear: normalizedValue,
      });
    } else {
      createMutation.mutate(normalizedValue);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Pressable style={styles.touchArea} onPress={closeForm}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <CalendarRange size={23} color={COLORS.teal} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Financial year master</Text>
            <Text style={styles.summaryText}>
              {records.length
                ? `${records.length} saved ${
                    records.length === 1 ? 'year' : 'years'
                  }`
                : 'Create your financial year list'}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add financial year"
            activeOpacity={0.8}
            disabled={deleteMutation.isPending}
            style={styles.addButton}
            onPress={event => {
              event.stopPropagation();
              openForm();
            }}
          >
            <Plus size={18} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Year</Text>
          </TouchableOpacity>
        </View>

        {showForm ? (
          <Pressable
            style={styles.formCard}
            onPress={event => event.stopPropagation()}
          >
            <Text style={styles.formTitle}>
              {editingRecord ? 'Edit financial year' : 'Add financial year'}
            </Text>
            <TextInput
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              label="Financial year"
              placeholder="For example, 2026-27"
              mode="outlined"
              value={financialYear}
              onChangeText={value => {
                setFinancialYear(value);
                if (formError) setFormError('');
              }}
              maxLength={7}
              returnKeyType="done"
              onSubmitEditing={saveFinancialYear}
              error={Boolean(formError)}
              style={styles.input}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.teal}
              textColor={COLORS.text}
              theme={PAPER_THEME}
            />
            <View style={styles.inputMeta}>
              <Text style={styles.errorText}>{formError}</Text>
              <Text style={styles.characterCount}>
                {financialYear.length}/7
              </Text>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  editingRecord
                    ? 'Cancel editing financial year'
                    : 'Cancel adding financial year'
                }
                activeOpacity={0.75}
                disabled={isSaving}
                style={styles.cancelButton}
                onPress={closeForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  editingRecord
                    ? 'Update financial year'
                    : 'Save financial year'
                }
                activeOpacity={0.8}
                disabled={isSaving}
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={saveFinancialYear}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Save size={18} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>
                      {editingRecord ? 'Update Year' : 'Save Year'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}

        {successMessage ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={19} color={COLORS.success} />
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Dismiss success message"
              hitSlop={8}
              onPress={() => setSuccessMessage('')}
            >
              <X size={18} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          label="Search financial years"
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.teal}
          textColor={COLORS.text}
          theme={PAPER_THEME}
          left={<TextInput.Icon icon="magnify" color={COLORS.muted} />}
          right={
            search ? (
              <TextInput.Icon
                icon="close"
                color={COLORS.muted}
                forceTextInputFocus={false}
                onPress={() => setSearch('')}
              />
            ) : null
          }
        />

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>All financial years</Text>
          {!isLoading && !isError ? (
            <View style={styles.resultBadge}>
              <Text style={styles.resultText}>{visibleRecords.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={COLORS.teal} />
              <Text style={styles.stateText}>Loading financial years...</Text>
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}>
                <CalendarRange size={28} color={COLORS.danger} />
              </View>
              <Text style={styles.stateTitle}>
                Could not load financial years
              </Text>
              <Text style={styles.stateText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : visibleRecords.length ? (
            visibleRecords.map((record, index) => {
              const details = formatCreatedDetails(record);
              const isDeleting =
                deleteMutation.isPending &&
                Number(deleteMutation.variables) === Number(record.id);

              return (
                <View
                  key={record.id}
                  style={[
                    styles.recordRow,
                    index < visibleRecords.length - 1 && styles.recordRowBorder,
                  ]}
                >
                  <View style={styles.recordHeader}>
                    <View style={styles.recordIcon}>
                      <CalendarRange size={20} color={COLORS.teal} />
                    </View>
                    <View style={styles.recordCopy}>
                      <Text style={styles.recordName}>
                        {record.financial_year}
                      </Text>
                      {details ? (
                        <Text style={styles.recordMeta}>{details}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.recordFooter}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Set ${record.financial_year} as current`}
                      disabled={
                        Number(currentYearId) === Number(record.id) ||
                        currentMutation.isPending ||
                        isSaving
                      }
                      style={[
                        styles.currentButton,
                        Number(currentYearId) === Number(record.id) &&
                          styles.currentBadge,
                      ]}
                      onPress={event => {
                        event.stopPropagation();
                        Alert.alert(
                          'Change current financial year?',
                          `New production plans and production history will use ${record.financial_year} for all users. Existing records will not be changed.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Set as current',
                              onPress: () => currentMutation.mutate(record.id),
                            },
                          ],
                        );
                      }}
                    >
                      <Text style={styles.currentButtonText}>
                        {Number(currentYearId) === Number(record.id)
                          ? '✓ Current year'
                          : currentMutation.isPending &&
                            currentMutation.variables === record.id
                          ? 'Setting current…'
                          : 'Set as current'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${record.financial_year}`}
                        activeOpacity={0.7}
                        disabled={isSaving || deleteMutation.isPending}
                        style={[styles.rowButton, styles.editButton]}
                        onPress={event => {
                          event.stopPropagation();
                          openEditForm(record);
                        }}
                      >
                        <Pencil size={17} color={COLORS.teal} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${record.financial_year}`}
                        activeOpacity={0.7}
                        disabled={isSaving || deleteMutation.isPending}
                        style={[styles.rowButton, styles.deleteButton]}
                        onPress={event => {
                          event.stopPropagation();
                          confirmDelete(record);
                        }}
                      >
                        {isDeleting ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.danger}
                          />
                        ) : (
                          <Trash2 size={17} color={COLORS.danger} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.stateBox}>
              <View style={styles.emptyIcon}>
                <CalendarRange size={30} color={COLORS.teal} />
              </View>
              <Text style={styles.stateTitle}>
                {records.length
                  ? 'No matching financial years'
                  : 'No financial years added yet'}
              </Text>
              <Text style={styles.stateText}>
                {records.length
                  ? 'Try another financial year.'
                  : 'Tap Add Year to create your first financial year.'}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  currentButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
  },
  currentBadge: { backgroundColor: COLORS.surfaceMuted },
  currentButtonText: { color: COLORS.primary, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1,
    padding: UI.pagePadding,
    paddingBottom: 40,
  },
  touchArea: { width: '100%', flexGrow: 1 },
  summaryCard: {
    minHeight: 76,
    padding: 14,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  summaryCopy: { flex: 1, marginLeft: 11, marginRight: 8 },
  summaryTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  summaryText: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
  },
  addButtonText: { color: COLORS.white, fontSize: 12.5, fontWeight: '600' },
  formCard: {
    padding: 16,
    marginTop: 14,
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 11,
  },
  successBanner: {
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 14,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.tealSoft,
  },
  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '600',
  },
  searchInput: { marginTop: 16, backgroundColor: COLORS.white },
  listHeading: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 8,
  },
  listTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  resultBadge: {
    minWidth: 28,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  resultText: { color: COLORS.teal, fontSize: 12, fontWeight: '600' },
  listCard: {
    overflow: 'hidden',
    borderRadius: UI.radius,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  recordRow: {
    padding: 16,
    gap: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  recordCopy: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8 },
  recordName: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  recordMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  rowActions: { flexDirection: 'row', gap: 8 },
  rowButton: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: { backgroundColor: COLORS.accentSoft },
  deleteButton: { backgroundColor: COLORS.dangerSoft },
  stateBox: {
    minHeight: 230,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
    marginBottom: 12,
  },
  stateTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  stateText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 5,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    marginTop: 14,
  },
  retryText: { color: COLORS.teal, fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: COLORS.white },
  inputMeta: {
    minHeight: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 3,
    paddingTop: 5,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  characterCount: { color: COLORS.muted, fontSize: 12 },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 7,
  },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelButtonText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
  },
  saveButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.65 },
});
