import apiClient from './apiClient';

export const createCertificateApi = async body => {
  const response = await apiClient.post('/certificates', body);
  return response.data;
};

export const deleteCertificatesApi = async ids => {
  const response = await apiClient.delete('/certificates', { data: { ids } });
  return response.data;
};

export const generateCertificatePdfApi = async body => {
  return apiClient.post('/certificates/pdf', body, {
    responseType: 'arraybuffer',
    timeout: 120000,
  });
};

export const downloadSavedCertificatePdfApi = id =>
  apiClient.get(`/certificates/${id}/pdf`, {
    responseType: 'arraybuffer',
    timeout: 120000,
  });

export const getCertificatesApi = async params => {
  const response = await apiClient.get('/certificates', { params });
  return response.data;
};

export const getCertificateByIdApi = async id => {
  const response = await apiClient.get(`/certificates/${id}`);
  return response.data;
};

export const getCertificateReadingsApi = async ({
  planningId,
  minimum,
  maximum,
}) => {
  const response = await apiClient.get('/certificates/readings', {
    params: {
      planning_id: planningId,
      minimum: minimum ?? undefined,
      maximum: maximum ?? undefined,
    },
  });
  return response.data;
};
