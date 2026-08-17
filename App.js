import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Buffer } from 'buffer';
import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';

import { PAPER_THEME } from './src/assets/Colors';
import AppUpdateManager from './src/components/AppUpdateManager';
import RealtimeQuerySync from './src/components/RealtimeQuerySync';
import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/redux/store';
import {
  registerFcmRefreshListener,
} from './src/services/fcmListener';

const queryClient = new QueryClient();
global.Buffer = Buffer;

export default function App() {
  useEffect(() => {
    const init = async () => {
      // …do multiple sync or async tasks
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
    });
    const unsubscribeRefresh = registerFcmRefreshListener();

    return () => {
      unsubscribeRefresh();
    };
  }, []);
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={PAPER_THEME}>
          <RealtimeQuerySync />
          <RootNavigator />
          <AppUpdateManager />
        </PaperProvider>
      </QueryClientProvider>
    </Provider>
  );
}
