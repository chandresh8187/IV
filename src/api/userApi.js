import apiClient from './apiClient';

export const registerUserApi = async body => {
  const response = await apiClient.post('/auth/register', body);
  return response.data;
};

export const getSupervisorsApi = async () => {
  const response = await apiClient.get('/supervisors');
  return response.data;
};

export const getActiveSupervisorsApi = async () => {
  const response = await apiClient.get('/supervisors/active');
  return response.data;
};

export const getUsersApi = async params => {
  const response = await apiClient.get('/users', { params });
  return response.data;
};
