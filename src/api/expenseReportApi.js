import apiClient from './apiClient';

export const getExpenseReportApi = async params =>
  (await apiClient.get('/expense-report', { params })).data;
export const getExpenseSettingsApi = async () =>
  (await apiClient.get('/expense-report/settings')).data;
export const saveExpenseSettingsApi = async body =>
  (await apiClient.put('/expense-report/settings', body)).data;
export const downloadExpenseReportApi = async params =>
  apiClient.get('/expense-report/pdf', { params, responseType: 'arraybuffer' });
