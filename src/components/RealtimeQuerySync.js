import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';

import { saveFcmTokenApi } from '../api/notificationApi';
import { getFCMToken } from '../services/firebaseService';
import { socket } from '../socket/socket';

export default function RealtimeQuerySync() {
  const queryClient = useQueryClient();
  const token = useSelector(state => state.auth.token);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    const syncNotificationToken = async () => {
      const fcmToken = await getFCMToken();

      if (active && fcmToken) {
        await saveFcmTokenApi({
          fcm_token: fcmToken,
          device_type: Platform.OS,
        });
      }
    };

    syncNotificationToken().catch(() => {});

    if (!socket.connected) {
      socket.connect();
    }

    const invalidateProductionData = () => {
      [
        'productions',
        'production-history',
        'history-date-summary',
        'history-shift-table',
        'history-material-summary',
        'history-planning-summary',
        'certificate-readings',
        'dashboard',
      ].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    };

    const invalidatePlanningData = () => {
      [
        'production-planning',
        'available-production-planning',
        'default-production-challan',
        'history-planning-summary',
      ].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    };

    socket.on('production_updated', invalidateProductionData);
    socket.on('production_planning_updated', invalidatePlanningData);

    return () => {
      active = false;
      socket.off('production_updated', invalidateProductionData);
      socket.off('production_planning_updated', invalidatePlanningData);
    };
  }, [queryClient, token]);

  return null;
}
