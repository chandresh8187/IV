import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://localhost:5000/api/';
const BASE_URL = 'http://192.168.1.114:5000/api';

export async function apiRequest({ endpoint, method = 'GET', body }) {
  let JwtToken = await AsyncStorage.getItem('JwtToken');
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(JwtToken
        ? {
            Authorization: `Bearer ${JwtToken}`,
          }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}
