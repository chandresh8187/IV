import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

import {
  restoreLogin,
  finishAuthLoading,
} from '../redux/features/auth/authSlice';
import { COLORS } from '../assets/Colors';

export default function AuthLoader() {
  const dispatch = useDispatch();

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedAuthToken = await AsyncStorage.getItem('authToken');
        const storedAuthUser = await AsyncStorage.getItem('authUser');

        if (storedAuthToken) {
          const parsedAuth = JSON.parse(storedAuthUser);

          dispatch(
            restoreLogin({
              token: storedAuthToken,
              user: parsedAuth,
            }),
          );
        } else {
          dispatch(finishAuthLoading());
        }
      } catch (error) {
        dispatch(finishAuthLoading());
      }
    };

    loadAuth();
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.InnerContainer}>
        <View
          style={{
            transform: [{ scale: 1.3 }],
          }}
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  InnerContainer: {
    backgroundColor: '#fff',
    height: 100,
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
});
