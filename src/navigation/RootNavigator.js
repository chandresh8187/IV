import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import LoginScreen from '../screens/auth/LoginScreen';

import SuperAdminTabs from './SuperAdminTabs';
import AdminTabs from './AdminTabs';
import SupervisorTabs from './SupervisorTabs';

import { getStoredAuth } from '../api/authApi';
import { setAuth, stopLoading } from '../redux/slices/authSlice';
import { COLORS } from './../assets/Colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { token, user, isLoading } = useSelector(state => state.auth);

  useEffect(() => {
    const loadAuth = async () => {
      const storedAuth = await getStoredAuth();

      if (storedAuth.token && storedAuth.user) {
        dispatch(setAuth(storedAuth));
      } else {
        dispatch(stopLoading());
      }
    };

    loadAuth();
  }, [dispatch]);

  const getMainComponent = () => {
    if (!token || !user) {
      return LoginScreen;
    }

    if (user.role === 'superadmin') {
      return SuperAdminTabs;
    }

    if (user.role === 'admin') {
      return AdminTabs;
    }

    if (user.role === 'supervisor') {
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
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // headerShown: false,
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTitleStyle: {
            color: COLORS.white,
            fontWeight: '900',
          },
          contentStyle: {
            paddingBottom: 20,
            backgroundColor: COLORS.primary,
          },
        }}
      >
        <Stack.Screen name="IVS ~ UNIT-2" component={MainComponent} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
