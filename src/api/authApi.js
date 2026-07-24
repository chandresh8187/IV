import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

export const loginApi = async body => {
  const response = await apiClient.post('/auth/login', body);

  if (response.data?.token) {
    await AsyncStorage.setItem('token', response.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

export const logoutApi = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

export const getStoredAuth = async () => {
  const token = await AsyncStorage.getItem('token');
  const user = await AsyncStorage.getItem('user');

  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
};
