import apiClient from './apiClient';

export const getContractProductionApi = async params =>
  (await apiClient.get('/contractors/production', { params })).data;

export const getContractorDirectoryApi = async () =>
  (await apiClient.get('/contractors/directory')).data;

export const getContractorsApi = async () =>
  (await apiClient.get('/contractors')).data;
export const createContractorApi = async name =>
  (await apiClient.post('/contractors', { name })).data;
export const updateContractorApi = async ({ id, name }) =>
  (await apiClient.put(`/contractors/${id}`, { name })).data;
export const deleteContractorApi = async id =>
  (await apiClient.delete(`/contractors/${id}`)).data;
export const saveContractorAssignmentApi = async body =>
  (await apiClient.put('/contractors/assignments', body)).data;
export const saveContractorRotationApi = async body =>
  (await apiClient.put('/contractors/rotations', body)).data;
export const getContractorReportApi = async params =>
  (await apiClient.get('/contractors/report', { params })).data;
