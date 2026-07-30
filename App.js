import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';

import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/redux/store';
import { registerFcmRefreshListener } from './src/services/fcmListener';
const queryClient = new QueryClient();
import BootSplash from 'react-native-bootsplash';
import { Buffer } from 'buffer';
import { PAPER_THEME } from './src/assets/Colors';
import * as Updates from 'expo-updates';

global.Buffer = Buffer;
export default function App() {
  const checkForOTAUpdate = async () => {
    try {
      if (!Updates.isEnabled) {
        return;
      }

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.log('Automatic OTA update failed:', error);
      return;
    }
  };

  useEffect(() => {
    const init = async () => {
      // …do multiple sync or async tasks
      checkForOTAUpdate();
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
    });
    const unsubscribe = registerFcmRefreshListener();

    return unsubscribe;
  }, []);
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={PAPER_THEME}>
          <RootNavigator />
        </PaperProvider>
      </QueryClientProvider>
    </Provider>
  );
}
