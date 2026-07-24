import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Factory,
  PlayCircle,
  Settings,
  Square,
} from 'lucide-react-native';

import {
  changePlantStatusApi,
  getPlantStatusApi,
  getPlantStatusHistoryApi,
} from '../../api/plantStatusApi';
import { getShiftStatusApi } from '../../api/shiftApi';
import { socket } from '../../socket/socket';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const STATUS_META = {
  running: {
    label: 'Running',
    color: COLORS.success,
    background: '#DCFCE7',
    icon: PlayCircle,
  },
  maintenance: {
    label: 'Maintenance',
    color: COLORS.warning,
    background: '#FEF3C7',
    icon: Settings,
  },
  stopped: {
    label: 'Stopped',
    color: COLORS.danger,
    background: '#FEE2E2',
    icon: Square,
  },
};

export default function PlantControlScreen() {
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();
  const [selectedStatus, setSelectedStatus] = useState('maintenance');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expectedRestartAt, setExpectedRestartAt] = useState(null);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [restartPickerMode, setRestartPickerMode] = useState('date');

  const statusQuery = useQuery({
    queryKey: ['plant-status'],
    queryFn: getPlantStatusApi,
  });

  const shiftQuery = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
    refetchInterval: 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['plant-status-history'],
    queryFn: () => getPlantStatusHistoryApi({ page: 1, limit: 10 }),
  });

  const mutation = useMutation({
    mutationFn: changePlantStatusApi,
    onSuccess: response => {
      Alert.alert('Success', response?.message || 'Plant status updated');
      setTitle('');
      setMessage('');
      setExpectedRestartAt(null);
      invalidatePlantData();
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Unable to update plant status',
      );
    },
  });

  const invalidatePlantData = () => {
    queryClient.invalidateQueries({ queryKey: ['plant-status'] });
    queryClient.invalidateQueries({ queryKey: ['plant-status-history'] });
    queryClient.invalidateQueries({ queryKey: ['shift-status'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['productions'] });
  };

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('plant_status_updated', invalidatePlantData);
    return () => socket.off('plant_status_updated', invalidatePlantData);
  }, [queryClient]);

  const current = statusQuery.data?.data || {};
  const currentStatus = current.status || 'running';
  const meta = STATUS_META[currentStatus] || STATUS_META.running;
  const CurrentIcon = meta.icon;

  const shift = shiftQuery.data?.data || {};
  const history = useMemo(
    () => historyQuery.data?.data || [],
    [historyQuery.data],
  );

  const selectStatus = status => {
    if (!['maintenance', 'stopped'].includes(status)) {
      return;
    }

    setSelectedStatus(status);
  };

  const openRestartPicker = () => {
    setRestartPickerMode('date');
    setShowDateTimePicker(true);
  };

  const handleRestartPickerChange = (event, selectedValue) => {
    if (event?.type === 'dismissed') {
      setShowDateTimePicker(false);
      return;
    }

    if (!selectedValue) {
      return;
    }

    const currentValue = expectedRestartAt
      ? new Date(expectedRestartAt)
      : new Date();

    if (restartPickerMode === 'date') {
      const combinedDateTime = new Date(currentValue);

      combinedDateTime.setFullYear(
        selectedValue.getFullYear(),
        selectedValue.getMonth(),
        selectedValue.getDate(),
      );

      setExpectedRestartAt(combinedDateTime);
      setShowDateTimePicker(false);

      setTimeout(() => {
        setRestartPickerMode('time');
        setShowDateTimePicker(true);
      }, 250);

      return;
    }

    const combinedDateTime = new Date(currentValue);

    combinedDateTime.setHours(
      selectedValue.getHours(),
      selectedValue.getMinutes(),
      0,
      0,
    );

    setExpectedRestartAt(combinedDateTime);
    setShowDateTimePicker(false);
  };

  const submit = statusOverride => {
    const statusToSave = statusOverride || selectedStatus;

    if (!['running', 'maintenance', 'stopped'].includes(statusToSave)) {
      Alert.alert('Invalid Status', 'Please select a valid plant status');
      return;
    }

    if (statusToSave !== 'running' && (!title.trim() || !message.trim())) {
      Alert.alert('Required', 'Please enter title and reason');
      return;
    }

    Alert.alert(
      'Confirm Plant Status',
      `Change plant status to ${STATUS_META[statusToSave].label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            mutation.mutate({
              status: statusToSave,
              title: statusToSave === 'running' ? null : title.trim(),
              message: statusToSave === 'running' ? null : message.trim(),
              expected_restart_at:
                statusToSave === 'running' || !expectedRestartAt
                  ? null
                  : moment(expectedRestartAt).format('YYYY-MM-DD HH:mm:ss'),
            }),
        },
      ],
    );
  };

  const refreshing =
    statusQuery.isRefetching ||
    shiftQuery.isRefetching ||
    historyQuery.isRefetching;

  const refresh = () =>
    Promise.all([
      statusQuery.refetch(),
      shiftQuery.refetch(),
      historyQuery.refetch(),
    ]);

  if (statusQuery.isLoading || shiftQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Plant Control</Text>
          <Text style={styles.description}>
            Control production availability
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Factory size={25} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.currentCard}>
        <View
          style={[styles.currentIcon, { backgroundColor: meta.background }]}
        >
          <CurrentIcon size={36} color={meta.color} />
        </View>
        <Text style={styles.label}>Current Plant Status</Text>
        <Text style={[styles.currentStatus, { color: meta.color }]}>
          {meta.label.toUpperCase()}
        </Text>
        <Text style={styles.currentMessage}>
          {current.message ||
            (currentStatus === 'running'
              ? 'Production entry is allowed.'
              : 'Production entry is blocked.')}
        </Text>

        <View style={styles.infoBox}>
          <InfoLine
            label="Automatic Shift"
            value={String(shift.current_shift || '-').toUpperCase()}
          />
          <InfoLine label="Shift Date" value={shift.shift_date || '-'} />
          <InfoLine
            label="Production"
            value={current.production_allowed === false ? 'Blocked' : 'Allowed'}
          />
        </View>
      </View>

      <View style={styles.controlCard}>
        <Text style={styles.sectionTitle}>Change Plant Status</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[
              styles.statusChoice,
              selectedStatus === 'maintenance' && styles.statusChoiceActive,
            ]}
            activeOpacity={0.8}
            onPress={() => selectStatus('maintenance')}
          >
            <Text
              style={[
                styles.statusChoiceText,
                selectedStatus === 'maintenance' &&
                  styles.statusChoiceTextActive,
              ]}
            >
              Maintenance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusChoice,
              selectedStatus === 'stopped' && styles.statusChoiceActive,
            ]}
            activeOpacity={0.8}
            onPress={() => selectStatus('stopped')}
          >
            <Text
              style={[
                styles.statusChoiceText,
                selectedStatus === 'stopped' && styles.statusChoiceTextActive,
              ]}
            >
              Stopped
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.selectedStatusHint}>
          Selected status:{' '}
          <Text style={styles.selectedStatusValue}>
            {STATUS_META[selectedStatus].label}
          </Text>
        </Text>

        {currentStatus !== 'running' && (
          <TouchableOpacity
            style={[
              styles.runningButton,
              mutation.isPending && styles.disabled,
            ]}
            disabled={mutation.isPending}
            onPress={() => submit('running')}
          >
            <PlayCircle size={20} color={COLORS.white} />
            <Text style={styles.actionText}>MARK PLANT RUNNING</Text>
          </TouchableOpacity>
        )}

        <TextInput
          label="Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          textColor={COLORS.text}
          cursorColor={COLORS.primary}
          selectionColor={COLORS.lightBlue}
          placeholderTextColor={COLORS.gray}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.accent}
          theme={PAPER_THEME}
        />

        <TextInput
          label="Reason / Message"
          value={message}
          onChangeText={setMessage}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.messageInput]}
          contentStyle={styles.messageInputContent}
          textColor={COLORS.text}
          cursorColor={COLORS.primary}
          selectionColor={COLORS.lightBlue}
          placeholderTextColor={COLORS.gray}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.accent}
          theme={PAPER_THEME}
        />

        <TouchableOpacity activeOpacity={0.8} onPress={openRestartPicker}>
          <View pointerEvents="none">
            <TextInput
              label="Expected Restart Date & Time"
              value={
                expectedRestartAt
                  ? moment(expectedRestartAt).format('DD MMM YYYY, hh:mm A')
                  : ''
              }
              placeholder="Select expected restart"
              mode="outlined"
              editable={false}
              style={styles.input}
              textColor={COLORS.text}
              placeholderTextColor={COLORS.gray}
              outlineColor={COLORS.inputBorder}
              activeOutlineColor={COLORS.accent}
              theme={PAPER_THEME}
              right={
                <TextInput.Icon
                  icon={() => (
                    <CalendarClock size={21} color={COLORS.primary} />
                  )}
                />
              }
            />
          </View>
        </TouchableOpacity>

        {expectedRestartAt ? (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => setExpectedRestartAt(null)}
          >
            <Text style={styles.clearDateText}>CLEAR EXPECTED RESTART</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.actionButton,
            selectedStatus === 'stopped'
              ? styles.stopButton
              : styles.maintenanceButton,
            mutation.isPending && styles.disabled,
          ]}
          disabled={mutation.isPending}
          onPress={() => submit()}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.actionText}>
              SET {STATUS_META[selectedStatus].label.toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>Recent Status History</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No plant status history found</Text>
        ) : (
          history.map(item => (
            <View key={item.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>
                  {(item.title || item.status || '-').toUpperCase()}
                </Text>
                <Text style={styles.historyMessage}>{item.message || '-'}</Text>
              </View>
              <Text style={styles.historyStatus}>
                {String(item.status || '').toUpperCase()}
              </Text>
            </View>
          ))
        )}
      </View>

      {showDateTimePicker && (
        <DateTimePicker
          value={expectedRestartAt || new Date()}
          mode={restartPickerMode}
          display={restartPickerMode === 'time' ? 'clock' : 'default'}
          is24Hour={false}
          minimumDate={restartPickerMode === 'date' ? new Date() : undefined}
          onValueChange={handleRestartPickerChange}
        />
      )}
    </ScrollView>
  );
}

function InfoLine({ label, value }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  headerCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
  },
  title: { color: COLORS.primary, fontSize: 27, fontWeight: '900' },
  description: { color: COLORS.gray, marginTop: 4 },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCard: {
    marginTop: 16,
    padding: 22,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    elevation: 4,
  },
  currentIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: 12, color: COLORS.gray, fontWeight: '700' },
  currentStatus: { marginTop: 4, fontSize: 28, fontWeight: '900' },
  currentMessage: {
    marginTop: 8,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    width: '100%',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { color: COLORS.gray, fontWeight: '700' },
  infoValue: { color: COLORS.text, fontWeight: '900' },
  controlCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    elevation: 3,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  selectedStatusHint: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },

  selectedStatusValue: {
    color: COLORS.primary,
    fontWeight: '900',
  },

  statusChoice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusChoiceActive: {
    backgroundColor: COLORS.lightBlue,
    borderColor: COLORS.accent,
  },
  statusChoiceText: { color: COLORS.gray, fontWeight: '800' },
  statusChoiceTextActive: { color: COLORS.primary },
  input: { marginTop: 12, backgroundColor: COLORS.white },
  actionButton: {
    minHeight: 52,
    marginTop: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maintenanceButton: { backgroundColor: COLORS.warning },
  stopButton: { backgroundColor: COLORS.danger },
  runningButton: {
    minHeight: 52,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: COLORS.white, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  historyCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    elevation: 3,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyTitle: { color: COLORS.text, fontWeight: '900' },
  historyMessage: { color: COLORS.gray, marginTop: 3 },
  historyStatus: { color: COLORS.primary, fontSize: 11, fontWeight: '900' },
  emptyText: { color: COLORS.gray, paddingVertical: 12 },

  messageInput: {
    minHeight: 112,
  },
  messageInputContent: {
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  clearDateButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  clearDateText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  datePickerCard: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  datePickerTitle: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '900',
  },
  datePickerSubtitle: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    marginTop: 10,
  },
  selectedDateText: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  doneButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  doneButtonText: {
    color: COLORS.white,
    fontWeight: '900',
  },
});
