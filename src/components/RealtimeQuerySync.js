import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';

import { getMyAccessApi } from '../api/authApi';
import { saveFcmTokenApi } from '../api/notificationApi';
import { saveProductionApi } from '../api/productionApi';
import { mergeUser, setUserAccess } from '../redux/slices/authSlice';
import { getFCMToken } from '../services/firebaseService';
import { socket } from '../socket/socket';
import { shouldDisplayNotification } from '../utils/notificationDeduper';
import { flushOfflineProductions } from '../utils/offlineProductionQueue';

export default function RealtimeQuerySync() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    if (!token) {
      socket.auth = {};
      socket.disconnect();
      return undefined;
    }

    let active = true;

    const persistAccess = async access => {
      const permissions = Array.isArray(access?.permissions)
        ? access.permissions
        : [];
      const userAccess = {
        permissions,
        ...(access?.role && { role: access.role }),
        ...(Object.prototype.hasOwnProperty.call(access || {}, 'assigned_shift') && {
          assigned_shift: access.assigned_shift,
        }),
      };

      if (!active) return;
      dispatch(setUserAccess(userAccess));

      const storedUser = JSON.parse(
        (await AsyncStorage.getItem('user')) || 'null',
      );
      if (storedUser && active) {
        await AsyncStorage.setItem(
          'user',
          JSON.stringify({ ...storedUser, ...userAccess }),
        );
      }
    };

    const syncAccess = async () => {
      const response = await getMyAccessApi();
      await persistAccess({
        permissions: response?.data?.allowedKeys || [],
        role: response?.data?.user?.role,
        assigned_shift: response?.data?.user?.assigned_shift,
      });
    };
    let accessSyncPromise = null;
    const requestAccessSync = () => {
      if (!accessSyncPromise) {
        accessSyncPromise = syncAccess().finally(() => {
          accessSyncPromise = null;
        });
      }
      return accessSyncPromise;
    };

    const persistUser = async updatedUser => {
      if (!active || !updatedUser) return;
      dispatch(mergeUser(updatedUser));
      const storedUser = JSON.parse(
        (await AsyncStorage.getItem('user')) || 'null',
      );
      if (storedUser && active) {
        await AsyncStorage.setItem(
          'user',
          JSON.stringify({ ...storedUser, ...updatedUser }),
        );
      }
    };

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
    requestAccessSync().catch(() => {});

    const invalidateKeys = keys =>
      keys.forEach(key =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      );

    const invalidateProductionData = () => {
      invalidateKeys([
        'productions',
        'production-history',
        'history-dates',
        'history-date-summary',
        'history-shift-table',
        'history-material-summary',
        'history-planning-summary',
        'certificate-readings',
        'certificates',
        'dashboard',
        'production-planning',
        'available-production-planning',
      ]);
    };

    const invalidatePlanningData = () => {
      invalidateKeys([
        'production-planning',
        'available-production-planning',
        'default-production-challan',
        'history-planning-summary',
        'dashboard',
        'certificate-readings',
      ]);
    };

    const invalidateShiftData = () =>
      invalidateKeys([
        'shift-status',
        'productions',
        'dashboard',
        'users',
        'active-supervisors',
      ]);

    const invalidatePlantData = () =>
      invalidateKeys([
        'plant-status',
        'plant-status-history',
        'shift-status',
        'productions',
        'dashboard',
      ]);

    const invalidateUserData = () =>
      invalidateKeys([
        'users',
        'active-supervisors',
        'active-users-for-production-grant',
      ]);

    const invalidateAllRealtimeData = () => {
      invalidateProductionData();
      invalidatePlanningData();
      invalidateShiftData();
      invalidatePlantData();
      invalidateUserData();
    };

    let offlineSyncPromise = null;
    const syncOfflineProduction = async networkState => {
      if (
        networkState?.isConnected === false ||
        networkState?.isInternetReachable === false ||
        !user?.id
      ) {
        return;
      }
      if (offlineSyncPromise) return offlineSyncPromise;

      offlineSyncPromise = flushOfflineProductions(
        saveProductionApi,
        user.id,
      ).finally(() => {
        offlineSyncPromise = null;
      });
      const result = await offlineSyncPromise;
      if (result.synced) invalidateProductionData();
      return result;
    };

    const handlePermissionUpdate = event => {
      invalidateUserData();
      if (Number(event?.user_id) === Number(user?.id)) {
        if (Array.isArray(event?.permissions)) {
          persistAccess({ permissions: event.permissions }).catch(() => {});
        }
        requestAccessSync().catch(() => {});
      }
    };

    const handleUserUpdate = event => {
      invalidateUserData();
      if (
        Number(event?.user_id) === Number(user?.id) &&
        ['updated', 'status_changed', 'permissions_changed'].includes(
          event?.action,
        )
      ) {
        requestAccessSync().catch(() => {});
      }
    };

    const handleConnected = () => {
      invalidateAllRealtimeData();
      requestAccessSync().catch(() => {});
      syncNotificationToken().catch(() => {});
      syncOfflineProduction().catch(() => {});
    };

    const handleProfileUpdate = event => {
      if (Number(event?.user?.id) === Number(user?.id)) {
        persistUser(event.user).catch(() => {});
      }
    };

    const handleProductionAlert = event => {
      const alertType = String(event?.type || '');
      const userRole = String(user?.role || '').toLowerCase().trim();

      if (
        userRole === 'supervisor' &&
        ['planning_zinc_alert', 'notification_test'].includes(alertType)
      ) {
        return;
      }

      if (shouldDisplayNotification(event?.notification_key)) {
        Alert.alert(
          event?.title || 'Production Notification',
          event?.body || '',
        );
      }
    };

    socket.auth = { token };
    if (socket.connected) socket.disconnect();

    socket.on('production_updated', invalidateProductionData);
    socket.on('production_planning_updated', invalidatePlanningData);
    socket.on('production_edit_grant_updated', invalidateProductionData);
    socket.on('production_preference_updated', invalidatePlanningData);
    socket.on('certificate_updated', invalidateProductionData);
    socket.on('shift_updated', invalidateShiftData);
    socket.on('plant_status_updated', invalidatePlantData);
    socket.on('app_setting_changed', invalidateAllRealtimeData);
    socket.on('user_permissions_updated', handlePermissionUpdate);
    socket.on('users_updated', handleUserUpdate);
    socket.on('profile_updated', handleProfileUpdate);
    socket.on('planning_zinc_alert', handleProductionAlert);
    socket.on('monthly_zinc_alert', handleProductionAlert);
    socket.on('notification_test', handleProductionAlert);
    socket.on('connect', handleConnected);
    socket.connect();

    const networkSubscription = NetInfo.addEventListener(networkState => {
      syncOfflineProduction(networkState).catch(() => {});
    });
    NetInfo.fetch()
      .then(syncOfflineProduction)
      .catch(() => {});

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          if (!socket.connected) socket.connect();
          invalidateAllRealtimeData();
          requestAccessSync().catch(() => {});
          syncNotificationToken().catch(() => {});
          NetInfo.fetch()
            .then(syncOfflineProduction)
            .catch(() => {});
        }
      },
    );

    return () => {
      active = false;
      socket.off('production_updated', invalidateProductionData);
      socket.off('production_planning_updated', invalidatePlanningData);
      socket.off('production_edit_grant_updated', invalidateProductionData);
      socket.off('production_preference_updated', invalidatePlanningData);
      socket.off('certificate_updated', invalidateProductionData);
      socket.off('shift_updated', invalidateShiftData);
      socket.off('plant_status_updated', invalidatePlantData);
      socket.off('app_setting_changed', invalidateAllRealtimeData);
      socket.off('user_permissions_updated', handlePermissionUpdate);
      socket.off('users_updated', handleUserUpdate);
      socket.off('profile_updated', handleProfileUpdate);
      socket.off('planning_zinc_alert', handleProductionAlert);
      socket.off('monthly_zinc_alert', handleProductionAlert);
      socket.off('notification_test', handleProductionAlert);
      socket.off('connect', handleConnected);
      networkSubscription();
      appStateSubscription.remove();
      socket.disconnect();
    };
  }, [dispatch, queryClient, token, user?.id, user?.role]);

  return null;
}
