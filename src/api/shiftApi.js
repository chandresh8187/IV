import apiClient from './apiClient';

export const getShiftStatusApi = async () => {
  const response = await apiClient.get('/shifts/status');
  return response.data;
};

export const toggleShiftApi = async body => {
  const response = await apiClient.post('/shifts/toggle', body);
  return response.data;
};
