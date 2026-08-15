import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'iv:offline-production-queue:v1';

let queueMutation = Promise.resolve();
const activeFlushes = new Map();
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Queue persistence must not fail because a mounted UI listener failed.
    }
  });
};

const readQueue = async () => {
  try {
    const parsed = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async queue => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  notifyListeners();
};

const mutateQueue = operation => {
  const nextMutation = queueMutation
    .catch(() => {})
    .then(async () => {
      const queue = await readQueue();
      const nextQueue = await operation(queue);
      await writeQueue(nextQueue);
      return nextQueue;
    });

  queueMutation = nextMutation.catch(() => {});
  return nextMutation;
};

const belongsToUser = (item, userId) => {
  if (item.queued_by_user_id == null) return true;
  return String(item.queued_by_user_id) === String(userId);
};

const getErrorMessage = error =>
  error?.response?.data?.message || error?.message || 'Could not synchronize';

export const createClientRequestId = () =>
  `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const enqueueOfflineProduction = async (payload, userId) => {
  const item = {
    ...payload,
    client_request_id: payload.client_request_id || createClientRequestId(),
    queued_by_user_id: userId || null,
    queued_at: new Date().toISOString(),
    sync_attempts: 0,
    last_sync_error: null,
  };

  await mutateQueue(queue => {
    const alreadyQueued = queue.some(
      queued => queued.client_request_id === item.client_request_id,
    );
    return alreadyQueued ? queue : [...queue, item];
  });
  return item;
};

export const getOfflineProductionQueueStats = async userId => {
  const queue = (await readQueue()).filter(item => belongsToUser(item, userId));
  return {
    total: queue.length,
    failed: queue.filter(item => item.last_sync_error).length,
  };
};

export const getOfflineProductionCount = async userId =>
  (await getOfflineProductionQueueStats(userId)).total;

export const subscribeOfflineProductionQueue = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const runFlush = async (saveProduction, userId) => {
  const queue = (await readQueue()).filter(item => belongsToUser(item, userId));
  if (!queue.length) return { synced: 0, remaining: 0, failed: 0 };

  const outcomes = new Map();
  let synced = 0;
  for (const item of queue) {
    try {
      const {
        queued_by_user_id,
        queued_at,
        sync_attempts,
        last_sync_error,
        last_sync_attempt_at,
        ...payload
      } = item;
      await saveProduction(payload);
      outcomes.set(item.client_request_id, { synced: true });
      synced += 1;
    } catch (error) {
      outcomes.set(item.client_request_id, {
        synced: false,
        last_sync_error: getErrorMessage(error),
      });
    }
  }

  const nextQueue = await mutateQueue(currentQueue =>
    currentQueue.flatMap(item => {
      const outcome = outcomes.get(item.client_request_id);
      if (!outcome) return [item];
      if (outcome.synced) return [];
      return [
        {
          ...item,
          sync_attempts: Number(item.sync_attempts || 0) + 1,
          last_sync_error: outcome.last_sync_error,
          last_sync_attempt_at: new Date().toISOString(),
        },
      ];
    }),
  );

  const remainingForUser = nextQueue.filter(item => belongsToUser(item, userId));
  return {
    synced,
    remaining: remainingForUser.length,
    failed: remainingForUser.filter(item => item.last_sync_error).length,
  };
};

export const flushOfflineProductions = (saveProduction, userId) => {
  if (!userId) {
    return Promise.resolve({ synced: 0, remaining: 0, failed: 0 });
  }
  const userKey = String(userId);
  if (activeFlushes.has(userKey)) return activeFlushes.get(userKey);

  const flush = runFlush(saveProduction, userId).finally(() => {
    activeFlushes.delete(userKey);
  });
  activeFlushes.set(userKey, flush);
  return flush;
};
