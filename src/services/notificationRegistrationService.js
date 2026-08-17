import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  checkFcmTokenApi,
  removeFcmTokenApi,
  saveFcmTokenApi,
} from '../api/notificationApi';
import { getFCMToken } from './firebaseService';

let activeSync = null;
const DEVICE_TOKEN_STORAGE_KEY = 'registered_notification_device_token';

const persistDeviceToken = async fcmToken => {
  const previousToken = await AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  const status = await checkFcmTokenApi(fcmToken);
  let savedData = null;

  if (!status?.data?.registered) {
    const saved = await saveFcmTokenApi({
      fcm_token: fcmToken,
      device_type: Platform.OS,
    });
    savedData = saved?.data;
  }

  if (previousToken && previousToken !== fcmToken) {
    await removeFcmTokenApi({ fcm_token: previousToken }).catch(() => {});
  }
  await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, fcmToken);

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
