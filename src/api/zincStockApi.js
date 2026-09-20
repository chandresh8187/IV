import apiClient from './apiClient';

export const getZincStockApi = async () =>
  (await apiClient.get('/zinc-stock')).data;
export const getZincMovementsApi = async params =>
  (await apiClient.get('/zinc-stock/movements', { params })).data;
export const saveZincMovementApi = async body =>
  (await apiClient.post('/zinc-stock/movements', body)).data;
export const downloadZincStockReportApi = async () =>
  apiClient.get('/zinc-stock/movements/pdf', { responseType: 'arraybuffer' });
