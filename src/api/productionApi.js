import apiClient from './apiClient';

export const getLiveZincStockApi = async () =>
  (await apiClient.get('/zinc-stock/transfer-context')).data;
export const addLiveZincApi = async body =>
  (await apiClient.post('/zinc-stock/movements', body)).data;

export const getProductionContractorsApi = async () =>
  (await apiClient.get('/productions/contractors')).data;
export const getProductionDefaultsApi = async () =>
  (await apiClient.get('/productions/preferences/defaults')).data;
export const setProductionDefaultsApi = async body =>
  (await apiClient.put('/productions/preferences/defaults', body)).data;

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
