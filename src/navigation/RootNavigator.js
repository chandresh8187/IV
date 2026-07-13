import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/auth/LoginScreen';

import SuperAdminTabs from './SuperAdminTabs';
import AdminTabs from './AdminTabs';
import SupervisorTabs from './SupervisorTabs';

import { getStoredAuth } from '../api/authApi';
import { setAuth, stopLoading } from '../redux/slices/authSlice';
import { COLORS } from './../assets/Colors';
import { getSharedPdf, clearSharedPdf } from '../native/ShareIntent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extractPlanningPdfApi } from '../api/productionPlanningApi';

const Stack = createNativeStackNavigator();

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

        const res = await extractPlanningPdfApi(file);

        navigationRef.current?.reset({
          index: 1,
          routes: [
            {
              name: 'Dashboard',
            },
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
      } catch (error) {
        console.log('Shared PDF error:', error);
      }
    };

    checkSharedPdf();
  }, [isLoading, token, user]);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedAuth = await getStoredAuth();

        if (storedAuth.token && storedAuth.user) {
          dispatch(setAuth(storedAuth));
        } else {
          dispatch(stopLoading());
        }
      } catch (error) {
        // Corrupted AsyncStorage data (e.g. malformed JSON in "user")
        // would otherwise throw here and leave isLoading stuck at true,
        // permanently freezing the app on the splash screen.
        console.log('Failed to load stored auth:', error);
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

    if (role === 'superadmin') {
      return SuperAdminTabs;
    }

    if (role === 'admin') {
      return AdminTabs;
    }

    if (role === 'supervisor') {
      return SupervisorTabs;
    }

    return LoginScreen;
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#232B5D',
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            height: 80,
            width: 80,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#232B5D" />
        </View>
      </View>
    );
  }

  const MainComponent = getMainComponent();

  return (
    <NavigationContainer ref={navigationRef}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.primary,
        }}
      >
        <MainComponent />
      </SafeAreaView>
    </NavigationContainer>
  );
}
