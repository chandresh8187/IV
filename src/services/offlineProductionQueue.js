import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveProductionApi } from '../api/productionApi';

const keyFor = userId => `offline-production-entries:${userId}`;
const listeners = new Set();
let gate = Promise.resolve();

const exclusive = operation => {
  const result = gate.then(operation);
  gate = result.catch(() => {});
  return result;
};

const read = async userId => JSON.parse(await AsyncStorage.getItem(keyFor(userId)) || '[]');
const write = async (userId, entries) => {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(entries));
  listeners.forEach(listener => listener(userId, entries));
};

export const subscribeOfflineProduction = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getOfflineProductionEntries = userId => userId ? exclusive(() => read(userId)) : Promise.resolve([]);

export const queueProductionEntry = (userId, body) => exclusive(async () => {
  if (!userId) throw new Error('Sign in before saving production.');
  const entries = await read(userId);
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const item = {
    id: requestId,
    created_at: new Date().toISOString(),
    status: 'pending',
    body: { ...body, client_request_id: requestId },
  };
  await write(userId, [...entries, item]);
  return item;
});

export const syncOfflineProductionEntries = (userId, { retryFailed = false } = {}) => exclusive(async () => {
  if (!userId) return { synced: 0, pending: 0 };
  let entries = await read(userId);
  let synced = 0;
  for (const item of [...entries]) {
    if (item.status === 'failed' && !retryFailed) continue;
    try {
      await saveProductionApi(item.body);
      entries = entries.filter(entry => entry.id !== item.id);
      await write(userId, entries);
      synced += 1;
    } catch (error) {
      if (!error?.response || error.response.status >= 500 || error.response.status === 423 || error.response.status === 429) break;
      entries = entries.map(entry => entry.id === item.id ? {
        ...entry,
        status: 'failed',
        error: error.response?.data?.message || 'Server rejected this entry. Review it before retrying.',
      } : entry);
      await write(userId, entries);
    }
  }
  return { synced, pending: entries.length };
});

export const removeOfflineProductionEntry = (userId, id) => exclusive(async () => {
  const entries = await read(userId);
  await write(userId, entries.filter(entry => entry.id !== id));
});
