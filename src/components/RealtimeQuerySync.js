import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';

import { getMyAccessApi } from '../api/authApi';
import { mergeUser, setUserAccess } from '../redux/slices/authSlice';
import { syncNotificationRegistration } from '../services/notificationRegistrationService';
import { socket } from '../socket/socket';

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
        ...(Object.prototype.hasOwnProperty.call(
          access || {},
          'assigned_shift',
        ) && {
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

    let notificationSyncPromise = null;
    let notificationRetryTimer = null;
    let notificationRetryAttempt = 0;
    const retryDelays = [5000, 30000, 120000];

    const syncNotificationToken = async () => {
      const result = await syncNotificationRegistration();
      if (result?.registered) {
        notificationRetryAttempt = 0;
        console.info('Notification device check:', result.reason);
      }
      return result;
    };

    const requestNotificationSync = () => {
      if (!notificationSyncPromise) {
        notificationSyncPromise = syncNotificationToken()
          .catch(error => {
            console.warn(
              'Notification token sync failed:',
              error?.response?.data?.message || error?.message,
            );

            if (
              active &&
              !notificationRetryTimer &&
              notificationRetryAttempt < retryDelays.length
            ) {
              const delay = retryDelays[notificationRetryAttempt];
              notificationRetryAttempt += 1;
              notificationRetryTimer = setTimeout(() => {
                notificationRetryTimer = null;
                requestNotificationSync();
              }, delay);
            }
          })
          .finally(() => {
            notificationSyncPromise = null;
          });
      }
      return notificationSyncPromise;
    };

    requestNotificationSync();
    requestAccessSync().catch(() => {});

    const invalidateKeys = keys =>
      keys.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));

    const invalidateProductionData = () => {
      invalidateKeys([
        'contractor-report',
        'correction-planning-items',
        'productions',
        'production-history',
        'history-dates',
        'history-date-summary',
        'history-shift-table',
        'history-material-summary',
        'history-party-summary',
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
        'history-party-summary',
        'certificate-readings',
      ]);
    };

    const invalidateShiftData = () =>
      invalidateKeys([
        'correction-planning-items',
        'correction-shifts',
        'available-production-planning',
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
      invalidateKeys(['contractors', 'contractor-report']);
      invalidateKeys(['financial-years', 'current-financial-year']);
      invalidateProductionData();
      invalidatePlanningData();
      invalidateShiftData();
      invalidatePlantData();
      invalidateUserData();
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

    const invalidateFinancialYears = () => {
      queryClient.resetQueries({ queryKey: ['contractor-report'] });
      invalidateKeys([
        'financial-years',
        'current-financial-year',
        'production-planning',
      ]);
      queryClient.resetQueries({
        predicate: query => String(query.queryKey[0]).startsWith('history-'),
      });
    };
    socket.on('financial_years_updated', invalidateFinancialYears);

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
      requestNotificationSync();
    };

    const handleProfileUpdate = event => {
      if (Number(event?.user?.id) === Number(user?.id)) {
        persistUser(event.user).catch(() => {});
      }
    };

    socket.auth = { token };
    if (socket.connected) socket.disconnect();

    socket.on('production_updated', invalidateProductionData);
    const invalidateContractors = () =>
      invalidateKeys(['contractors', 'contractor-report']);
    socket.on('contractors_updated', invalidateContractors);
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
    socket.on('connect', handleConnected);
    socket.connect();

    const networkSubscription = NetInfo.addEventListener(networkState => {
      if (
        networkState?.isConnected !== false &&
        networkState?.isInternetReachable !== false
      ) {
        requestNotificationSync();
      }
    });
    NetInfo.fetch()
      .then(networkState => {
        if (
          networkState?.isConnected !== false &&
          networkState?.isInternetReachable !== false
        ) {
          requestNotificationSync();
        }
      })
      .catch(() => {});

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          if (!socket.connected) socket.connect();
          invalidateAllRealtimeData();
          requestAccessSync().catch(() => {});
          requestNotificationSync();
        }
      },
    );

    return () => {
      active = false;
      if (notificationRetryTimer) clearTimeout(notificationRetryTimer);
      socket.off('production_updated', invalidateProductionData);
      socket.off('contractors_updated', invalidateContractors);
      socket.off('financial_years_updated', invalidateFinancialYears);
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
      socket.off('connect', handleConnected);
      networkSubscription();
      appStateSubscription.remove();
      socket.disconnect();
    };
  }, [dispatch, queryClient, token, user?.id]);

  return null;
}
