import apiClient from './apiClient';

export const getZincStockApi = async () =>
  (await apiClient.get('/zinc-stock')).data;
export const getAverageZincRateApi = async () =>
  (await apiClient.get('/zinc-stock/average-rate')).data;
export const getRateCalculatorContextApi = async () =>
  (await apiClient.get('/zinc-stock/rate-calculator-context')).data;
export const getZincMovementsApi = async params =>
  (await apiClient.get('/zinc-stock/movements', { params })).data;
export const saveZincMovementApi = async body =>
  (await apiClient.post('/zinc-stock/movements', body)).data;
export const downloadZincStockReportApi = async () =>
  apiClient.get('/zinc-stock/movements/pdf', { responseType: 'arraybuffer' });
export const saveZincByproductApi = async body =>
  (await apiClient.post('/zinc-stock/byproducts', body)).data;
export const getZincByproductsApi = async params =>
  (await apiClient.get('/zinc-stock/byproducts', { params })).data;
export const downloadZincByproductReportApi = async params =>
  apiClient.get('/zinc-stock/byproducts/pdf', { params, responseType: 'arraybuffer' });
export const getZincPurchasesApi = async params => (await apiClient.get('/zinc-stock/purchases', { params })).data;
export const saveZincPurchaseApi = async body => (await apiClient.post('/zinc-stock/purchases', body)).data;
export const editZincPurchaseApi = async (id, body) => (await apiClient.put(`/zinc-stock/purchases/${id}`, body)).data;
export const downloadZincPurchaseReportApi = async params => apiClient.get('/zinc-stock/purchases/pdf', { params, responseType: 'arraybuffer' });

export const editZincByproductApi = async (id, body) => (await apiClient.put(`/zinc-stock/byproducts/${id}`, body)).data;
