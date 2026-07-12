import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { store } from '../redux/store';
import { clearAuth } from '../redux/slices/authSlice';

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error?.response?.status === 401) {
      // Token expired/invalid - clear local storage and force back to
      // LoginScreen instead of letting every screen show a generic error.
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      store.dispatch(clearAuth());
    }
    return Promise.reject(error);
  },
);

export default apiClient;
