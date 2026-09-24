import messaging from '@react-native-firebase/messaging';

import { registerRefreshedNotificationToken } from './notificationRegistrationService';
import { navigationRef } from '../navigation/navigationRef';

const openNotification = remoteMessage => {
  if (remoteMessage?.data?.type !== 'plant_chat') return;
  let attempts = 0;
  const navigate = () => {
    if (navigationRef.isReady()) navigationRef.navigate('PlantChat');
    else if (attempts++ < 30) setTimeout(navigate, 250);
  };
  navigate();
};

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

export const registerNotificationOpenListener = () => {
  const unsubscribe = messaging().onNotificationOpenedApp(openNotification);
  messaging().getInitialNotification().then(openNotification).catch(() => {});
  return unsubscribe;
};
