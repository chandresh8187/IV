import apiClient from './apiClient';

export const getProductionsApi = async params => {
  const response = await apiClient.get('/productions', {
    params,
  });
  console.log('getProductionsApi', response);
  return response.data;
};

export const saveProductionApi = async body => {
  const response = await apiClient.post('/productions/save', body);
  console.log('saveProductionApi', response);
  return response.data;
};

export const deleteProductionApi = async id => {
  const response = await apiClient.delete(`/productions/${id}`);
  console.log('deleteProductionApi', response);
  return response.data;
};
