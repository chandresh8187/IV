import apiClient from './apiClient';

export const getAndroidUpdateApi = async () => {
  const response = await apiClient.get('/app-update/android');
  return response.data;
};
