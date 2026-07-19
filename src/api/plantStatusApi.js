import apiClient from './apiClient';

export const getPlantStatusApi = async () => {
  const response = await apiClient.get('/plant/status');
  return response.data;
};

export const changePlantStatusApi = async body => {
  const response = await apiClient.post('/plant/status', body);
  return response.data;
};

export const getPlantStatusHistoryApi = async params => {
  const response = await apiClient.get('/plant/history', { params });
  return response.data;
};
