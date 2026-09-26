import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  getPreviousShiftsApi,
  openShiftCorrectionApi,
  resumeCurrentShiftApi,
} from '../api/shiftApi';
import {
  formatDateForApi,
  formatDisplayDate,
  parseDateForPicker,
} from '../utils/format';
import { COLORS, UI } from '../assets/Colors';

export default function ShiftCorrectionControls({
  status,
  canManage,
  canAddZinc = false,
  onAddZinc,
  zincBusy = false,
  correctionUsers = [],
}) {
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [picker, setPicker] = useState(false);
  const [date, setDate] = useState(() => formatDateForApi(new Date()));
  const [shiftId, setShiftId] = useState(null);
  const [revision, setRevision] = useState(0);
  const [userId, setUserId] = useState(null);
  const [userOpen, setUserOpen] = useState(false);
  const shifts = useQuery({
    queryKey: ['correction-shifts', date],
    queryFn: () => getPreviousShiftsApi(date),
    enabled: visible && canManage,
  });
  const mutation = useMutation({
    mutationFn: ({ resume, ...body }) =>
      resume ? resumeCurrentShiftApi(body) : openShiftCorrectionApi(body),
    onSuccess: response => {
      setVisible(false);
      [
        'shift-status',
        'productions',
        'available-production-planning',
        'correction-planning-items',
        'correction-shifts',
      ].forEach(key => client.invalidateQueries({ queryKey: [key] }));
      Alert.alert('Production shift updated', response.message);
    },
    onError: error => {
      client.invalidateQueries({ queryKey: ['shift-status'] });
      setVisible(false);
      Alert.alert(
        'Could not change shift',
        error?.response?.data?.message || 'Please try again.',
      );
    },
  });
  if (!canManage && !status?.correction_mode && !canAddZinc) return null;
  const target = status?.production_shift;
  return (
    <View
      style={[styles.panel, status?.correction_mode && styles.correctionPanel]}
    >
      {status?.correction_mode && (
        <View style={styles.correctionSummary}>
          <Text style={styles.correctionTitle}>PREVIOUS SHIFT</Text>
          <Text style={styles.correctionMeta}>
            {formatDisplayDate(target?.shift_date)} ·{' '}
            {target?.shift_name?.toUpperCase()}
          </Text>
        </View>
      )}
      {(canManage || canAddZinc) && (
        <View style={styles.actions}>
          {canManage && !status?.correction_active && (
            <TouchableOpacity
              style={styles.button}
              disabled={mutation.isPending || !status}
              onPress={() => {
                setShiftId(null);
                setUserId(null);
                setRevision(status?.shift_revision || 0);
                setVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Correct previous shift</Text>
            </TouchableOpacity>
          )}
          {canAddZinc && (
            <TouchableOpacity
              style={[styles.button, styles.zincButton]}
              disabled={zincBusy}
              onPress={onAddZinc}
            >
              <Text style={[styles.buttonText, styles.zincText]}>Add zinc</Text>
            </TouchableOpacity>
          )}
          {(status?.correction_mode || (canManage && status?.correction_active)) && (
            <TouchableOpacity
              style={[styles.button, styles.resumeButton]}
              disabled={mutation.isPending}
              onPress={() => {
                Alert.alert(
                  'Resume current shift?',
                  'Live Production on all devices will return to the running shift.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Resume',
                      onPress: () =>
                        mutation.mutate({
                          resume: true,
                          revision: status.shift_revision,
                        }),
                    },
                  ],
                );
              }}
            >
              <Text style={[styles.buttonText, styles.resumeText]}>
                {mutation.isPending ? 'Resuming…' : 'Resume current shift'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => !mutation.isPending && setVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.heading}>Correct a previous shift</Text>
            <Text style={styles.text}>
              Choose the production date, then an ended shift. All users will
              see its entries in Live Production until you resume the current
              shift.
            </Text>
            <DropDownPicker
              open={userOpen}
              setOpen={setUserOpen}
              value={userId}
              setValue={setUserId}
              items={correctionUsers}
              listMode="MODAL"
              searchable
              placeholder="Select correction user"
              disabled={mutation.isPending}
              style={styles.choice}
            />
            <TouchableOpacity
              style={styles.choice}
              onPress={() => setPicker(true)}
              disabled={mutation.isPending}
            >
              <Text style={styles.title}>Production date: {date}</Text>
            </TouchableOpacity>
            {picker && (
              <DateTimePicker
                value={parseDateForPicker(date)}
                mode="date"
                maximumDate={new Date()}
                onChange={(event, value) => {
                  setPicker(false);
                  if (event.type === 'set' && value) {
                    setDate(formatDateForApi(value));
                    setShiftId(null);
                  }
                }}
              />
            )}
            {shifts.isLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : shifts.isError ? (
              <TouchableOpacity onPress={() => shifts.refetch()}>
                <Text style={styles.text}>
                  Could not load shifts. Tap to retry.
                </Text>
              </TouchableOpacity>
            ) : (shifts.data?.data || []).length === 0 ? (
              <Text style={styles.text}>
                No ended shifts exist for this date.
              </Text>
            ) : (
              shifts.data.data.map(shift => (
                <TouchableOpacity
                  key={shift.id}
                  disabled={mutation.isPending}
                  style={[
                    styles.choice,
                    shiftId === shift.id && styles.selected,
                  ]}
                  onPress={() => setShiftId(shift.id)}
                >
                  <Text style={styles.title}>
                    {shift.shift_name.toUpperCase()} SHIFT
                  </Text>
                  <Text style={styles.text}>
                    {shift.entry_count} saved entries{' '}
                    {shiftId === shift.id ? '· Selected' : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[
                styles.button,
                (!shiftId || !userId || mutation.isPending) && styles.disabled,
              ]}
              disabled={!shiftId || !userId || mutation.isPending}
              onPress={() => mutation.mutate({ shift_id: shiftId, user_id: userId, revision })}
            >
              <Text style={styles.buttonText}>
                {mutation.isPending ? 'Saving…' : 'Save and open this shift'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choice}
              disabled={mutation.isPending}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.title}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  correctionPanel: {
    backgroundColor: COLORS.warningSoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    paddingVertical: 8,
  },
  correctionSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 6,
  },
  correctionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  correctionMeta: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  resumeButton: { backgroundColor: COLORS.primary },
  resumeText: { color: COLORS.white },
  zincButton: { backgroundColor: COLORS.accent },
  zincText: { color: COLORS.white },
  title: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  text: { color: COLORS.text, fontSize: 12, lineHeight: 18, marginVertical: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    minHeight: 44,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: 13,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, gap: 10 },
  heading: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  choice: {
    padding: 15,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  disabled: { opacity: 0.5 },
});
