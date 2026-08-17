import apiClient from './apiClient';

export const saveFcmTokenApi = async payload => {
  const response = await apiClient.post('/notifications/save-token', payload);

  return response.data;
};

export const removeFcmTokenApi = async payload => {
  const response = await apiClient.post('/notifications/remove-token', payload);

  return response.data;
};

export const checkFcmTokenApi = async payload => {
  const response = await apiClient.post('/notifications/check-token', payload);

  return response.data;
};

export const getNotificationStatusApi = async () => {
  const response = await apiClient.get('/notifications/status');

  return response.data;
};

export const scheduleBackgroundNotificationTestApi = async () => {
  const response = await apiClient.post('/notifications/test-background');

  return response.data;
};

export const sendTestNotificationApi = async payload => {
  const response = await apiClient.post('/notifications/test', payload);

  return response.data;
};

export const testLatestProductionZincApi = async () => {
  const response = await apiClient.post('/notifications/test-zinc');

  return response.data;
};
