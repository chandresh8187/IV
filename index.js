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
export default function Main() {
  return (
    <PaperProvider>
      <App />
    </PaperProvider>
  );
}

AppRegistry.registerComponent(appName, () => Main);
