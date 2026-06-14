/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PaperProvider } from 'react-native-paper';
import { store } from './src/redux/store';
import { queryClient } from './src/redux/queryClient';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';
export default function Main() {
  // Register background handler
  messaging().setBackgroundMessageHandler(async remoteMessage => {});

  return (
    <PaperProvider>
      <App />
    </PaperProvider>
  );
}

AppRegistry.registerComponent(appName, () => Main);
