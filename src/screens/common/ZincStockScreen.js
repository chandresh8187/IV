import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Factory, Package, ArrowRightLeft } from 'lucide-react-native';
import {
  getZincStockApi,
  saveZincMovementApi,
} from '../../api/zincStockApi';
import ZincTankVisual from '../../components/ZincTankVisual';
import { COLORS, UI } from '../../assets/Colors';
import { hasPermission } from '../../utils/permissions';
import { centeredContent, useResponsive } from '../../utils/responsive';
import {
  ZINC_KG_PER_MM,
  ZINC_DEPTH_MM,
  parseZincAmount,
  zincKg,
  zincTransferPreview,
} from '../../utils/zincStock';

const requestId = () =>
  `zinc_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random()
    .toString(36)
    .slice(2)}`;

export default function ZincStockScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const canView = hasPermission(user, 'zinc_stock.view');
  const canManage = hasPermission(user, 'zinc_stock.manage');
  const { contentMaxWidth } = useResponsive();
  const client = useQueryClient();
  const [selected, setSelected] = useState('plant');
  const [action, setAction] = useState(null);
  const [amount, setAmount] = useState('');
  const [openingPlant, setOpeningPlant] = useState('');
  const [openingKettle, setOpeningKettle] = useState('');
  const [openingUnit, setOpeningUnit] = useState('kg');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pendingRequest = useRef(null);
  const query = useQuery({
    queryKey: ['zinc-stock'],
    queryFn: getZincStockApi,
    enabled: canView,
    retry: false,
  });
  const stock = query.data?.data;
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (canView) refetch();
    }, [canView, refetch]),
  );
  const refresh = () => {
    client.invalidateQueries({ queryKey: ['zinc-stock'] });
    client.invalidateQueries({ queryKey: ['zinc-stock-movements'] });
  };
  const mutation = useMutation({
    mutationFn: saveZincMovementApi,
    retry: false,
    onSuccess: response => {
      Keyboard.dismiss();
      client.setQueryData(['zinc-stock'], response);
      pendingRequest.current = null;
      setAction(null);
      setAmount('');
      setNote('');
      setError('');
      setSuccess(response.message);
      refresh();
    },
    onError: failure => {
      setError(
        failure?.response?.data?.message ||
          'Could not confirm the save. Retry the same entry to check it without recording it twice.',
      );
      if (failure?.response?.status === 409) {
        pendingRequest.current = null;
        refresh();
      }
    },
  });
  const busy = mutation.isPending;
  const formAction = stock && !stock.initialized ? 'initialize' : action;
  const change = setter => value => {
    setter(value);
    setError('');
  };
  const openForm = type => {
    setAction(type);
    setAmount('');
    if (type === 'adjust') {
      setOpeningPlant(String(stock.plant_kg));
      setOpeningKettle(String(stock.kettle_kg));
      setOpeningUnit('kg');
    }
    setNote('');
    setError('');
    setSuccess('');
    pendingRequest.current = null;
  };
  const preview =
    formAction === 'transfer' && amount && stock
      ? zincTransferPreview(stock, amount)
      : null;

  const save = () => {
    if (busy || !canManage || !stock || query.isError) return;
    const payload = { action: formAction, note: note.trim() };
    if (['initialize', 'adjust'].includes(formAction)) {
      const plant = parseZincAmount(openingPlant, true);
      const kettle = parseZincAmount(openingKettle, true);
      if (plant == null || kettle == null)
        return setError(
          'Enter both opening balances, including 0 if there is no stock. Use up to 3 decimal places.',
        );
      const kettleKg =
        openingUnit === 'mm'
          ? Math.round(kettle * ZINC_KG_PER_MM * 1000) / 1000
          : kettle;
      if (kettleKg > ZINC_DEPTH_MM * ZINC_KG_PER_MM)
        return setError('Kettle stock exceeds the tank volume.');
      Object.assign(payload, {
        plant_kg: plant,
        kettle_kg: kettleKg,
        kg_per_mm: ZINC_KG_PER_MM,
      });
    } else {
      const kg = parseZincAmount(amount);
      if (kg == null)
        return setError(
          'Enter kilograms greater than zero, with up to 3 decimal places.',
        );
      if (formAction === 'transfer' && preview?.error)
        return setError(preview.error);
      payload.amount_kg = kg;
    }
    const signature = JSON.stringify(payload);
    // Preserve the exact request through timeouts, even if a socket refreshes balances.
    if (pendingRequest.current?.signature !== signature) {
      pendingRequest.current = {
        signature,
        body: {
          ...payload,
          expected_revision: stock.revision,
          request_id: requestId(),
        },
      };
    }
    setError('');
    setSuccess('');
    mutation.mutate(pendingRequest.current.body);
  };

  if (!canView)
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>You do not have zinc stock access.</Text>
      </View>
    );
  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, centeredContent(contentMaxWidth)]}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={refresh} />
      }
    >
      <Text style={styles.title}>Zinc Stock</Text>
      <Text style={styles.muted}>
        Track plant inventory and zinc transferred into the kettle.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.reportButton}
        onPress={() => navigation.navigate('ZincStockReport')}
      >
        <Text style={styles.reportButtonText}>View Zinc Report</Text>
      </TouchableOpacity>
      {query.isLoading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : query.isError ? (
        <View style={styles.card}>
          <Text style={styles.error}>
            {query.error?.response?.data?.message ||
              'Could not load zinc stock.'}
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={refresh}>
            <Text style={styles.link}>Retry stock</Text>
          </TouchableOpacity>
        </View>
      ) : stock ? (
        <>
          <View style={styles.options}>
            {[
              {
                key: 'plant',
                title: 'Stock in Plant',
                Icon: Factory,
                kg: stock.plant_kg,
              },
              {
                key: 'kettle',
                title: 'Stock in Kettle',
                Icon: Package,
                kg: stock.kettle_kg,
              },
            ].map(({ key, title, Icon, kg }) => (
              <TouchableOpacity
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: selected === key }}
                style={[
                  styles.stockCard,
                  selected === key && styles.selectedCard,
                ]}
                onPress={() => setSelected(key)}
              >
                <Icon size={24} color={COLORS.accent} />
                <Text style={styles.heading}>{title}</Text>
                <Text style={styles.balance}>
                  {stock.initialized ? `${zincKg(kg)} kg` : 'Not set'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {success ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              {success}
            </Text>
          ) : null}
          {!stock.initialized && (
            <View style={styles.card}>
              <Text style={styles.heading}>Set opening stock</Text>
              <Text style={styles.muted}>
                Enter zinc already in the plant and kettle separately. Opening
                kettle stock is not deducted from opening plant stock.
              </Text>
              {!canManage && (
                <Text style={styles.muted}>
                  Ask a plant manager or superadmin to set the opening balances.
                </Text>
              )}
            </View>
          )}
          {stock.initialized && canManage && !action && (
            <View style={styles.actionGroup}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.button}
                onPress={() =>
                  openForm(selected === 'plant' ? 'receive' : 'transfer')
                }
              >
                <ArrowRightLeft size={18} color={COLORS.white} />
                <Text style={styles.buttonText}>
                  {selected === 'plant'
                    ? 'Add zinc to plant'
                    : 'Add zinc to kettle'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.secondary}
                onPress={() => openForm('adjust')}
              >
                <Text style={styles.link}>Change plant and kettle stock</Text>
              </TouchableOpacity>
            </View>
          )}
          {canManage && formAction && (
            <View style={styles.card}>
              <Text style={styles.heading}>
                {formAction === 'initialize'
                  ? 'Opening balances'
                  : formAction === 'adjust'
                  ? 'Change stock balances'
                  : formAction === 'receive'
                  ? 'Receive zinc in plant'
                  : 'Transfer from plant to kettle'}
              </Text>
              {['initialize', 'adjust'].includes(formAction) ? (
                <>
                  <TextInput
                    mode="outlined"
                    label={
                      formAction === 'initialize'
                        ? 'Opening plant stock (kg)'
                        : 'Plant stock (kg)'
                    }
                    value={openingPlant}
                    onChangeText={change(setOpeningPlant)}
                    keyboardType="decimal-pad"
                    editable={!busy}
                  />
                  <View style={styles.row}>
                    <Text style={styles.muted}>
                      {formAction === 'initialize'
                        ? 'Enter kettle opening stock in'
                        : 'Enter corrected kettle stock in'}
                    </Text>
                    {['kg', 'mm'].map(unit => (
                      <TouchableOpacity
                        key={unit}
                        accessibilityRole="button"
                        accessibilityState={{ selected: openingUnit === unit }}
                        disabled={busy}
                        style={[
                          styles.unitButton,
                          openingUnit === unit && styles.selectedCard,
                        ]}
                        onPress={() => {
                          setOpeningUnit(unit);
                          setOpeningKettle('');
                          setError('');
                        }}
                      >
                        <Text style={styles.link}>{unit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    mode="outlined"
                    label={
                      openingUnit === 'kg'
                        ? formAction === 'initialize'
                          ? 'Opening kettle stock (kg)'
                          : 'Kettle stock (kg)'
                        : 'Kettle fill height from bottom (mm)'
                    }
                    value={openingKettle}
                    onChangeText={change(setOpeningKettle)}
                    keyboardType="decimal-pad"
                    editable={!busy}
                  />
                  <Text style={styles.muted}>
                    Internal tank: 5 m × 1 m × 1.25 m. Estimated molten zinc
                    density: 7.13 g/cm³ (35.65 kg/mm).
                  </Text>
                  {formAction === 'adjust' && (
                    <Text style={styles.muted}>
                      Saving replaces both recorded balances and keeps an audit
                      entry. Use this only to correct verified physical stock.
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <TextInput
                    mode="outlined"
                    label="Zinc amount (kg)"
                    value={amount}
                    onChangeText={change(setAmount)}
                    keyboardType="decimal-pad"
                    editable={!busy}
                  />
                  {formAction === 'transfer' && (
                    <Text style={styles.muted}>
                      The same amount is deducted from plant stock and added to
                      kettle stock.
                    </Text>
                  )}
                  {preview && !preview.error && (
                    <View style={styles.preview}>
                      <Text style={styles.muted}>After transfer</Text>
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
                  )}
                  {preview?.error && (
                    <Text style={styles.error}>{preview.error}</Text>
                  )}
                </>
              )}
              <TextInput
                mode="outlined"
                label="Note (optional)"
                value={note}
                onChangeText={change(setNote)}
                maxLength={255}
                editable={!busy}
              />
              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {error}
                </Text>
              ) : null}
              <View style={styles.row}>
                {formAction !== 'initialize' && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.secondary}
                    disabled={busy}
                    onPress={() => {
                      setAction(null);
                      setError('');
                    }}
                  >
                    <Text style={styles.link}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.button, busy && styles.disabled]}
                  disabled={busy}
                  onPress={save}
                >
                  {busy ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>
                      {formAction === 'initialize'
                        ? 'Save opening stock'
                        : formAction === 'adjust'
                        ? 'Save changed balances'
                        : formAction === 'receive'
                        ? 'Save plant receipt'
                        : 'Confirm transfer'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
            {stock.initialized && (
              <>
                <View style={styles.options}>
                  <View style={styles.metric}>
                    <Text style={styles.balance}>
                      {Number(stock.level_mm).toFixed(1)} mm
                    </Text>
                    <Text style={styles.muted}>Estimated fill height</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.balance}>
                      {zincKg(stock.kettle_kg)} kg
                    </Text>
                    <Text style={styles.muted}>Zinc in kettle</Text>
                  </View>
                </View>
                <Text style={styles.muted}>
                  {Number(stock.fill_percent).toFixed(1)}% of tank volume ·{' '}
                  {zincKg(stock.capacity_kg)} kg at full geometric volume
                </Text>
              </>
            )}
            <Text style={styles.muted}>
              Estimated from recorded stock, not a sensor reading. Level assumes
              internal dimensions and molten zinc density. Saved production
              consumption is deducted automatically; record other losses by
              changing the stock balance.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '700' },
  heading: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  balance: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  reportButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: UI.radiusSmall,
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  reportButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
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
    gap: 16,
    borderRadius: UI.radius,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  actionGroup: { gap: 10 },
  button: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: UI.radiusSmall,
    padding: 15,
    minHeight: 48,
  },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  secondary: {
    padding: 15,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
  },
  link: { color: COLORS.accent, fontWeight: '600' },
  unitButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: UI.radiusSmall,
    minWidth: 48,
    alignItems: 'center',
  },
  preview: {
    padding: 14,
    gap: 8,
    backgroundColor: COLORS.accentSoft,
    borderRadius: UI.radiusSmall,
  },
  metric: { flexGrow: 1, gap: 5 },
  error: { color: COLORS.danger, fontSize: 14, lineHeight: 21 },
  success: { color: COLORS.success, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
