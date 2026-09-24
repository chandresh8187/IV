import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/auth/LoginScreen';

import AccessTabs from './AccessTabs';

import { getStoredAuth } from '../api/authApi';
import { setAuth, stopLoading } from '../redux/slices/authSlice';
import { COLORS, UI } from './../assets/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { syncNotificationRegistration } from '../services/notificationRegistrationService';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatScreen from '../screens/common/ChatScreen';
import AppHeader from '../components/AppHeader';

const Stack = createNativeStackNavigator();
const renderHeader = props => <AppHeader {...props} />;

const APP_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.white,
    text: COLORS.text,
    primary: COLORS.accent,
    border: COLORS.border,
  },
};

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { token, user, isLoading } = useSelector(state => state.auth);
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
        <StatusBar barStyle="dark-content" />
        {token && user ? (
          <Stack.Navigator screenOptions={{ header: renderHeader, contentStyle: { backgroundColor: COLORS.bg } }}>
            <Stack.Screen name="MainTabs" component={MainComponent} options={{ headerShown: false }} />
            <Stack.Screen name="PlantChat" component={ChatScreen} options={{ title: 'Plant Chat' }} />
          </Stack.Navigator>
        ) : (
          <MainComponent />
        )}
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
    backgroundColor: COLORS.white,
  },
});
