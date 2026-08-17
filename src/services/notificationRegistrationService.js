import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { checkFcmTokenApi, saveFcmTokenApi } from '../api/notificationApi';
import { getFCMToken } from './firebaseService';

let activeSync = null;
const INSTALLATION_ID_STORAGE_KEY = 'notification_installation_id';

const createInstallationId = () => {
  const randomPart = () => Math.random().toString(36).slice(2, 12);
  return `${Platform.OS}_${Date.now().toString(36)}_${randomPart()}_${randomPart()}`;
};

export const getNotificationInstallationId = async () => {
  const storedId = await AsyncStorage.getItem(INSTALLATION_ID_STORAGE_KEY);
  if (storedId) return storedId;

  const installationId = createInstallationId();
  await AsyncStorage.setItem(INSTALLATION_ID_STORAGE_KEY, installationId);
  return installationId;
};

const persistDeviceToken = async fcmToken => {
  const installationId = await getNotificationInstallationId();
  const status = await checkFcmTokenApi({
    fcm_token: fcmToken,
    installation_id: installationId,
  });
  let savedData = null;

  if (!status?.data?.registered) {
    const saved = await saveFcmTokenApi({
      fcm_token: fcmToken,
      device_type: Platform.OS,
      installation_id: installationId,
    });
    savedData = saved?.data;
  }

  return {
    registered: true,
    reason: status?.data?.registered ? 'ALREADY_REGISTERED' : 'REGISTERED',
    data: savedData,
  };
};

export const syncNotificationRegistration = () => {
  if (activeSync) return activeSync;

  activeSync = (async () => {
    const fcmToken = await getFCMToken();

    if (!fcmToken) {
      return {
        registered: false,
        reason: 'PERMISSION_NOT_GRANTED',
      };
    }

    return persistDeviceToken(fcmToken);
  })().finally(() => {
    activeSync = null;
  });

  return activeSync;
};

export const registerRefreshedNotificationToken = refreshedToken =>
  persistDeviceToken(refreshedToken);
