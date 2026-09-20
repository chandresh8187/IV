import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import {
  CheckCircle2,
  HardHat,
  Plus,
  Save,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  createContractorApi,
  updateContractorApi,
  deleteContractorApi,
  getContractorDirectoryApi,
} from '../../api/contractorApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { hasPermission } from '../../utils/permissions';

export default function ContractorsScreen() {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'contractors.view');
  const canManage = canView && hasPermission(user, 'contractors.manage');
  const { contentMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const query = useQuery({
    queryKey: ['contractors', 'directory'],
    queryFn: getContractorDirectoryApi,
    enabled: canView,
  });
  const contractors = Array.isArray(query.data?.data) ? query.data.data : [];
  const visible = contractors.filter(item =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);
  const refresh = () => {
    [
      'contractors',
      'contractor-report',
      'productions',
      'history-shift-table',
      'production-defaults',
    ].forEach(key => client.invalidateQueries({ queryKey: [key] }));
  };
  const finishSave = () => {
    Keyboard.dismiss();
    setName('');
    setError('');
    setSearch('');
    setShowForm(false);
    setSuccess(
      editing
        ? 'Contractor updated successfully'
        : 'Contractor added successfully',
    );
    setEditing(null);
    refresh();
  };
  const handleError = failure =>
    setError(
      failure?.response?.data?.message ||
        'The contractor could not be saved. Please try again.',
    );
  const create = useMutation({
    mutationFn: createContractorApi,
    onSuccess: finishSave,
    onError: handleError,
  });
  const update = useMutation({
    mutationFn: updateContractorApi,
    onSuccess: finishSave,
    onError: handleError,
  });
  const remove = useMutation({
    mutationFn: deleteContractorApi,
    onSuccess: () => {
      setShowForm(false);
      setEditing(null);
      setName('');
      setError('');
      setSuccess('Contractor deleted successfully');
      refresh();
    },
    onError: failure =>
      Alert.alert(
        'Could not delete contractor',
        failure?.response?.data?.message || 'Please try again.',
      ),
  });
  const busy = create.isPending || update.isPending || remove.isPending;
  const confirmDelete = item =>
    Alert.alert(
      'Delete contractor?',
      `Remove “${item.name}”? Contractors linked to production or shift assignments cannot be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(item.id),
        },
      ],
    );
  const save = () => {
    if (!canManage || busy) return;
    const value = name.trim().replace(/\s+/g, ' ');
    if (!value) return setError('Enter a contractor name.');
    if (value.length > 120)
      return setError('Contractor name cannot exceed 120 characters.');
    if (
      contractors.some(
        item =>
          Number(item.id) !== Number(editing?.id) &&
          item.name.trim().toLowerCase() === value.toLowerCase(),
      )
    ) {
      return setError('This contractor name already exists.');
    }
    setError('');
    if (editing) update.mutate({ id: editing.id, name: value });
    else create.mutate(value);
  };
  const closeForm = () => {
    if (busy) return;
    Keyboard.dismiss();
    setShowForm(false);
    setEditing(null);
    setName('');
    setError('');
  };
  if (!canView)
    return (
      <View style={styles.screen}>
        <Text style={styles.stateText}>You do not have contractor access.</Text>
      </View>
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={!!query.isRefetching}
          onRefresh={query.refetch}
        />
      }
    >
      <View style={styles.summaryCard}>
        <View style={styles.icon}>
          <HardHat size={23} color={COLORS.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Contractor master</Text>
          <Text style={styles.meta}>
            {contractors.length
              ? `${contractors.length} saved contractors`
              : 'Create your contractor list'}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add contractor"
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => {
              setEditing(null);
              setName('');
              setError('');
              setSuccess('');
              setShowForm(true);
            }}
          >
            <Plus size={18} color={COLORS.white} />
            <Text style={styles.primaryText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      {showForm && canManage && (
        <View style={styles.formCard}>
          <Text style={styles.title}>
            {editing ? 'Edit contractor' : 'Add new contractor'}
          </Text>
          <TextInput
            autoFocus
            label="Contractor name"
            placeholder="For example, Bintu"
            mode="outlined"
            value={name}
            maxLength={120}
            editable={!busy}
            onChangeText={value => {
              setName(value);
              setError('');
            }}
            returnKeyType="done"
            onSubmitEditing={save}
            error={!!error}
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
          />
          <View style={styles.inputMeta}>
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
            <Text style={styles.meta}>{name.length}/120</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel adding contractor"
              style={styles.cancelButton}
              onPress={closeForm}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save contractor"
              style={[
                styles.primaryButton,
                styles.saveButton,
                busy && styles.disabled,
              ]}
              onPress={save}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Save size={18} color={COLORS.white} />
                  <Text style={styles.primaryText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {!!success && (
        <View style={styles.successBanner}>
          <CheckCircle2 size={19} color={COLORS.success} />
          <Text accessibilityLiveRegion="polite" style={styles.successText}>
            {success}
          </Text>
        </View>
      )}
      <TextInput
        label="Search contractors"
        mode="outlined"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
        outlineColor={COLORS.inputBorder}
        activeOutlineColor={COLORS.accent}
        textColor={COLORS.text}
        theme={PAPER_THEME}
      />
      <View style={styles.listHeading}>
        <Text style={styles.title}>All contractors</Text>
        {!query.isLoading && !query.isError && (
          <Text style={styles.count}>{visible.length}</Text>
        )}
      </View>
      <View style={styles.listCard}>
        {query.isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.stateText}>Loading contractors...</Text>
          </View>
        ) : query.isError ? (
          <View style={styles.stateBox}>
            <HardHat size={30} color={COLORS.danger} />
            <Text style={styles.title}>Could not load contractors</Text>
            <Text style={styles.stateText}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Retry contractors"
              onPress={query.refetch}
              style={styles.retryButton}
            >
              <Text style={styles.cancelText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : visible.length ? (
          visible.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.listRow,
                index < visible.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.icon}>
                <HardHat size={20} color={COLORS.accent} />
              </View>
              <Text style={[styles.title, styles.copy]}>{item.name}</Text>
              {canManage && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.name}`}
                    disabled={busy}
                    style={styles.rowButton}
                    onPress={() => {
                      setEditing(item);
                      setName(item.name);
                      setError('');
                      setSuccess('');
                      setShowForm(true);
                    }}
                  >
                    <Pencil size={18} color={COLORS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                    disabled={busy}
                    style={styles.rowButton}
                    onPress={() => confirmDelete(item)}
                  >
                    <Trash2 size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.stateBox}>
            <HardHat size={30} color={COLORS.accent} />
            <Text style={styles.title}>
              {contractors.length
                ? 'No matching contractors'
                : 'No contractors added yet'}
            </Text>
            <Text style={styles.stateText}>
              {contractors.length
                ? 'Try another contractor name.'
                : canManage
                ? 'Tap Add to create your first contractor.'
                : 'Contractors will appear here once added.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowButton: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: UI.pagePadding, paddingBottom: 40 },
  summaryCard: {
    minHeight: 76,
    padding: 14,
    borderRadius: UI.radius,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  copy: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  meta: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
  },
  primaryText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  formCard: {
    padding: 16,
    marginTop: 14,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
    gap: 10,
    ...UI.shadow,
  },
  input: { backgroundColor: COLORS.white },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  error: { flex: 1, color: COLORS.danger, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, minHeight: 50 },
  disabled: { opacity: 0.65 },
  successBanner: {
    padding: 14,
    marginTop: 14,
    borderRadius: UI.radiusSmall,
    flexDirection: 'row',
    gap: 9,
    backgroundColor: COLORS.tealSoft,
  },
  successText: { flex: 1, color: COLORS.success, fontSize: 13 },
  search: { marginTop: 16, backgroundColor: COLORS.white },
  listHeading: {
    minHeight: 42,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    color: COLORS.accent,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  listCard: {
    overflow: 'hidden',
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
  },
  listRow: {
    minHeight: 70,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stateBox: {
    minHeight: 230,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
});
