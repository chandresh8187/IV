import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { calculateRate, defaultRateInputs } from '../../utils/rateCalculator';
import { hasPermission } from '../../utils/permissions';
import { getAverageZincRateApi } from '../../api/zincStockApi';

const fields = [
  ['oldWeight', 'Old weight', 'kg', 'in Kg'],
  ['newWeight', 'New weight', 'kg', 'in Kg'],
  ['drossing', 'Drossing', '%', '0'],
  ['zincRate', 'Zinc rate', '₹ / kg', 'Rs'],
  ['plantCost', 'Plant cost', '₹ / kg', '7'],
  ['profit', 'Profit', '₹ / kg', '3'],
];
const display = value =>
  value == null
    ? '—'
    : value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export default function RateCalculatorScreen() {
  const user = useSelector(state => state.auth.user);
  const { contentMaxWidth, isTablet } = useResponsive();
  const [inputs, setInputs] = useState(defaultRateInputs);
  useFocusEffect(
    useCallback(() => {
      setInputs(defaultRateInputs());
      let active = true;
      getAverageZincRateApi()
        .then(response => {
          const rate = response?.data?.average_zinc_rate;
          if (active && rate != null) {
            setInputs(previous => ({ ...previous, zincRate: String(rate) }));
          }
        })
        .catch(() => {});
      return () => { active = false; };
    }, []),
  );
  const result = calculateRate(inputs);
  if (!hasPermission(user, 'rate_calculator.view'))
    return (
      <View style={styles.page}>
        <Text style={styles.body}>You do not have rate calculator access.</Text>
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          centeredContent(contentMaxWidth),
        ]}
      >
        <Text style={styles.eyebrow}>PRODUCTION / COSTING</Text>
        <Text style={styles.title}>Rate calculator</Text>
        <Text style={styles.body}>
          Enter the weights and costs. Results update automatically as you type.
        </Text>
        <View style={[styles.layout, isTablet && styles.tablet]}>
          <View style={[styles.card, isTablet && styles.tabletCard]}>
            <Text style={styles.heading}>Calculation inputs</Text>
            {fields.map(([key, label, unit, placeholder]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>
                  {label} <Text style={styles.unit}>({unit})</Text>
                </Text>
                <TextInput
                  testID={key}
                  accessibilityLabel={`${label} (${unit})`}
                  keyboardType="decimal-pad"
                  value={inputs[key]}
                  onChangeText={text =>
                    setInputs(previous => ({ ...previous, [key]: text }))
                  }
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.muted}
                  maxLength={16}
                  style={[styles.input, result.errors[key] && styles.invalid]}
                />
                {result.errors[key] && (
                  <Text style={styles.error}>{result.errors[key]}</Text>
                )}
              </View>
            ))}
            <Text style={styles.body}>
              Zinc rate starts with the average of all saved purchase rates and
              remains editable. Blank drossing is treated as 0%.
            </Text>
          </View>
          <View style={[styles.card, isTablet && styles.tabletCard]}>
            <Text style={styles.heading}>Calculated rate</Text>
            {[
              ['Weight difference', result.weightDiff, '%'],
              ['Total zinc', result.totalZinc, '%'],
              ['Subtotal', result.subtotal, '₹ / kg'],
            ].map(([label, value, unit, formula]) => (
              <View key={label} style={styles.result}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                  {display(value)} <Text style={styles.unit}>{unit}</Text>
                </Text>
                <Text style={styles.body}>{formula}</Text>
              </View>
            ))}
            <View style={styles.final}>
              <Text style={styles.finalLabel}>FINAL RATE · ₹ / kg</Text>
              <Text testID="finalRate" style={styles.finalValue}>
                {result.finalRate == null
                  ? '—'
                  : `₹${display(result.finalRate)}`}
              </Text>
            </View>
            {result.errors.calculation && (
              <Text style={styles.error}>{result.errors.calculation}</Text>
            )}
            <Text style={styles.body}>
              Results display two decimal places. Calculations use full
              precision, matching the spreadsheet formulas.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: UI.pagePadding, paddingBottom: 40, gap: 14 },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: { color: COLORS.text, fontSize: 27, fontWeight: '700' },
  body: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },
  heading: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  layout: { gap: 16 },
  tablet: { flexDirection: 'row', alignItems: 'flex-start' },
  tabletCard: { flex: 1 },
  card: {
    minWidth: 0,
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  field: { gap: 7 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  unit: { color: COLORS.gray, fontSize: 13, fontWeight: '400' },
  input: {
    color: COLORS.text,
    fontSize: 17,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: UI.radiusSmall,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  invalid: { borderColor: COLORS.danger },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  result: {
    gap: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  value: { color: COLORS.primary, fontSize: 25, fontWeight: '700' },
  final: {
    backgroundColor: COLORS.primary,
    borderRadius: UI.radiusSmall,
    padding: 18,
    gap: 10,
  },
  finalLabel: { color: COLORS.onHero, fontSize: 12, fontWeight: '700' },
  finalValue: { color: COLORS.white, fontSize: 34, fontWeight: '700' },
  finalHint: { color: COLORS.onHero, fontSize: 12 },
});
