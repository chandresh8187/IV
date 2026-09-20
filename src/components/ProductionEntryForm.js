import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock3, X } from 'lucide-react-native';
import moment from 'moment';
import ResponsiveGrid from './ResponsiveGrid';
import { planningFormFields } from '../utils/productionDefaults';
import { centeredContent, useResponsive } from '../utils/responsive';
import {
  formatMaterialDescription,
  formatNumber,
  formatQuantity,
  formatTimeForApi,
  parseTimeForPicker,
} from '../utils/format';
import { COLORS, PAPER_THEME, UI } from '../assets/Colors';

const ClockIcon = () => <Clock3 size={21} color={COLORS.primary} />;
function FormInput({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  editable = true,
  multiline = false,
  numberOfLines = 1,
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      keyboardType={keyboardType}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={[styles.input, !editable && styles.inputDisabled]}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      textColor={COLORS.text}
      theme={PAPER_THEME}
    />
  );
}

export default function ProductionEntryForm({
  fullForm,
  setFullForm,
  formExistingEntry = false,
  canManageAllProduction = false,
  correctionMode = false,
  selectablePlanning = [],
  activePlanning = null,
  loading = false,
  onSave,
  onClose,
  subtitle,
  contractors = null,
  contractorsLoading = false,
  contractorsError = false,
  onRetryContractors,
  defaults = {},
  defaultsBusy = false,
  defaultsError = false,
  onSetDefault,
}) {
  const { workspaceFormMaxWidth } = useResponsive();
  const coatingInputs = useRef([]);
  const [contractorOpen, setContractorOpen] = useState(false);
  const [correctionPlanOpen, setCorrectionPlanOpen] = useState(false);
  const [showProductionTimePicker, setShowProductionTimePicker] =
    useState(false);
  const [productionTimePickerValue, setProductionTimePickerValue] = useState(
    new Date(),
  );
  const openProductionTimePicker = () => {
    const selectedDate = parseTimeForPicker(fullForm.production_time);

    setProductionTimePickerValue(selectedDate);
    setShowProductionTimePicker(true);
  };

  const selectProductionTime = date => {
    if (!date) {
      return;
    }

    const selectedDate = parseTimeForPicker(date);

    setProductionTimePickerValue(selectedDate);
    setFullForm(prev => ({
      ...prev,
      production_time: formatTimeForApi(selectedDate),
    }));
    setShowProductionTimePicker(false);
  };

  const previewZinc = (() => {
    const ms = Number(fullForm.ms_weight);
    const gi = Number(fullForm.gi_weight);

    if (!ms || !gi) return '';

    return (((gi - ms) / ms) * 100).toFixed(2);
  })();

  const previewAvgCoating = (() => {
    const values = [
      fullForm.c1,
      fullForm.c2,
      fullForm.c3,
      fullForm.c4,
      fullForm.c5,
    ]
      .filter(v => v !== '' && v !== null && v !== undefined)
      .map(Number)
      .filter(v => Number.isFinite(v) && v >= 0);

    if (values.length === 0) return '';

    return formatNumber(values.reduce((a, b) => a + b, 0) / values.length, '');
  })();

  return (
    <SafeAreaView style={styles.modalSafe}>
      <View style={styles.modalHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.modalTitle}>
            {formExistingEntry ? 'Edit Production Entry' : 'Production Entry'}
          </Text>
          <Text style={styles.modalDesc}>
            {subtitle || 'Output, weights and coating readings'}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close production form"
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.closeBtn}
        >
          <X size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.modalBody,
          centeredContent(workspaceFormMaxWidth),
        ]}
      >
        <ResponsiveGrid minColumnWidth={360}>
          <FormCard title="Production Details">
            {!!fullForm.entry_id &&
              !canManageAllProduction &&
              !correctionMode && (
                <Text style={styles.srHint}>
                  This entry is unlocked for one edit. Access closes after a
                  successful save.
                </Text>
              )}

            {!formExistingEntry && (
              <View style={styles.automaticPlanCard}>
                <Text style={styles.srHint}>
                  Select the challan for this production entry. Planned quantity
                  limits still apply.
                </Text>
                <DropDownPicker
                  testID="planning-selector"
                  open={correctionPlanOpen}
                  setOpen={setCorrectionPlanOpen}
                  value={fullForm.planning_item_id}
                  items={selectablePlanning.map(item => ({
                    value: Number(item.planning_item_id),
                    label: `${item.challan_no} · ${
                      item.party_name || ''
                    } · ${formatMaterialDescription(
                      item.material_description,
                    )} · ${formatQuantity(item.remaining_qty)} NOS remaining`,
                  }))}
                  setValue={callback => {
                    const nextId =
                      typeof callback === 'function'
                        ? callback(fullForm.planning_item_id)
                        : callback;
                    const item = selectablePlanning.find(
                      candidate =>
                        Number(candidate.planning_item_id) === Number(nextId),
                    );
                    setFullForm(prev => ({
                      ...prev,
                      ...planningFormFields(item),
                    }));
                  }}
                  listMode="MODAL"
                  searchable
                  placeholder="Select planning challan item"
                />
                {onSetDefault && !!fullForm.planning_item_id && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Toggle default challan"
                    disabled={defaultsBusy || defaultsError}
                    style={styles.defaultButton}
                    onPress={() =>
                      onSetDefault({
                        planning_item_id:
                          Number(defaults.default_planning_item_id) ===
                          Number(fullForm.planning_item_id)
                            ? null
                            : Number(fullForm.planning_item_id),
                      })
                    }
                  >
                    <Text style={styles.defaultText}>
                      {Number(defaults.default_planning_item_id) ===
                      Number(fullForm.planning_item_id)
                        ? 'Default challan · Remove default'
                        : 'Make default challan & material'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {fullForm.challan_no ? (
              <View style={styles.automaticPlanCard}>
                <View style={styles.automaticPlanTop}>
                  <Text style={styles.automaticPlanLabel}>
                    {formExistingEntry
                      ? 'LINKED PRODUCTION ITEM'
                      : 'SELECTED CHALLAN'}
                  </Text>
                  {!formExistingEntry && activePlanning ? (
                    <Text style={styles.automaticPlanSequence}>
                      ITEM {activePlanning.sequence_no}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.automaticPlanChallan}>
                  {fullForm.challan_no}
                </Text>
                <Text style={styles.automaticPlanParty}>
                  {fullForm.party_name}
                </Text>
                <Text style={styles.automaticPlanMaterial}>
                  {formatMaterialDescription(
                    fullForm.material_description || fullForm.material,
                  )}
                </Text>
                {!formExistingEntry && activePlanning ? (
                  <View style={styles.automaticPlanProgress}>
                    <Text style={styles.automaticPlanProgressText}>
                      {formatQuantity(activePlanning.completed_qty)} /{' '}
                      {formatQuantity(activePlanning.planned_qty)} NOS completed
                    </Text>
                    <Text style={styles.automaticPlanRemaining}>
                      {formatQuantity(activePlanning.remaining_qty)} NOS
                      remaining
                    </Text>
                    <Text style={styles.automaticPlanRemaining}>
                      Balance after this entry:{' '}
                      {formatQuantity(
                        Number(activePlanning.remaining_qty) -
                          (Number(fullForm.dipping_qty) || 0),
                      )}{' '}
                      NOS
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.noPlanCard}>
                <Text style={styles.noPlanTitle}>
                  Select a planning challan above
                </Text>
                <Text style={styles.noPlanText}>
                  Choose a pending challan. If the list is empty, add production
                  planning first.
                </Text>
              </View>
            )}

            {contractors !== null ? (
              <View style={styles.contractorCard}>
                <Text style={styles.formTitle}>Contractor</Text>
                <DropDownPicker
                  testID="contractor-selector"
                  open={contractorOpen}
                  setOpen={setContractorOpen}
                  value={fullForm.contractor_id || 0}
                  items={[
                    { label: 'No contractor selected', value: 0 },
                    ...contractors.map(item => ({
                      label: item.name,
                      value: Number(item.id),
                    })),
                  ]}
                  setValue={callback => {
                    const value =
                      typeof callback === 'function'
                        ? callback(fullForm.contractor_id || 0)
                        : callback;
                    setFullForm(prev => ({
                      ...prev,
                      contractor_id: Number(value) || null,
                    }));
                  }}
                  listMode="MODAL"
                  searchable
                  disabled={loading || contractorsLoading}
                  placeholder="Select contractor"
                />
                {contractorsLoading && (
                  <ActivityIndicator color={COLORS.primary} />
                )}
                {contractorsError && (
                  <TouchableOpacity
                    onPress={onRetryContractors}
                    accessibilityRole="button"
                    style={styles.defaultButton}
                  >
                    <Text style={styles.defaultText}>
                      Could not load contractors · Retry
                    </Text>
                  </TouchableOpacity>
                )}
                {!contractorsLoading &&
                  !contractorsError &&
                  !contractors.length && (
                    <Text style={styles.coatingHint}>
                      Add contractors in Settings → Contractors.
                    </Text>
                  )}
                {!formExistingEntry &&
                  onSetDefault &&
                  !!fullForm.contractor_id && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Toggle default contractor"
                      disabled={
                        defaultsBusy || defaultsError || contractorsError
                      }
                      style={styles.defaultButton}
                      onPress={() =>
                        onSetDefault({
                          contractor_id:
                            Number(defaults.default_contractor_id) ===
                            Number(fullForm.contractor_id)
                              ? null
                              : Number(fullForm.contractor_id),
                        })
                      }
                    >
                      <Text style={styles.defaultText}>
                        {Number(defaults.default_contractor_id) ===
                        Number(fullForm.contractor_id)
                          ? 'Default contractor · Remove default'
                          : 'Make default contractor'}
                      </Text>
                    </TouchableOpacity>
                  )}
                {!formExistingEntry && (
                  <Text style={styles.coatingHint}>
                    Defaults apply only to your next new entries. You can change
                    either selection for this entry.
                  </Text>
                )}
                {defaultsError && (
                  <Text style={styles.coatingHint}>
                    Could not load defaults. Select manually or reopen the form
                    after refreshing.
                  </Text>
                )}
              </View>
            ) : fullForm.contractor_name ? (
              <FormInput
                label="Contractor"
                value={fullForm.contractor_name}
                editable={false}
              />
            ) : null}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={openProductionTimePicker}
            >
              <View pointerEvents="none">
                <TextInput
                  label="Production Time"
                  value={
                    fullForm.production_time
                      ? moment(fullForm.production_time, [
                          'HH:mm:ss',
                          'HH:mm',
                          'hh:mm A',
                        ]).format('hh:mm A')
                      : ''
                  }
                  placeholder="Select production time"
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                  outlineColor={COLORS.inputBorder}
                  activeOutlineColor={COLORS.accent}
                  textColor={COLORS.text}
                  placeholderTextColor={COLORS.gray}
                  theme={PAPER_THEME}
                  right={<TextInput.Icon icon={ClockIcon} />}
                />
              </View>
            </TouchableOpacity>

            <FormInput
              label="Dipping Qty"
              value={fullForm.dipping_qty}
              keyboardType="numeric"
              onChangeText={v =>
                setFullForm(prev => ({ ...prev, dipping_qty: v }))
              }
            />

            <FormInput
              label="Kettle Temperature °C"
              value={fullForm.kettle_temperature}
              keyboardType="numeric"
              onChangeText={v =>
                setFullForm(prev => ({ ...prev, kettle_temperature: v }))
              }
            />
          </FormCard>

          <View>
            <FormCard title="Weight Details">
              <FormInput
                label="MS Weight 1 Nos"
                value={fullForm.ms_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, ms_weight: v }))
                }
              />

              <FormInput
                label="GI Weight 1 Nos"
                value={fullForm.gi_weight}
                keyboardType="numeric"
                onChangeText={v =>
                  setFullForm(prev => ({ ...prev, gi_weight: v }))
                }
              />

              {previewZinc !== '' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Zinc Consumption</Text>
                  <Text style={styles.previewValue}>{previewZinc}%</Text>
                </View>
              )}
            </FormCard>

            <FormCard title="Coating Details">
              <View style={styles.coatingRow}>
                {['c1', 'c2', 'c3', 'c4', 'c5'].map((key, index) => (
                  <TextInput
                    key={key}
                    ref={input => {
                      coatingInputs.current[index] = input;
                    }}
                    label={`C${index + 1}`}
                    accessibilityLabel={`Coating reading C${index + 1}`}
                    value={fullForm[key]}
                    onChangeText={v => {
                      if (!/^\d{0,3}$/.test(v)) return;
                      setFullForm(prev => ({ ...prev, [key]: v }));
                      if (
                        v.length === 3 &&
                        v !== String(fullForm[key] ?? '') &&
                        String(fullForm[key] ?? '').length <= 3
                      ) {
                        coatingInputs.current[index + 1]?.focus();
                      }
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !fullForm[key]) {
                        coatingInputs.current[index - 1]?.focus();
                      }
                    }}
                    onSubmitEditing={() => {
                      if (index < 4) {
                        coatingInputs.current[index + 1]?.focus();
                      } else {
                        coatingInputs.current[index]?.blur();
                      }
                    }}
                    returnKeyType={index < 4 ? 'next' : 'done'}
                    submitBehavior={index < 4 ? 'submit' : 'blurAndSubmit'}
                    selectTextOnFocus
                    maxLength={3}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.coatingInput}
                    contentStyle={styles.coatingInputContent}
                    outlineColor={COLORS.inputBorder}
                    activeOutlineColor={COLORS.accent}
                    textColor={COLORS.text}
                    theme={PAPER_THEME}
                  />
                ))}
              </View>
              <Text style={styles.coatingHint}>
                3 digits move to the next reading automatically. For 2 digits,
                tap Next or the next box. Backspace in an empty box goes back.
              </Text>

              {previewAvgCoating !== '' && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Average Coating</Text>
                  <Text style={styles.previewValue}>{previewAvgCoating}</Text>
                </View>
              )}
            </FormCard>
          </View>
        </ResponsiveGrid>
        <SaveButton
          loading={loading}
          title="SAVE PRODUCTION ENTRY"
          onPress={onSave}
        />
      </ScrollView>

      {showProductionTimePicker && (
        <DateTimePicker
          value={productionTimePickerValue}
          mode="time"
          display="clock"
          is24Hour={false}
          onChange={(event, date) => {
            setShowProductionTimePicker(false);
            if (event?.type === 'set' && date) {
              selectProductionTime(date);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
function FormCard({ title, children }) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SaveButton({ title, loading, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.saveBtn}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.saveText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  contractorCard: { marginBottom: 14, gap: 8 },
  defaultButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  defaultText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  modalSafe: { flex: 1, backgroundColor: COLORS.bg },

  modalHeader: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  modalDesc: { color: COLORS.gray, fontSize: 14, marginTop: 3 },

  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: { padding: 16 },
  formCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 18,
    elevation: 1,
    marginVertical: 10,
  },

  formTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },

  input: { backgroundColor: COLORS.white, marginBottom: 14 },
  inputDisabled: { backgroundColor: COLORS.bg },

  srHint: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 12,
  },

  automaticPlanCard: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: UI.radius,
    backgroundColor: COLORS.accentSoft,
    padding: 15,
    marginBottom: 14,
  },
  automaticPlanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  automaticPlanLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  automaticPlanSequence: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: UI.radiusSmall,
  },
  automaticPlanChallan: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 10,
  },
  automaticPlanMaterial: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  automaticPlanParty: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  automaticPlanProgress: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderStrong,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  automaticPlanProgressText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  automaticPlanRemaining: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  noPlanCard: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: UI.radius,
    backgroundColor: COLORS.dangerSoft,
    padding: 15,
    marginBottom: 14,
  },
  noPlanTitle: {
    color: COLORS.danger,
    fontSize: 13.5,
    fontWeight: '700',
  },
  noPlanText: {
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  coatingRow: { flexDirection: 'row', gap: 6 },

  coatingInput: {
    minWidth: 0,
    flex: 1,
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },
  coatingInputContent: { textAlign: 'center', paddingHorizontal: 4 },
  coatingHint: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },

  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  previewBox: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: UI.radiusSmall,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  previewLabel: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  previewValue: {
    fontVariant: ['tabular-nums'],
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
});
