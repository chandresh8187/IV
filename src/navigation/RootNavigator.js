import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/auth/LoginScreen';

import AccessTabs from './AccessTabs';

import { getStoredAuth } from '../api/authApi';
import { setAuth, stopLoading } from '../redux/slices/authSlice';
import { COLORS, UI } from './../assets/Colors';
import { getSharedPdf, clearSharedPdf } from '../native/ShareIntent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extractPlanningPdfApi } from '../api/productionPlanningApi';
import { hasPermission } from '../utils/permissions';
import { syncNotificationRegistration } from '../services/notificationRegistrationService';

const APP_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
  },
};

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { token, user, isLoading } = useSelector(state => state.auth);
  useEffect(() => {
    // Wait until auth has finished loading and there's a logged-in,
    // non-superadmin-only-assumption user before trying to jump into the
    // authenticated tab tree. Without this guard, a cold start via
    // "share PDF to app" could fire before login and try to reset into
    // routes ('Dashboard' / 'Production' > 'ProductionPlanning') that only
    // exist once the person is authenticated.
    if (isLoading || !token || !user) {
      return;
    }

    const checkSharedPdf = async () => {
      try {
        const file = await getSharedPdf();

        if (!file?.uri) {
          return;
        }

        if (!hasPermission(user, 'planning.import_pdf')) {
          return;
        }

        const res = await extractPlanningPdfApi(file);

        navigationRef.current?.reset({
          index: 0,
          routes: [
            {
              name: 'Production',
              state: {
                index: 1,
                routes: [
                  {
                    name: 'ProductionMenu',
                  },
                  {
                    name: 'ProductionPlanning',
                    params: {
                      extractedPdfData: res?.data,
                    },
                  },
                ],
              },
            },
          ],
        });

        clearSharedPdf();
      } catch (error) {}
    };

    checkSharedPdf();
  }, [isLoading, token, user]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedAuth = await getStoredAuth();

        if (storedAuth.token && storedAuth.user) {
          dispatch(setAuth(storedAuth));
          syncNotificationRegistration().catch(error => {
            console.warn(
              'Cold-start notification check failed:',
              error?.response?.data?.message || error?.message,
            );
          });
        } else {
          dispatch(stopLoading());
        }
      } catch (error) {
        // Corrupted AsyncStorage data (e.g. malformed JSON in "user")
        // would otherwise throw here and leave isLoading stuck at true,
        // permanently freezing the app on the splash screen.

        dispatch(stopLoading());
      }
    };

    loadAuth();
  }, [dispatch]);

  const getMainComponent = () => {
    if (!token || !user) {
      return LoginScreen;
    }

    // Normalized so role casing/whitespace differences from the server
    // ("Admin", " supervisor ") still route to the right tabs.
    const role = String(user.role || '')
      .toLowerCase()
      .trim();

    if (['superadmin', 'plant_manager', 'admin', 'supervisor'].includes(role)) {
      return AccessTabs;
    }

    return LoginScreen;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  const MainComponent = getMainComponent();

  return (
    <NavigationContainer ref={navigationRef} theme={APP_NAVIGATION_THEME}>
      <SafeAreaView style={styles.safeArea}>
        <MainComponent />
      </SafeAreaView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  loadingCard: {
    backgroundColor: COLORS.white,
    height: 80,
    width: 80,
    borderRadius: UI.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
});
