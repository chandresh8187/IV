import apiClient from './apiClient';

export const getHistoryDatesApi = async month => {
  const response = await apiClient.get('/production-history/dates', {
    params: { month },
  });
  return response.data;
};

export const downloadProductionReportApi = async ({ type, value, date }) => {
  const response = await apiClient.get('/production-history/report', {
    params: { type, value, date },
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

export const getHistoryMaterialSummaryApi = async date => {
  const response = await apiClient.get('/production-history/material-summary', {
    params: { date },
  });
  return response.data;
};

export const getHistoryPlanningSummaryApi = async date => {
  const response = await apiClient.get('/production-history/planning-summary', {
    params: { date },
  });
  return response.data;
};
