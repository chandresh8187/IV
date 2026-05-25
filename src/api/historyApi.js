import apiClient from './apiClient';

export const getProductionHistoryApi = async params => {
  const response = await apiClient.get('/production-history', { params });
  return response.data;
};
