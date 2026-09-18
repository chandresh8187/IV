import apiClient from './apiClient';

export const getContractorsApi = async () =>
  (await apiClient.get('/contractors')).data;
export const createContractorApi = async name =>
  (await apiClient.post('/contractors', { name })).data;
export const saveContractorAssignmentApi = async body =>
  (await apiClient.put('/contractors/assignments', body)).data;
export const getContractorReportApi = async params =>
  (await apiClient.get('/contractors/report', { params })).data;
