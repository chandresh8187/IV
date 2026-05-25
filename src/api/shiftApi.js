import apiClient from './apiClient';

export const getShiftStatusApi = async () => {
  const response = await apiClient.get('/shifts/status');
  return response.data;
};

export const toggleShiftApi = async () => {
  const response = await apiClient.post('/shifts/toggle', {});
  return response.data;
};
