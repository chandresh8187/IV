/**
 * @format
 */

import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { StatusBar } from 'react-native';

StatusBar.setBarStyle('light-content');

// This must be registered outside React components.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage);
});

registerRootComponent(App);
