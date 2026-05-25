import apiClient from './apiClient';

export const getProductionsApi = async params => {
  const response = await apiClient.get('/productions', {
    params,
  });

  return response.data;
};

export const saveProductionApi = async body => {
  const response = await apiClient.post('/productions/save', body);
  return response.data;
};

export const deleteProductionApi = async id => {
  const response = await apiClient.delete(`/productions/${id}`);
  return response.data;
};
