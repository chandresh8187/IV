import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';

import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/redux/store';
import { registerFcmRefreshListener } from './src/services/fcmListener';
const queryClient = new QueryClient();
import BootSplash from 'react-native-bootsplash';
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
        <RootNavigator />
      </QueryClientProvider>
    </Provider>
  );
}
