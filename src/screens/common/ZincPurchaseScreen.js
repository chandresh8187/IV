import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import {
  Plus,
  Search,
  FileText,
  Pencil,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  getZincPurchasesApi,
  getZincStockApi,
  saveZincPurchaseApi,
  editZincPurchaseApi,
} from '../../api/zincStockApi';
import { downloadZincPurchaseReport } from '../../utils/serverZincStockReport';
import {
  formatDateForApi,
  formatDisplayDate,
  formatDisplayDateTime,
  parseDateForPicker,
} from '../../utils/format';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { COLORS, UI } from '../../assets/Colors';

const today = () => moment().utcOffset(330).format('YYYY-MM-DD');
const fmt = value =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const empty = () => ({
  transaction_date: today(),
  transaction_time: '',
  amount_kg: '',
  zinc_rate_per_kg: '',
  batch_number: '',
  invoice_number: '',
  note: '',
});

export default function ZincPurchaseScreen(props) {
  return props.embedded ? (
    <ZincPurchaseContent {...props} />
  ) : (
    <ZincPurchaseRedirect {...props} />
  );
}
function ZincPurchaseRedirect({ route, navigation }) {
  useEffect(() => {
    navigation.replace('ZincStock', {
      tab: 'purchases',
      month: route.params?.month,
      openPurchase: route.params?.openAdd,
    });
  }, [navigation, route.params?.month, route.params?.openAdd]);
  return <ActivityIndicator />;
}
function ZincPurchaseContent({
  route,
  navigation,
  embedded = false,
  openAdd = false,
  onAddOpened,
}) {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canEdit = hasPermission(user, 'zinc_stock.receive');
  const canReport = hasPermission(user, 'zinc_stock.report');
  const [month, setMonth] = useState(route.params?.month || '');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [picker, setPicker] = useState(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pending = useRef(null);
  const openedAdd = useRef(false);
  const client = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const query = useQuery({
    queryKey: ['zinc-purchases', month],
    queryFn: () => getZincPurchasesApi(month ? { month } : {}),
    enabled: canView,
    retry: false,
  });
  const stockQuery = useQuery({
    queryKey: ['zinc-stock'],
    queryFn: getZincStockApi,
    enabled: canView,
    retry: false,
  });
  const stock = stockQuery.data?.data;
  useEffect(() => {
    setMonth(route.params?.month || '');
  }, [route.params?.month]);
  const refetch = query.refetch,
    refetchStock = stockQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      if (canView) {
        refetch();
        refetchStock();
      }
    }, [canView, refetch, refetchStock]),
  );
  const open = useCallback(
    row => {
      setModal({
        id: row?.id || null,
        purchase_revision: Number(row?.revision || 0),
        expected_revision: stock?.revision,
      });
      setForm(
        row
          ? Object.fromEntries(
              Object.keys(empty()).map(key => [key, String(row[key] ?? '')]),
            )
          : empty(),
      );
      setPicker(null);
      setError('');
      pending.current = null;
    },
    [stock],
  );
  const shouldOpenAdd = embedded ? openAdd : route.params?.openAdd;
  useEffect(() => {
    if (!shouldOpenAdd) {
      openedAdd.current = false;
      return;
    }
    if (shouldOpenAdd && stock && canEdit && !openedAdd.current) {
      openedAdd.current = true;
      open(null);
      if (embedded) onAddOpened?.();
      else navigation.setParams({ openAdd: false });
    }
  }, [shouldOpenAdd, stock, canEdit, open, navigation, embedded, onAddOpened]);
  const refresh = () =>
    [
      'zinc-purchases',
      'zinc-stock',
      'zinc-stock-movements',
      'zinc-byproducts',
      'monthly-report',
      'expense-report',
      'dashboard',
    ].forEach(key => client.invalidateQueries({ queryKey: [key] }));
  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      ...form,
      transaction_time: form.transaction_time || undefined,
      expected_revision: modal.expected_revision,
      ...(modal.id ? { purchase_revision: modal.purchase_revision } : {}),
    };
    const signature = JSON.stringify({ id: modal.id, body });
    if (pending.current?.signature !== signature)
      pending.current = {
        signature,
        body: {
          ...body,
          request_id: `zinc_purchase_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`,
        },
      };
    try {
      const response = modal.id
        ? await editZincPurchaseApi(modal.id, pending.current.body)
        : await saveZincPurchaseApi(pending.current.body);
      setSuccess(response.message);
      setModal(null);
      pending.current = null;
      refresh();
    } catch (failure) {
      setError(
        failure.response?.data?.message || 'Could not save the purchase.',
      );
      if (failure.response?.status === 409) refresh();
    } finally {
      setBusy(false);
    }
  };
  const generate = async () => {
    setGenerating(true);
    try {
      const pdf = await downloadZincPurchaseReport(month ? { month } : {});
      navigation.navigate('PdfViewer', { ...pdf, title: 'Zinc Purchase' });
    } catch (failure) {
      Alert.alert(
        'Could not generate PDF',
        failure?.message || 'Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };
  const pickerDate = parseDateForPicker(form.transaction_date);

  if (!canView)
    return (
      <View style={styles.center}>
        <Text>You do not have zinc stock access.</Text>
      </View>
    );
  const purchases = query.data?.data || [];
  const filtered = purchases.filter(row =>
    [
      row.batch_number,
      row.invoice_number,
      row.note,
      row.transaction_date,
      formatDisplayDate(row.transaction_date),
      row.amount_kg,
      row.zinc_rate_per_kg,
    ].some(value =>
      String(value ?? '')
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    ),
  );
  const changeMonth = offset =>
    setMonth(
      moment(month ? month + '-01' : today())
        .add(offset, 'month')
        .format('YYYY-MM'),
    );
  const ListContainer = embedded ? View : ScrollView;
  const listProps = embedded
    ? { style: styles.embeddedContent }
    : {
        contentContainerStyle: [
          styles.content,
          centeredContent(contentMaxWidth),
        ],
        refreshControl: (
          <RefreshControl refreshing={query.isRefetching} onRefresh={refresh} />
        ),
      };
  return (
    <View style={embedded ? styles.embeddedContent : styles.page}>
      <ListContainer {...listProps}>
        <View style={styles.between}>
          <View style={styles.grow}>
            <Text style={styles.title}>Purchases</Text>
            <Text style={styles.muted}>Zinc received into plant stock</Text>
          </View>
          {canEdit && (
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, !stock?.initialized && styles.disabled]}
              disabled={!stock?.initialized}
              onPress={() => open(null)}
            >
              <Plus size={18} color={COLORS.white} />
              <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TOTAL ZINC PURCHASED</Text>
          <Text style={styles.summaryValue}>
            {fmt(query.data?.summary?.amount_kg)}{' '}
            <Text style={styles.summaryUnit}>kg</Text>
          </Text>
          <View style={styles.summaryBottom}>
            <View style={styles.metric}>
              <Text style={styles.summaryLabel}>Purchase value</Text>
              <Text style={styles.summaryDetail}>
                ₹{fmt(query.data?.summary?.purchase_value)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.summaryLabel}>Plant stock</Text>
              <Text style={styles.summaryDetail}>
                {fmt(stock?.plant_kg)} kg
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.filters}>
          <View style={styles.between}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={styles.iconButton}
              onPress={() => changeMonth(-1)}
            >
              <ChevronLeft size={22} color={COLORS.accent} />
            </TouchableOpacity>
            <View style={styles.monthLabel}>
              <CalendarDays size={18} color={COLORS.accent} />
              <Text style={styles.heading}>
                {month
                  ? moment(month, 'YYYY-MM').format('MMMM YYYY')
                  : 'All months'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={styles.iconButton}
              onPress={() => changeMonth(1)}
            >
              <ChevronRight size={22} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          {month ? (
            <TouchableOpacity
              style={styles.allMonths}
              onPress={() => setMonth('')}
            >
              <Text style={styles.link}>Show all months</Text>
            </TouchableOpacity>
          ) : null}
          <TextInput
            mode="outlined"
            placeholder="Search batch, invoice or quantity"
            accessibilityLabel="Search purchases"
            value={search}
            onChangeText={setSearch}
            left={
              <TextInput.Icon
                icon={() => <Search size={20} color={COLORS.muted} />}
              />
            }
            right={
              search ? (
                <TextInput.Icon icon="close" onPress={() => setSearch('')} />
              ) : null
            }
            style={styles.input}
            outlineStyle={styles.inputOutline}
          />
        </View>
        {success ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {success}
          </Text>
        ) : null}
        <View style={styles.between}>
          <Text style={styles.heading}>
            {filtered.length} {filtered.length === 1 ? 'purchase' : 'purchases'}
          </Text>
          {canReport && (
            <TouchableOpacity
              style={styles.pdfButton}
              disabled={generating}
              onPress={generate}
            >
              {generating ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <FileText size={17} color={COLORS.accent} />
              )}
              <Text style={styles.link}>
                {generating ? 'Generating…' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {query.isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.muted}>Loading purchases…</Text>
          </View>
        ) : query.isError ? (
          <TouchableOpacity style={styles.card} onPress={refetch}>
            <Text style={styles.error}>
              Could not load purchases. Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : filtered.length ? (
          filtered.map(row => (
            <View key={row.id} style={styles.card}>
              <View style={styles.between}>
                <View style={styles.dateBadge}>
                  <CalendarDays size={15} color={COLORS.accent} />
                  <Text style={styles.dateText}>
                    {formatDisplayDate(row.transaction_date)}
                  </Text>
                </View>
                {canEdit && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      'Edit purchase ' +
                      (row.invoice_number || row.batch_number || row.id)
                    }
                    style={styles.editButton}
                    onPress={() => open(row)}
                  >
                    <Pencil size={15} color={COLORS.accent} />
                    <Text style={styles.link}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.amountRow}>
                <View style={styles.grow}>
                  <Text style={styles.quantity}>
                    {fmt(row.amount_kg)} <Text style={styles.unit}>kg</Text>
                  </Text>
                  <Text style={styles.muted}>
                    ₹{fmt(row.zinc_rate_per_kg)} per kg
                  </Text>
                </View>
                <View style={styles.valueBlock}>
                  <Text style={styles.label}>Purchase value</Text>
                  <Text style={styles.value}>
                    ₹{fmt(Number(row.amount_kg) * Number(row.zinc_rate_per_kg))}
                  </Text>
                </View>
              </View>
              <View style={styles.references}>
                <View style={styles.reference}>
                  <Text style={styles.label}>BATCH NUMBER</Text>
                  <Text selectable style={styles.referenceValue}>
                    {row.batch_number || '—'}
                  </Text>
                </View>
                <View style={styles.reference}>
                  <Text style={styles.label}>INVOICE NUMBER</Text>
                  <Text selectable style={styles.referenceValue}>
                    {row.invoice_number || '—'}
                  </Text>
                </View>
              </View>
              {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
              <View style={styles.recordFooter}>
                {row.transaction_time ? (
                  <Text style={styles.caption}>
                    Purchase time ·{' '}
                    {moment(row.transaction_time, 'HH:mm:ss').format('hh:mm A')}{' '}
                    IST
                  </Text>
                ) : null}
                <Text style={styles.caption}>
                  Recorded {formatDisplayDateTime(row.created_at)}
                  {Number(row.revision) > 0
                    ? ' · Edited ' + row.revision + ' time(s)'
                    : ''}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Package size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.heading}>
              {search.trim() ? 'No matching purchases' : 'No purchases yet'}
            </Text>
            <Text style={styles.emptyText}>
              {search.trim()
                ? 'Try another batch, invoice or quantity.'
                : 'Purchases received in this period will appear here.'}
            </Text>
          </View>
        )}
      </ListContainer>
      <Modal
        transparent
        visible={Boolean(modal)}
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setModal(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalTitle}>
                  {modal?.id ? 'Edit purchase' : 'New purchase'}
                </Text>
                <Text style={styles.muted}>Zinc received into plant stock</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close purchase form"
                disabled={busy}
                style={styles.iconButton}
                onPress={() => setModal(null)}
              >
                <X size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.muted}>
                Plant stock: {fmt(stock?.plant_kg)} kg. The selected date
                determines the purchase month.
              </Text>
              <TouchableOpacity
                style={styles.secondary}
                onPress={() => setPicker('date')}
              >
                <Text style={styles.link}>
                  Purchase date: {formatDisplayDate(form.transaction_date)}
                </Text>
              </TouchableOpacity>
              {picker && (
                <View>
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={parseDateForPicker(today())}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') setPicker(null);
                      if (event.type !== 'dismissed' && date)
                        setForm(current => ({
                          ...current,
                          transaction_date: formatDateForApi(date),
                        }));
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setPicker(null)}>
                      <Text style={styles.link}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {[
                ['amount_kg', 'Zinc quantity (kg)'],
                ['zinc_rate_per_kg', 'Zinc rate per kg (₹)'],
                ['batch_number', 'Batch number (optional)'],
                ['invoice_number', 'Invoice number (optional)'],
                ['note', 'Note (optional)'],
              ].map(([key, label]) => (
                <TextInput
                  key={key}
                  mode="outlined"
                  label={label}
                  value={form[key]}
                  onChangeText={value =>
                    setForm(current => ({ ...current, [key]: value }))
                  }
                  keyboardType={
                    ['amount_kg', 'zinc_rate_per_kg'].includes(key)
                      ? 'decimal-pad'
                      : 'default'
                  }
                  maxLength={key === 'note' ? 255 : 100}
                  multiline={key === 'note'}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              ))}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondary}
                  disabled={busy}
                  onPress={() => setModal(null)}
                >
                  <Text style={styles.link}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  disabled={busy}
                  onPress={save}
                >
                  <Text style={styles.buttonText}>
                    {busy ? 'Saving…' : 'Save Purchase'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  grow: { flex: 1, gap: 4 },
  disabled: { opacity: 0.45 },
  summary: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  summaryLabel: {
    color: COLORS.onHero,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryValue: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  summaryUnit: { fontSize: 17, fontWeight: '500' },
  summaryBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffffff30',
    paddingTop: 14,
    marginTop: 4,
  },
  metric: { flex: 1, minWidth: 110, gap: 5 },
  summaryDetail: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  filters: {
    padding: 12,
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allMonths: { alignSelf: 'center', padding: 8 },
  input: { backgroundColor: COLORS.white },
  inputOutline: { borderRadius: 12, borderColor: COLORS.borderStrong },
  pdfButton: {
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  dateText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 5,
  },
  quantity: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  unit: { fontSize: 15, color: COLORS.muted, fontWeight: '500' },
  valueBlock: { gap: 5, flexShrink: 1 },
  value: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  label: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.muted,
    fontWeight: '600',
  },
  references: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.surfaceMuted,
    padding: 12,
    borderRadius: 12,
  },
  reference: { flex: 1, gap: 5 },
  referenceValue: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  note: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 4,
  },
  caption: { fontSize: 11, color: COLORS.muted, lineHeight: 17 },
  emptyState: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
  },
  emptyIcon: {
    padding: 16,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 40,
  },
  emptyText: { color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  modalTitle: { fontSize: 21, fontWeight: '800', color: COLORS.text },
  embeddedContent: { gap: 14 },
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 14, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  heading: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  muted: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: UI.radiusSmall,
    padding: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  secondary: {
    backgroundColor: COLORS.accentSoft,
    padding: 14,
    borderRadius: UI.radiusSmall,
    minHeight: 46,
    justifyContent: 'center',
  },
  link: { color: COLORS.accent, fontWeight: '700' },
  success: { color: COLORS.success },
  error: { color: COLORS.danger },
  overlay: {
    flex: 1,
    backgroundColor: '#0f172a88',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modal: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '88%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: { padding: 20, gap: 14 },
});
