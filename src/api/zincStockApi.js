import apiClient from './apiClient';

export const getZincStockApi = async () =>
  (await apiClient.get('/zinc-stock')).data;
export const getZincMovementsApi = async params =>
  (await apiClient.get('/zinc-stock/movements', { params })).data;
export const saveZincMovementApi = async body =>
  (await apiClient.post('/zinc-stock/movements', body)).data;
export const downloadZincStockReportApi = async () =>
  apiClient.get('/zinc-stock/movements/pdf', { responseType: 'arraybuffer' });
export const setCurrentZincRateApi = async zinc_rate =>
  (await apiClient.put('/zinc-stock/rate', { zinc_rate })).data;
export const saveZincByproductApi = async body =>
  (await apiClient.post('/zinc-stock/byproducts', body)).data;
export const getZincByproductsApi = async params =>
  (await apiClient.get('/zinc-stock/byproducts', { params })).data;
export const downloadZincByproductReportApi = async () =>
  apiClient.get('/zinc-stock/byproducts/pdf', { responseType: 'arraybuffer' });
