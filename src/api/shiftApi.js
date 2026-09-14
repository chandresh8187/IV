import apiClient from './apiClient';

export const getShiftStatusApi = async () => {
  const response = await apiClient.get('/shifts/status');
  return response.data;
};

export const getProductionShiftStatusApi = async () => {
  const response = await apiClient.get('/shifts/production-context');
  return response.data;
};

export const getPreviousShiftsApi = async date => {
  const response = await apiClient.get('/shifts/correction/shifts', { params: { date } });
  return response.data;
};
export const openShiftCorrectionApi = async body => {
  const response = await apiClient.post('/shifts/correction', body);
  return response.data;
};
export const resumeCurrentShiftApi = async body => {
  const response = await apiClient.post('/shifts/correction/resume', body);
  return response.data;
};
export const getCorrectionPlanningItemsApi = async () => {
  const response = await apiClient.get('/shifts/correction/planning-items');
  return response.data;
};
