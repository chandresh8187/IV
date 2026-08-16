import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

import { saveFcmTokenApi } from '../api/notificationApi';
import { shouldDisplayNotification } from '../utils/notificationDeduper';

export const registerFcmRefreshListener = () => {
  return messaging().onTokenRefresh(async refreshedToken => {
    try {
      await saveFcmTokenApi({
        fcm_token: refreshedToken,
        device_type: Platform.OS,
      });
    } catch (error) {
      console.warn(
        'Refreshed notification token could not be saved:',
        error?.response?.data?.message || error?.message,
      );
    }
  });
};

export const registerForegroundMessageListener = () =>
  messaging().onMessage(async remoteMessage => {
    const title = remoteMessage?.notification?.title;
    const body = remoteMessage?.notification?.body;

    if (
      (title || body) &&
      shouldDisplayNotification(remoteMessage?.data?.notification_key)
    ) {
      Alert.alert(title || 'Production Notification', body || '');
    }
  });
