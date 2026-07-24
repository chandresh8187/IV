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
global.Buffer = Buffer;
export default function App() {
  useEffect(() => {
    const init = async () => {
      // …do multiple sync or async tasks
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
