import { useQuery } from '@tanstack/react-query';
import { Clock, Factory, Moon, Sun } from 'lucide-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import ShiftCorrectionControls from '../../components/ShiftCorrectionControls';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getShiftStatusApi } from '../../api/shiftApi';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function ShiftScreen() {
  const user = useSelector(state => state.auth.user);
  const canManageCorrection = ['superadmin', 'plant_manager'].includes(String(user?.role || '').trim().toLowerCase());
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['shift-status'],
    queryFn: getShiftStatusApi,
    refetchInterval: 60 * 1000,
  });

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
  const plantStatus = payload.plant_status || 'running';
  const productionAllowed = payload.production_allowed !== false;
  const ShiftIcon = shiftName === 'day' ? Sun : Moon;
  const shiftColor = COLORS.accent;

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
      <View style={styles.pageHeader}>
        <View style={styles.headerIcon}>
          <Clock size={22} color={COLORS.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Automatic Shift</Text>
          <Text style={styles.description}>
            Day and night shifts rotate automatically every 12 hours.
          </Text>
        </View>
      </View>

      <ShiftCorrectionControls status={payload} canManage={canManageCorrection} />
      <View style={styles.statusCard}>
        <View style={styles.shiftIconBox}>
          <ShiftIcon size={32} color={shiftColor} />
        </View>

        <Text style={styles.shiftLabel}>Current Shift</Text>
        <Text style={styles.shiftName}>{String(shiftName).toUpperCase()}</Text>
        <View style={styles.automaticBadge}>
          <Text style={styles.automaticText}>AUTOMATIC · 12 HOURS</Text>
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
            : payload?.plant_notice
              ? 'Production entry is temporarily blocked by the Plant Manager.'
              : 'Production entry is temporarily unavailable.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: UI.pagePadding,
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
    fontWeight: '600',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1, marginLeft: 12 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  description: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  statusCard: {
    alignItems: 'flex-start',
    padding: 24,
    marginTop: 20,
    borderRadius: UI.radiusLarge,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  shiftIconBox: {
    width: 56,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  shiftLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  shiftName: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
    marginTop: 2,
  },
  automaticBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 3,
    marginTop: 12,
    backgroundColor: COLORS.accentSoft,
  },
  automaticText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  plantCard: {
    padding: 18,
    marginTop: 14,
    borderRadius: UI.radiusLarge,
    borderWidth: 0,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  plantTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  plantTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 3,
    marginTop: 15,
  },
  runningBadge: { backgroundColor: COLORS.tealSoft },
  blockedBadge: { backgroundColor: COLORS.dangerSoft },
  statusText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  runningText: { color: COLORS.success },
  blockedText: { color: COLORS.danger },
  noteText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 12,
  },
});
