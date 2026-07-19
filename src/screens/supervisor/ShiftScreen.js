import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Factory, Moon, Sun } from 'lucide-react-native';

import { getShiftStatusApi } from '../../api/shiftApi';
import { socket } from '../../socket/socket';
import { COLORS } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import moment from 'moment';

export default function ShiftScreen() {
  const queryClient = useQueryClient();
  const { contentMaxWidth } = useResponsive();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['shift-status'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    socket.on('shift_updated', refresh);
    socket.on('plant_status_updated', refresh);

    return () => {
      socket.off('shift_updated', refresh);
      socket.off('plant_status_updated', refresh);
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

  const payload = data?.data || {};
  const activeShift = payload.active_shift || {};
  const shiftName = payload.current_shift || activeShift.shift_name || '-';
  const shiftDate = payload.shift_date || activeShift.shift_date || '-';
  const plantStatus = payload.plant_status || 'running';
  const productionAllowed = payload.production_allowed !== false;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Automatic Shift</Text>
          <Text style={styles.description}>
            Shift is selected automatically from server time
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Clock size={24} color={COLORS.primary} />
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.shiftIconBox}>
          {shiftName === 'day' ? (
            <Sun size={54} color={COLORS.orange} />
          ) : (
            <Moon size={54} color={COLORS.primary} />
          )}
        </View>

        <Text style={styles.shiftLabel}>Current Shift</Text>
        <Text style={styles.shiftName}>{String(shiftName).toUpperCase()}</Text>

        <View style={styles.infoBox}>
          <InfoLine
            label="Shift Date"
            value={moment(shiftDate).format('DD MMM YYYY')}
          />
          <InfoLine
            label="Start Time"
            value={
              moment(activeShift.start_time || payload.shift_start).format(
                'hh:mm A',
              ) || '-'
            }
          />
          <InfoLine
            label="End Time"
            value={
              moment(payload.shift_end || activeShift.end_time).format(
                'hh:mm A',
              ) || '-'
            }
          />
        </View>
      </View>

      <View style={styles.plantCard}>
        <View style={styles.plantTitleRow}>
          <Factory size={22} color={COLORS.primary} />
          <Text style={styles.plantTitle}>Plant Status</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            productionAllowed ? styles.runningBadge : styles.blockedBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              productionAllowed ? styles.runningText : styles.blockedText,
            ]}
          >
            {String(plantStatus).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.noteText}>
          {productionAllowed
            ? 'Production entry is currently allowed.'
            : payload.plant_notice ||
              'Production entry is temporarily blocked by the Plant Manager.'}
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
  container: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 10, color: COLORS.gray, fontWeight: '700' },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: COLORS.primary, fontSize: 27, fontWeight: '900' },
  description: { color: COLORS.gray, fontSize: 13, marginTop: 4 },
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
  },
  shiftLabel: { marginTop: 15, color: COLORS.gray, fontWeight: '700' },
  shiftName: {
    marginTop: 4,
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '900',
  },
  infoBox: {
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { color: COLORS.gray, fontWeight: '700' },
  infoValue: { color: COLORS.text, fontWeight: '900' },
  plantCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    elevation: 3,
  },
  plantTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plantTitle: { color: COLORS.primary, fontSize: 18, fontWeight: '900' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 14,
  },
  runningBadge: { backgroundColor: '#DCFCE7' },
  blockedBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '900' },
  runningText: { color: COLORS.success },
  blockedText: { color: COLORS.danger },
  noteText: {
    marginTop: 12,
    color: COLORS.gray,
    lineHeight: 20,
    fontWeight: '600',
  },
});
