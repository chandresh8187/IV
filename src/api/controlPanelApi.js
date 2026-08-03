import apiClient from './apiClient';

export const getControlPanelSettingsApi = async () => {
  const response = await apiClient.get('/settings');
  return response.data;
};

export const updateControlPanelSettingApi = async ({ key, body }) => {
  const response = await apiClient.put(`/settings/${key}`, body);
  return response.data;
};

export const getAuditLogsApi = async (limit = 100) => {
  const response = await apiClient.get('/settings/audit/logs', {
    params: { limit },
  });
  return response.data;
};

export const getAndroidReleaseApi = async () => {
  const response = await apiClient.get('/app-update/android');
  return response.data;
};

export const updateAndroidReleaseApi = async body => {
  const response = await apiClient.put('/app-update/android', body);
  return response.data;
};

export const uploadAndroidApkApi = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('apk', {
    uri: file.uri,
    name: file.name || 'iv-release.apk',
    type: file.type || 'application/vnd.android.package-archive',
  });

  const response = await apiClient.post('/app-update/android/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 10 * 60 * 1000,
    onUploadProgress,
  });
  return response.data;
};
