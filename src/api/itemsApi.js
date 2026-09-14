import apiClient from './apiClient';

export const getItemsApi = async () => {
  const response = await apiClient.get('/items');
  return response.data;
};

export const createItemApi = async itemName => {
  const response = await apiClient.post('/items', { item_name: itemName });
  return response.data;
};

export const updateItemApi = async ({ id, itemName }) => {
  const response = await apiClient.put(`/items/${id}`, {
    item_name: itemName,
  });
  return response.data;
};

export const deleteItemApi = async id => {
  const response = await apiClient.delete(`/items/${id}`);
  return response.data;
};
