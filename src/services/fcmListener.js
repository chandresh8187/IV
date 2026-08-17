import messaging from '@react-native-firebase/messaging';

import { registerRefreshedNotificationToken } from './notificationRegistrationService';

export const registerFcmRefreshListener = () => {
  return messaging().onTokenRefresh(async refreshedToken => {
    try {
      await registerRefreshedNotificationToken(refreshedToken);
    } catch (error) {
      console.warn(
        'Refreshed notification token could not be saved:',
        error?.response?.data?.message || error?.message,
      );
    }
  });
};
