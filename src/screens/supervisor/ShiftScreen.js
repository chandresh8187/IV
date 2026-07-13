import React, { useEffect } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Moon, PlayCircle, Square, Sun } from 'lucide-react-native';

import { getShiftStatusApi, toggleShiftApi } from '../../api/shiftApi';
import { socket } from '../../socket/socket';
import { COLORS } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function ShiftScreen() {
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
  });

  const shiftMutation = useMutation({
    mutationFn: toggleShiftApi,
    onSuccess: res => {
      Alert.alert('Success', res?.message || 'Shift updated');

      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
    },
    onError: error => {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Something went wrong',
      );
    },
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleShiftUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
    };

    socket.on('shift_updated', handleShiftUpdate);

    return () => {
      socket.off('shift_updated', handleShiftUpdate);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading shift status...</Text>
      </View>
    );
  }

  const shift = data?.data;
  const activeShift = shift?.active_shift;
  const isActive = shift?.is_shift_active;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Shift Control</Text>
          <Text style={styles.description}>Start or end your plant shift</Text>
        </View>

        <View style={styles.headerIcon}>
          <Clock size={24} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.shiftIconBox}>
          {shift?.current_shift === 'day' ? (
            <Sun size={54} color={COLORS.orange} />
          ) : (
            <Moon size={54} color={COLORS.primary} />
          )}
        </View>

        <Text style={styles.shiftLabel}>Current Shift</Text>

        <Text style={styles.shiftName}>
          {shift?.current_shift?.toUpperCase()}
        </Text>

        <View
          style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isActive ? styles.activeText : styles.inactiveText,
            ]}
          >
            {isActive ? 'RUNNING' : 'NOT STARTED'}
          </Text>
        </View>

        {activeShift ? (
          <View style={styles.infoBox}>
            <InfoLine label="Shift Date" value={activeShift.shift_date} />
            <InfoLine
              label="Started By"
              value={activeShift.supervisor_name || '-'}
            />
            <InfoLine
              label="Start Time"
              value={activeShift.start_time || '-'}
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No shift is active. Press start to begin {shift?.current_shift}{' '}
            shift.
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.actionBtn,
            isActive ? styles.endBtn : styles.startBtn,
            shiftMutation.isPending && { opacity: 0.6 },
          ]}
          disabled={shiftMutation.isPending}
          onPress={() => shiftMutation.mutate()}
        >
          {shiftMutation.isPending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              {isActive ? (
                <Square size={22} color={COLORS.white} />
              ) : (
                <PlayCircle size={24} color={COLORS.white} />
              )}

              <Text style={styles.actionText}>{shift?.button_text}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Important</Text>
        <Text style={styles.noteText}>
          Production entries can be added only when a shift is running. After
          ending shift, next shift will be ready to start.
        </Text>
      </View>
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
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    padding: 16,
    paddingBottom: 32,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
    fontWeight: '700',
  },

  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    color: COLORS.primary,
    fontSize: 27,
    fontWeight: '900',
  },

  description: {
    color: COLORS.gray,
    fontSize: 13,
    marginTop: 4,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusCard: {
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    elevation: 4,
  },

  shiftIconBox: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  shiftLabel: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '800',
  },

  shiftName: {
    color: COLORS.primary,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },

  statusBadge: {
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },

  activeText: {
    color: COLORS.green,
  },

  inactiveText: {
    color: COLORS.red,
  },

  infoBox: {
    width: '100%',
    marginTop: 18,
  },

  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
  },

  emptyText: {
    color: COLORS.gray,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    lineHeight: 20,
  },

  actionBtn: {
    width: '60%',
    height: 58,
    borderRadius: 18,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  startBtn: {
    backgroundColor: COLORS.green,
  },

  endBtn: {
    backgroundColor: COLORS.red,
  },

  actionText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  noteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    elevation: 2,
    marginTop: 16,
  },

  noteTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },

  noteText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '600',
  },
});
