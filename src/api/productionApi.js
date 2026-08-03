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

export const updateProductionByIdApi = async ({ id, body }) => {
  const response = await apiClient.put(`/productions/${id}`, body);
  return response.data;
};

export const grantProductionEditApi = async ({ id, user_id }) => {
  const response = await apiClient.post(`/productions/${id}/edit-grant`, {
    user_id,
  });
  return response.data;
};

export const getDefaultChallanApi = async () => {
  const response = await apiClient.get(
    '/productions/preferences/default-challan',
  );
  return response.data;
};

export const setDefaultChallanApi = async planning_id => {
  const response = await apiClient.put(
    '/productions/preferences/default-challan',
    { planning_id },
  );
  return response.data;
};
