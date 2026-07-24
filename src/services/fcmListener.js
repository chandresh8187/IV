import messaging from '@react-native-firebase/messaging';

import { saveFcmTokenApi } from '../api/notificationApi';

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
