import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'iv:offline-production-queue:v1';

const readQueue = async () => {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = queue =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));

export const createClientRequestId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const enqueueOfflineProduction = async payload => {
  const queue = await readQueue();
  const item = {
    ...payload,
    client_request_id: payload.client_request_id || createClientRequestId(),
    queued_at: new Date().toISOString(),
  };
  await writeQueue([...queue, item]);
  return item;
};

export const getOfflineProductionCount = async () => (await readQueue()).length;

export const flushOfflineProductions = async saveProduction => {
  const queue = await readQueue();
  if (!queue.length) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;
  for (const item of queue) {
    try {
      await saveProduction(item);
      synced += 1;
    } catch (error) {
      const status = error?.response?.status;
      if (!status || status >= 500) remaining.push(item);
    }
  }
  await writeQueue(remaining);
  return { synced, remaining: remaining.length };
};
