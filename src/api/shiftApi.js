import apiClient from './apiClient';

export const getShiftStatusApi = async () => {
  const response = await apiClient.get('/shifts/status');
  return response.data;
};
