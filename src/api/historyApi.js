import apiClient from './apiClient';

export const getHistoryDatesApi = async () => {
  const response = await apiClient.get('/production-history/dates');
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
