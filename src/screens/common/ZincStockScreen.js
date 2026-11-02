import { downloadZincByproductReport } from '../../utils/serverZincStockReport';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import {
  formatDateForApi,
  formatDisplayDate,
  parseDateForPicker,
} from '../../utils/format';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  ArrowRightLeft,
  Factory,
  Package,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Pencil,
  X,
  FileText,
} from 'lucide-react-native';
import {
  getZincByproductsApi,
  getZincStockApi,
  saveZincByproductApi,
  editZincByproductApi,
  saveZincMovementApi,
} from '../../api/zincStockApi';
import ZincPurchaseScreen from './ZincPurchaseScreen';
import ZincTankVisual from '../../components/ZincTankVisual';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import {
  parseZincAmount,
  zincKg,
  zincTransferPreview,
} from '../../utils/zincStock';

const requestId = () =>
  `zinc_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random()
    .toString(36)
    .slice(2)}`;
const today = () => moment().utcOffset(330).format('YYYY-MM-DD');
const money = value => Math.round(Number(value || 0) * 100) / 100;

export default function ZincStockScreen({ navigation, route }) {
  const user = useSelector(state => state.auth.user);
  const canReport = hasPermission(user, 'zinc_stock.report');
  const [generatingByproduct, setGeneratingByproduct] = useState(false);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canTransfer = hasPermission(user, 'zinc_stock.transfer');
  const canAdjust = hasPermission(user, 'zinc_stock.adjust');
  const canManageByproducts = hasPermission(user, 'zinc_byproduct.manage');
  const { contentMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [tab, setTab] = useState('stock');
  const [purchaseAdd, setPurchaseAdd] = useState(false);
  useEffect(() => {
    if (route?.params?.tab) {
      setTab(route.params.tab);
      if (route.params.openPurchase) setPurchaseAdd(true);
      navigation.setParams({ tab: undefined, openPurchase: undefined });
    }
  }, [route?.params?.tab, route?.params?.openPurchase, navigation]);
  const [selected, setSelected] = useState('plant');
  const [action, setAction] = useState(null);
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(today);
  const [showTransferDate, setShowTransferDate] = useState(false);
  const [transferTime, setTransferTime] = useState(() =>
    moment().utcOffset(330).format('HH:mm'),
  );
  const [showTransferTime, setShowTransferTime] = useState(false);
  const [receiptRate, setReceiptRate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ashWeight, setAshWeight] = useState('');
  const [ashRate, setAshRate] = useState('');
  const [drossWeight, setDrossWeight] = useState('');
  const [drossRate, setDrossRate] = useState('');
  const [byproductNote, setByproductNote] = useState('');
  const [byproductError, setByproductError] = useState('');
  const [byproductDate, setByproductDate] = useState(today);
  const [showByproductDate, setShowByproductDate] = useState(false);
  const [byproductMonth, setByproductMonth] = useState(() =>
    today().slice(0, 7),
  );
  const [byproductModal, setByproductModal] = useState(false);
  const [editingByproduct, setEditingByproduct] = useState(null);
  const pendingByproduct = useRef(null);
  const [byproductSearch, setByproductSearch] = useState('');
  const pendingRequest = useRef(null);
  const stockQuery = useQuery({
    queryKey: ['zinc-stock'],
    queryFn: getZincStockApi,
    enabled: canView,
    retry: false,
  });
  const byproductQuery = useQuery({
    queryKey: ['zinc-byproducts', byproductMonth],
    queryFn: () => getZincByproductsApi({ month: byproductMonth }),
    enabled: canView && tab === 'byproducts',
  });
  const stock = stockQuery.data?.data;
  const summary = byproductQuery.data?.summary || {};
  const refetchStock = stockQuery.refetch;
  const refetchByproducts = byproductQuery.refetch;
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['zinc-stock'] });
    client.invalidateQueries({ queryKey: ['zinc-stock-movements'] });
    client.invalidateQueries({ queryKey: ['zinc-byproducts'] });
    client.invalidateQueries({ queryKey: ['monthly-report'] });
    client.invalidateQueries({ queryKey: ['expense-report'] });
    client.invalidateQueries({ queryKey: ['zinc-purchases'] });
  };
  useFocusEffect(
    useCallback(() => {
      if (canView) {
        refetchStock();
        if (tab === 'byproducts') refetchByproducts();
      }
    }, [canView, refetchStock, refetchByproducts, tab]),
  );
  const movement = useMutation({
    mutationFn: saveZincMovementApi,
    retry: false,
    onSuccess: response => {
      Keyboard.dismiss();
      client.setQueryData(['zinc-stock'], response);
      pendingRequest.current = null;
      setAction(null);
      setAmount('');
      setReceiptRate('');
      setBatchNumber('');
      setInvoiceNumber('');
      setNote('');
      setError('');
      setSuccess(response.message);
      refresh();
    },
    onError: failure => {
      setError(
        failure?.response?.data?.message || 'Could not save zinc stock.',
      );
      if (failure?.response?.status === 409) pendingRequest.current = null;
    },
  });
  const byproduct = useMutation({
    mutationFn: body => {
      if (!editingByproduct) return saveZincByproductApi(body);
      const signature = JSON.stringify(body);
      if (pendingByproduct.current?.signature !== signature)
        pendingByproduct.current = {
          signature,
          body: {
            ...body,
            edit_version: editingByproduct.edit_version,
            request_id: requestId(),
          },
        };
      return editZincByproductApi(
        editingByproduct.id,
        pendingByproduct.current.body,
      );
    },
    onSuccess: response => {
      Keyboard.dismiss();
      setByproductModal(false);
      setByproductMonth(byproductDate.slice(0, 7));
      setSuccess(response.message);
      setAshWeight('');
      setAshRate('');
      setDrossWeight('');
      setDrossRate('');
      setByproductNote('');
      setByproductError('');
      refresh();
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['expense-report'] });
      client.invalidateQueries({ queryKey: ['monthly-report'] });
    },
    onError: failure =>
      setByproductError(
        failure?.response?.data?.message ||
          'Could not save ash and dross entry.',
      ),
  });
  const preview =
    action === 'transfer' && amount && stock
      ? zincTransferPreview(stock, amount)
      : null;
  const saveMovement = () => {
    const kg = parseZincAmount(amount);
    if (kg == null)
      return setError(
        'Enter kilograms greater than zero, with up to 3 decimal places.',
      );
    const rate = Number(receiptRate);
    if (
      action === 'receive' &&
      (!/^\d+(\.\d{1,2})?$/.test(receiptRate) ||
        !Number.isFinite(rate) ||
        rate <= 0)
    )
      return setError(
        'Enter the received zinc rate per kg with up to 2 decimal places.',
      );
    if (action === 'transfer' && preview?.error) return setError(preview.error);
    const payload = {
      action,
      amount_kg: kg,
      ...(['transfer', 'receive'].includes(action)
        ? { transaction_date: transferDate, transaction_time: transferTime }
        : {}),
      ...(action === 'receive'
        ? {
            zinc_rate_per_kg: rate,
            batch_number: batchNumber.trim(),
            invoice_number: invoiceNumber.trim(),
          }
        : {}),
      note: note.trim(),
    };
    const signature = JSON.stringify(payload);
    if (pendingRequest.current?.signature !== signature)
      pendingRequest.current = {
        signature,
        body: {
          ...payload,
          expected_revision: stock.revision,
          request_id: requestId(),
        },
      };
    movement.mutate(pendingRequest.current.body);
  };
  const exportByproducts = async () => {
    setGeneratingByproduct(true);
    try {
      const pdf = await downloadZincByproductReport({ month: byproductMonth });
      navigation.navigate('PdfViewer', { ...pdf, title: 'Ash & Dross Report' });
    } catch (failure) {
      Alert.alert(
        'Could not generate PDF',
        failure?.message || 'Please try again.',
      );
    } finally {
      setGeneratingByproduct(false);
    }
  };
  const currentRate = Number(stock?.current_zinc_rate || 0);
  const averageRate = Number(stock?.average_zinc_rate || 0);
  const ashBase = money(Number(ashWeight || 0) * Number(ashRate || 0));
  const drossBase = money(Number(drossWeight || 0) * Number(drossRate || 0));
  const ashGst = money(ashBase * 0.18);
  const drossGst = money(drossBase * 0.18);
  const total = money(ashBase + ashGst + drossBase + drossGst);
  const recoveryRate = Number(
    editingByproduct?.zinc_rate_snapshot ?? currentRate,
  );
  const recovered = recoveryRate > 0 ? total / recoveryRate : 0;
  const openByproductEdit = item => {
    setEditingByproduct(item);
    pendingByproduct.current = null;
    setAshWeight(String(item.ash_weight_kg ?? ''));
    setAshRate(String(item.ash_rate ?? ''));
    setDrossWeight(String(item.dross_weight_kg ?? ''));
    setDrossRate(String(item.dross_rate ?? ''));
    setByproductNote(item.note || '');
    setByproductDate(item.transaction_date);
    setByproductError('');
    setShowByproductDate(false);
    setByproductModal(true);
  };
  const byproductRows = (byproductQuery.data?.data || []).filter(item =>
    [
      item.transaction_date,
      formatDisplayDate(item.transaction_date),
      item.note,
      item.ash_weight_kg,
      item.dross_weight_kg,
      item.recovered_zinc_kg,
    ].some(value =>
      String(value ?? '')
        .toLowerCase()
        .includes(byproductSearch.trim().toLowerCase()),
    ),
  );
  if (!canView)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You do not have zinc stock access.</Text>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.page}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          centeredContent(contentMaxWidth),
        ]}
        refreshControl={
          <RefreshControl
            refreshing={stockQuery.isRefetching || byproductQuery.isRefetching}
            onRefresh={refresh}
          />
        }
      >
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Zinc Management</Text>
            <Text style={styles.muted}>Stock, ash and dross recovery</Text>
          </View>
          {canAdjust && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('ZincStockSettings')}
            >
              <Settings size={18} color={COLORS.white} />
              <Text style={styles.buttonText}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>
        {stock?.low_stock ? (
          <View style={styles.stockAlert}>
            <Text style={styles.stockAlertText}>
              Low zinc stock: only {zincKg(stock.plant_kg)} kg remains in the
              plant. Receive zinc soon.
            </Text>
          </View>
        ) : null}
        <View style={styles.tabs}>
          {[
            ['stock', 'Zinc Stock'],
            ['purchases', 'Zinc Purchase'],
            ['byproducts', 'Ash & Dross'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              style={[styles.tab, tab === key && styles.activeTab]}
              onPress={() => setTab(key)}
            >
              <Text
                style={[styles.tabText, tab === key && styles.activeTabText]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {success ? <Text style={styles.success}>{success}</Text> : null}
        {stockQuery.isLoading ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : stockQuery.isError ? (
          <View style={styles.card}>
            <Text style={styles.error}>Could not load zinc stock.</Text>
            <TouchableOpacity onPress={refresh}>
              <Text style={styles.link}>Retry stock</Text>
            </TouchableOpacity>
          </View>
        ) : tab === 'stock' ? (
          <>
            <View style={styles.stockActions}>
              <TouchableOpacity
                style={[styles.reportButton, styles.stockAction]}
                onPress={() => navigation.navigate('ZincStockReport')}
              >
                <Text style={styles.stockActionText}>
                  View Zinc Transactions
                </Text>
              </TouchableOpacity>
              {stock.initialized && canTransfer && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.button, styles.stockAction]}
                  onPress={() => {
                    setTransferDate(today());
                    setTransferTime(moment().utcOffset(330).format('HH:mm'));
                    setShowTransferDate(false);
                    setShowTransferTime(false);
                    setAction('transfer');
                    setAmount('');
                    setNote('');
                    setError('');
                    pendingRequest.current = null;
                  }}
                >
                  <ArrowRightLeft size={18} color={COLORS.white} />
                  <Text style={styles.stockActionText}>Add zinc to kettle</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.options}>
              {[
                {
                  key: 'plant',
                  title: 'Stock in Plant',
                  Icon: Factory,
                  value: stock.initialized
                    ? `${zincKg(stock.plant_kg)} kg`
                    : 'Not set',
                  selectable: true,
                },
                {
                  key: 'kettle',
                  title: 'Stock in Kettle',
                  Icon: Package,
                  value: stock.initialized
                    ? `${zincKg(stock.kettle_kg)} kg`
                    : 'Not set',
                  selectable: true,
                },
                {
                  key: 'current-rate',
                  title: 'Current Zinc Rate',
                  Icon: Package,
                  value: currentRate
                    ? `₹${currentRate.toFixed(2)} / kg`
                    : 'Not recorded',
                },
                {
                  key: 'average-rate',
                  title: `Average Zinc Rate${
                    stock.financial_year ? ` · FY ${stock.financial_year}` : ''
                  }`,
                  Icon: Package,
                  value: averageRate
                    ? `₹${averageRate.toFixed(2)} / kg`
                    : 'Not recorded',
                },
              ].map(({ key, title, Icon, value, selectable }) => (
                <TouchableOpacity
                  key={key}
                  disabled={!selectable}
                  style={[
                    styles.stockCard,
                    selectable && selected === key && styles.selectedCard,
                  ]}
                  onPress={() => selectable && setSelected(key)}
                >
                  <Icon size={24} color={COLORS.accent} />
                  <Text style={styles.heading}>{title}</Text>
                  <Text style={styles.balance}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!stock.initialized ? (
              <View style={styles.card}>
                <Text style={styles.heading}>Opening stock is not set</Text>
                <Text style={styles.muted}>
                  Use Settings to enter opening plant and kettle stock.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.heading}>Kettle tank</Text>
                    <Text style={styles.muted}>5 m × 1 m × 1.25 m</Text>
                  </View>
                  <ZincTankVisual
                    initialized={stock.initialized}
                    levelMm={stock.level_mm || 0}
                    depthMm={stock.tank.depth_mm}
                  />
                  <Text style={styles.balance}>
                    {Number(stock.level_mm).toFixed(1)} mm ·{' '}
                    {zincKg(stock.kettle_kg)} kg
                  </Text>
                </View>
              </>
            )}
          </>
        ) : tab === 'purchases' ? (
          <ZincPurchaseScreen
            embedded
            navigation={navigation}
            route={route}
            openAdd={purchaseAdd}
            onAddOpened={() => setPurchaseAdd(false)}
          />
        ) : (
          <>
            <View style={styles.titleRow}>
              <View style={styles.flexCopy}>
                <Text style={styles.title}>Ash &amp; Dross</Text>
                <Text style={styles.muted}>
                  Track collections and zinc recovery
                </Text>
              </View>
              {canManageByproducts && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    setEditingByproduct(null);
                    pendingByproduct.current = null;
                    setAshWeight('');
                    setAshRate('');
                    setDrossWeight('');
                    setDrossRate('');
                    setByproductNote('');
                    setByproductDate(
                      byproductMonth === today().slice(0, 7)
                        ? today()
                        : byproductMonth + '-01',
                    );
                    setShowByproductDate(false);
                    setByproductError('');
                    setByproductModal(true);
                  }}
                >
                  <Plus size={18} color={COLORS.white} />
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.recoverySummary}>
              <Text style={styles.heroLabel}>RECOVERED ZINC</Text>
              <Text style={styles.heroValue}>
                {zincKg(summary.recovered_zinc_kg)}{' '}
                <Text style={styles.heroUnit}>kg</Text>
              </Text>
              <View style={styles.heroMetrics}>
                <View style={styles.flexCopy}>
                  <Text style={styles.heroLabel}>Total ash</Text>
                  <Text style={styles.heroDetail}>
                    {zincKg(summary.ash_weight_kg)} kg
                  </Text>
                </View>
                <View style={styles.flexCopy}>
                  <Text style={styles.heroLabel}>Total dross</Text>
                  <Text style={styles.heroDetail}>
                    {zincKg(summary.dross_weight_kg)} kg
                  </Text>
                </View>
                <View style={styles.flexCopy}>
                  <Text style={styles.heroLabel}>Value incl. GST</Text>
                  <Text style={styles.heroDetail}>
                    ₹{money(summary.total_with_gst).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <TouchableOpacity
                  accessibilityLabel="Previous month"
                  style={styles.iconButton}
                  onPress={() =>
                    setByproductMonth(
                      moment(byproductMonth + '-01')
                        .subtract(1, 'month')
                        .format('YYYY-MM'),
                    )
                  }
                >
                  <ChevronLeft size={22} color={COLORS.accent} />
                </TouchableOpacity>
                <Text style={styles.heading}>
                  {moment(byproductMonth, 'YYYY-MM').format('MMMM YYYY')}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Next month"
                  style={styles.iconButton}
                  onPress={() =>
                    setByproductMonth(
                      moment(byproductMonth + '-01')
                        .add(1, 'month')
                        .format('YYYY-MM'),
                    )
                  }
                >
                  <ChevronRight size={22} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
              <TextInput
                mode="outlined"
                placeholder="Search date, note or weight"
                accessibilityLabel="Search ash and dross"
                value={byproductSearch}
                onChangeText={setByproductSearch}
                left={
                  <TextInput.Icon
                    icon={() => <Search size={20} color={COLORS.muted} />}
                  />
                }
                right={
                  byproductSearch ? (
                    <TextInput.Icon
                      icon="close"
                      onPress={() => setByproductSearch('')}
                    />
                  ) : null
                }
                style={styles.fullInput}
              />
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.heading}>
                {byproductRows.length}{' '}
                {byproductRows.length === 1 ? 'entry' : 'entries'}
              </Text>
              {canReport && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.reportLink}
                  disabled={generatingByproduct}
                  onPress={exportByproducts}
                >
                  {generatingByproduct ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <FileText size={17} color={COLORS.accent} />
                  )}
                  <Text style={styles.link}>
                    {generatingByproduct ? 'Generating…' : 'Export PDF'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {byproductQuery.isLoading ? (
              <ActivityIndicator color={COLORS.accent} />
            ) : byproductQuery.isError ? (
              <TouchableOpacity style={styles.card} onPress={refetchByproducts}>
                <Text style={styles.error}>
                  Could not load entries. Tap to retry.
                </Text>
              </TouchableOpacity>
            ) : byproductRows.length ? (
              byproductRows.map(item => (
                <View key={item.id} style={styles.entryCard}>
                  <View style={styles.titleRow}>
                    <View style={styles.row}>
                      <CalendarDays size={16} color={COLORS.accent} />
                      <Text style={styles.link}>
                        {formatDisplayDate(item.transaction_date)}
                      </Text>
                    </View>
                    {canManageByproducts && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Edit ash and dross collection"
                        style={[styles.secondary, styles.row]}
                        onPress={() => openByproductEdit(item)}
                      >
                        <Pencil size={16} color={COLORS.accent} />
                        <Text style={styles.link}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.titleRow}>
                    <View style={styles.flexCopy}>
                      <Text style={styles.entryValue}>
                        {zincKg(item.recovered_zinc_kg)} kg
                      </Text>
                      <Text style={styles.muted}>Recovered zinc</Text>
                    </View>
                    <View style={styles.flexCopy}>
                      <Text style={styles.heading}>
                        ₹{money(item.total_with_gst).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.muted}>Value incl. GST</Text>
                    </View>
                  </View>
                  <View style={styles.collectionRow}>
                    {[
                      ['Ash', item.ash_weight_kg, item.ash_rate],
                      ['Dross', item.dross_weight_kg, item.dross_rate],
                    ].map(([label, weight, rate]) => (
                      <View key={label} style={styles.flexCopy}>
                        <Text style={styles.muted}>{label}</Text>
                        <Text style={styles.heading}>{zincKg(weight)} kg</Text>
                        <Text style={styles.muted}>₹{money(rate)} / kg</Text>
                      </View>
                    ))}
                  </View>
                  {item.note ? (
                    <Text style={styles.muted}>{item.note}</Text>
                  ) : null}
                  <Text style={styles.entryFoot}>
                    Zinc rate ₹{money(item.zinc_rate_snapshot)} / kg ·{' '}
                    {item.actor_name || 'User'}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Package size={30} color={COLORS.accent} />
                <Text style={styles.heading}>
                  {byproductSearch.trim()
                    ? 'No matching entries'
                    : 'No collections this month'}
                </Text>
                <Text style={styles.muted}>
                  {byproductSearch.trim()
                    ? 'Try another date, note or weight.'
                    : 'Add ash, dross or both to record recovery.'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <Modal
        transparent
        visible={Boolean(action)}
        animationType="fade"
        onRequestClose={() => {
          if (!movement.isPending) setAction(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.byproductDialog} accessibilityViewIsModal>
            <View style={styles.dialogHeader}>
              <View style={styles.flexCopy}>
                <Text style={styles.title}>Add zinc to kettle</Text>
                <Text style={styles.muted}>Transfer from plant stock</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close kettle transfer form"
                style={styles.iconButton}
                disabled={movement.isPending}
                onPress={() => setAction(null)}
              >
                <X size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.dialogContent}
            >
              {' '}
              {action && (
                <View style={styles.card}>
                  <Text style={styles.heading}>
                    {action === 'receive'
                      ? 'Receive zinc in plant'
                      : 'Transfer zinc to kettle'}
                  </Text>
                  {['transfer', 'receive'].includes(action) && (
                    <View>
                      <Text style={styles.heading}>
                        {action === 'receive'
                          ? 'Receipt date'
                          : 'Transfer date'}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Select zinc transaction date"
                        style={styles.secondary}
                        onPress={() => setShowTransferDate(true)}
                      >
                        <Text style={styles.link}>
                          {formatDisplayDate(transferDate)} · Tap to change
                        </Text>
                      </TouchableOpacity>
                      {showTransferDate && (
                        <View>
                          <DateTimePicker
                            value={parseDateForPicker(transferDate)}
                            mode="date"
                            display={
                              Platform.OS === 'ios' ? 'spinner' : 'default'
                            }
                            maximumDate={parseDateForPicker(today())}
                            onChange={(event, date) => {
                              if (Platform.OS === 'android')
                                setShowTransferDate(false);
                              if (event.type !== 'dismissed' && date) {
                                setTransferDate(formatDateForApi(date));
                                pendingRequest.current = null;
                              }
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.secondary}
                              onPress={() => setShowTransferDate(false)}
                            >
                              <Text style={styles.link}>Done</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      <Text style={styles.heading}>
                        {action === 'receive'
                          ? 'Receipt time (IST)'
                          : 'Transfer time (IST)'}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Select zinc transaction time"
                        style={styles.secondary}
                        onPress={() => setShowTransferTime(true)}
                      >
                        <Text style={styles.link}>
                          {moment(transferTime, 'HH:mm').format('hh:mm A')} ·
                          Tap to change
                        </Text>
                      </TouchableOpacity>
                      {showTransferTime && (
                        <View>
                          <DateTimePicker
                            value={(() => {
                              const date = parseDateForPicker(transferDate);
                              const [hours, minutes] = transferTime
                                .split(':')
                                .map(Number);
                              date.setHours(hours, minutes, 0, 0);
                              return date;
                            })()}
                            mode="time"
                            display={
                              Platform.OS === 'ios' ? 'spinner' : 'default'
                            }
                            onChange={(event, date) => {
                              if (Platform.OS === 'android')
                                setShowTransferTime(false);
                              if (event.type !== 'dismissed' && date) {
                                setTransferTime(moment(date).format('HH:mm'));
                                pendingRequest.current = null;
                              }
                            }}
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.secondary}
                              onPress={() => setShowTransferTime(false)}
                            >
                              <Text style={styles.link}>Done</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      <Text style={styles.muted}>
                        The transaction is included in the selected month.
                        Current stock is updated when saved.
                      </Text>
                    </View>
                  )}
                  <TextInput
                    mode="outlined"
                    label="Zinc amount (kg)"
                    value={amount}
                    onChangeText={value => {
                      setAmount(value);
                      setError('');
                      pendingRequest.current = null;
                    }}
                    keyboardType="decimal-pad"
                  />
                  {action === 'receive' && (
                    <TextInput
                      mode="outlined"
                      label="Zinc rate per kg (₹)"
                      value={receiptRate}
                      onChangeText={value => {
                        setReceiptRate(value);
                        setError('');
                        pendingRequest.current = null;
                      }}
                      keyboardType="decimal-pad"
                    />
                  )}
                  {action === 'receive' && (
                    <>
                      <TextInput
                        mode="outlined"
                        label="Batch number (optional)"
                        value={batchNumber}
                        onChangeText={setBatchNumber}
                        maxLength={100}
                      />
                      <TextInput
                        mode="outlined"
                        label="Invoice number (optional)"
                        value={invoiceNumber}
                        onChangeText={setInvoiceNumber}
                        maxLength={100}
                      />
                    </>
                  )}
                  <TextInput
                    mode="outlined"
                    label="Note (optional)"
                    value={note}
                    onChangeText={setNote}
                    maxLength={255}
                  />
                  {preview && !preview.error ? (
                    <View style={styles.preview}>
                      <Text style={styles.heading}>
                        Plant: {zincKg(preview.plant_kg)} kg
                      </Text>
                      <Text style={styles.heading}>
                        Kettle: {zincKg(preview.kettle_kg)} kg
                      </Text>
                      <Text style={styles.muted}>
                        Estimated fill: {preview.level_mm.toFixed(1)} mm
                      </Text>
                    </View>
                  ) : null}
                  {preview?.error || error ? (
                    <Text style={styles.error}>{preview?.error || error}</Text>
                  ) : null}
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.secondary}
                      disabled={movement.isPending}
                      onPress={() => setAction(null)}
                    >
                      <Text style={styles.link}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.button}
                      disabled={movement.isPending}
                      onPress={saveMovement}
                    >
                      <Text style={styles.buttonText}>
                        {movement.isPending
                          ? 'Saving…'
                          : action === 'receive'
                          ? 'Save plant receipt'
                          : 'Confirm transfer'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        transparent
        visible={byproductModal}
        animationType="fade"
        onRequestClose={() => {
          if (!byproduct.isPending) setByproductModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.byproductDialog} accessibilityViewIsModal>
            <View style={styles.dialogHeader}>
              <View style={styles.flexCopy}>
                <Text style={styles.title}>
                  {editingByproduct ? 'Edit collection' : 'New collection'}
                </Text>
                <Text style={styles.muted}>Add ash, dross or both</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close collection form"
                style={styles.iconButton}
                disabled={byproduct.isPending}
                onPress={() => setByproductModal(false)}
              >
                <X size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.dialogContent}
            >
              <View style={styles.card}>
                <Text style={styles.heading}>Ash &amp; dross date</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select ash and dross date"
                  style={styles.secondary}
                  onPress={() => setShowByproductDate(true)}
                >
                  <Text style={styles.link}>
                    {formatDisplayDate(byproductDate)} · Tap to change
                  </Text>
                </TouchableOpacity>
                {showByproductDate && (
                  <View>
                    <DateTimePicker
                      value={parseDateForPicker(byproductDate)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={parseDateForPicker(today())}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android')
                          setShowByproductDate(false);
                        if (event.type !== 'dismissed' && date)
                          setByproductDate(formatDateForApi(date));
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.secondary}
                        onPress={() => setShowByproductDate(false)}
                      >
                        <Text style={styles.link}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <Text style={styles.muted}>
                  Recovery is credited to{' '}
                  {moment(byproductDate).format('MMMM YYYY')}. Choose a past
                  date to record a previous month's ash and dross.
                </Text>
              </View>
              <Text style={styles.muted}>
                {editingByproduct ? 'Original zinc rate' : 'Current zinc rate'}:
                ₹{recoveryRate.toFixed(2)} / kg
              </Text>
              <View style={styles.card}>
                <Text style={styles.heading}>Record ash and dross</Text>
                <TextInput
                  mode="outlined"
                  label="Ash weight (kg)"
                  value={ashWeight}
                  onChangeText={setAshWeight}
                  keyboardType="decimal-pad"
                  style={styles.fullInput}
                />
                <TextInput
                  mode="outlined"
                  label="Ash sell rate / kg"
                  value={ashRate}
                  onChangeText={setAshRate}
                  keyboardType="decimal-pad"
                  style={styles.fullInput}
                />
                <TextInput
                  mode="outlined"
                  label="Dross weight (kg)"
                  value={drossWeight}
                  onChangeText={setDrossWeight}
                  keyboardType="decimal-pad"
                  style={styles.fullInput}
                />
                <TextInput
                  mode="outlined"
                  label="Dross sell rate / kg"
                  value={drossRate}
                  onChangeText={setDrossRate}
                  keyboardType="decimal-pad"
                  style={styles.fullInput}
                />
                <TextInput
                  mode="outlined"
                  label="Note (optional)"
                  value={byproductNote}
                  onChangeText={setByproductNote}
                  maxLength={255}
                  style={styles.fullInput}
                />
                <View style={styles.preview}>
                  <Text style={styles.muted}>
                    Ash GST: ₹{ashGst.toFixed(2)} · Dross GST: ₹
                    {drossGst.toFixed(2)}
                  </Text>
                  <Text style={styles.heading}>
                    Total with GST: ₹{total.toFixed(2)}
                  </Text>
                  <Text style={styles.heading}>
                    Recovered zinc: {recovered.toFixed(3)} kg
                  </Text>
                </View>
                {byproductError ? (
                  <Text style={styles.error}>{byproductError}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.button}
                  disabled={byproduct.isPending}
                  onPress={() => {
                    if (!recoveryRate)
                      return setByproductError(
                        'Receive zinc with its rate before recording ash and dross.',
                      );
                    byproduct.mutate({
                      transaction_date: byproductDate,
                      ash_weight_kg: ashWeight || 0,
                      ash_rate: ashRate || 0,
                      dross_weight_kg: drossWeight || 0,
                      dross_rate: drossRate || 0,
                      note: byproductNote.trim(),
                    });
                  }}
                >
                  <Text style={styles.buttonText}>
                    {byproduct.isPending ? 'Saving…' : 'Save ash & dross entry'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stockActions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  stockAction: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 10,
    minHeight: 52,
  },
  stockActionText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  flexCopy: { flex: 1, gap: 4 },
  recoverySummary: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  heroLabel: { color: COLORS.onHero, fontSize: 11, fontWeight: '600' },
  heroValue: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  heroUnit: { fontSize: 17 },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff30',
    paddingTop: 14,
  },
  heroDetail: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
    borderRadius: UI.radius,
  },
  entryValue: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  collectionRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  entryFoot: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0f172a88',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  byproductDialog: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '88%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  dialogContent: { padding: 4, paddingBottom: 20, gap: 8 },

  stockAlert: {
    backgroundColor: '#fff1e8',
    borderColor: '#ed9a54',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
  },
  stockAlertText: { color: '#8a3b0a', fontWeight: '700' },
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 16, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '700' },
  heading: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  balance: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  settingsButton: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: UI.radiusSmall,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 5,
    borderRadius: UI.radius,
  },
  tab: {
    flex: 1,
    padding: 13,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.muted, fontWeight: '700' },
  activeTabText: { color: COLORS.white },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stockCard: {
    flexGrow: 1,
    flexBasis: 145,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: UI.radius,
    padding: 18,
    gap: 10,
  },
  selectedCard: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 18,
    gap: 14,
    borderRadius: UI.radius,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  fullInput: { width: '100%' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: UI.radiusSmall,
    padding: 15,
    minHeight: 48,
  },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  secondary: {
    padding: 15,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
  },
  link: { color: COLORS.accent, fontWeight: '600' },
  reportButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: UI.radiusSmall,
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  reportButtonText: { color: COLORS.white, fontWeight: '700' },
  preview: {
    padding: 14,
    gap: 7,
    backgroundColor: COLORS.accentSoft,
    borderRadius: UI.radiusSmall,
  },
  error: { color: COLORS.danger, fontSize: 14 },
  success: { color: COLORS.success, fontWeight: '600' },
});
