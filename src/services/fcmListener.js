import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

import { saveFcmTokenApi } from '../api/notificationApi';
import { shouldDisplayNotification } from '../utils/notificationDeduper';

export const registerFcmRefreshListener = () => {
  return messaging().onTokenRefresh(async refreshedToken => {
    try {
      await saveFcmTokenApi({
        fcm_token: refreshedToken,
        device_type: 'android',
      });
    } catch (error) {
      console.log(error);
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
