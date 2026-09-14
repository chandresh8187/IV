import apiClient from './apiClient';

export const getHistoryPartySummaryApi = async params => {
  const response = await apiClient.get('/production-history/party-summary', { params });
  return response.data;
};

export const getHistoryDatesApi = async () => {
  const response = await apiClient.get('/production-history/dates');
  return response.data;
};

export const downloadProductionReportApi = async ({
  type,
  value,
  date,
  item_id,
  planning_id,
  shift_name,
}) => {
  const response = await apiClient.get('/production-history/report', {
    params: { type, value, date, item_id, planning_id, shift_name },
    responseType: 'arraybuffer',
  });
  return response;
};

export const updateHistoricalProductionApi = async ({ id, body }) => {
  const response = await apiClient.put(`/productions/${id}`, body);
  return response.data;
};

export const getHistoryDateSummaryApi = async date => {
  const response = await apiClient.get('/production-history/date-summary', {
    params: { date },
  });
  return response.data;
};

export const getHistoryShiftTableApi = async params => {
  const response = await apiClient.get('/production-history/shift-table', {
    params,
  });
  return response.data;
};

export const getHistoryMaterialSummaryApi = async params => {
  const response = await apiClient.get('/production-history/material-summary', {
    params: typeof params === 'string' ? { date: params } : params,
  });
  return response.data;
};

export const getHistoryPlanningSummaryApi = async params => {
  const response = await apiClient.get('/production-history/planning-summary', {
    params: typeof params === 'string' ? { date: params } : params,
  });
  return response.data;
};
