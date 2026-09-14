import apiClient from './apiClient';

export const getFinancialYearsApi = async () => {
  const response = await apiClient.get('/financial-years');
  return response.data;
};

export const getCurrentFinancialYearApi = async () => {
  const response = await apiClient.get('/financial-years/current');
  return response.data;
};

export const setCurrentFinancialYearApi = async id => {
  const response = await apiClient.put(`/financial-years/${id}/current`);
  return response.data;
};

export const createFinancialYearApi = async financialYear => {
  const response = await apiClient.post('/financial-years', {
    financial_year: financialYear,
  });
  return response.data;
};

export const updateFinancialYearApi = async ({ id, financialYear }) => {
  const response = await apiClient.put(`/financial-years/${id}`, {
    financial_year: financialYear,
  });
  return response.data;
};

export const deleteFinancialYearApi = async id => {
  const response = await apiClient.delete(`/financial-years/${id}`);
  return response.data;
};
