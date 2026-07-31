/**
 * @format
 */

import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { StatusBar } from 'react-native';

// Keep this outside all React components
StatusBar.setBarStyle('light-content');
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage);
});

registerRootComponent(App);
