import apiClient from './apiClient';
export const getLabourWeightsApi = async (pending = false) => (await apiClient.get('/labour-weights', { params: pending ? { pending: 1 } : {} })).data;
export const getPendingLabourWeightsApi = async () => (await apiClient.get('/labour-weights/pending')).data;
export const saveLabourWeightApi = async ({ id, ...body }) => id
  ? (await apiClient.put(`/labour-weights/${id}`, body)).data
  : (await apiClient.post('/labour-weights', body)).data;
export const consumeLabourWeightApi = async id => (await apiClient.post(`/labour-weights/${id}/consume`)).data;
