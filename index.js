/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

export default function Main() {
  // Register background handler
  messaging().setBackgroundMessageHandler(async remoteMessage => {});

  return <App />;
}

AppRegistry.registerComponent(appName, () => Main);
