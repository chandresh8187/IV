import apiClient from './apiClient';

export const createProductionPlanningApi = async body => {
  const response = await apiClient.post('/production-planning', body);
  return response.data;
};

export const updateProductionPlanningApi = async ({ id, body }) => {
  const response = await apiClient.put(`/production-planning/${id}`, body);
  return response.data;
};

export const deleteProductionPlanningApi = async id => {
  const response = await apiClient.delete(`/production-planning/${id}`);
  return response.data;
};

export const getProductionPlanningApi = async params => {
  const response = await apiClient.get('/production-planning', { params });
  return response.data;
};

export const getAvailablePlanningApi = async () => {
  const response = await apiClient.get('/production-planning/available');
  return response.data;
};

export const extractPlanningPdfApi = async file => {
  const formData = new FormData();

  formData.append('pdf', {
    uri: file.uri,
    name: file.name || 'planning.pdf',
    type: file.type || 'application/pdf',
  });

  const response = await apiClient.post(
    '/production-planning/extract-pdf',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};
