import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import {
  buildFormDraftKey,
  loadFormDraft,
  removeFormDraft,
  saveFormDraft,
} from '../utils/formDraftStorage';

export default function usePersistentFormDraft({
  formName,
  userId,
  scope,
  values,
  enabled,
  maxAgeMs,
}) {
  const key = useMemo(
    () => buildFormDraftKey({ formName, userId, scope }),
    [formName, scope, userId],
  );
  const latestValues = useRef(values);
  const enabledRef = useRef(enabled);
  const dirtyRef = useRef(false);

  latestValues.current = values;
  enabledRef.current = enabled;

  const markChanged = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const persistNow = useCallback(async () => {
    if (key && enabledRef.current && dirtyRef.current) {
      await saveFormDraft(key, latestValues.current);
    }
  }, [key]);

  const loadDraft = useCallback(
    () => loadFormDraft(key, maxAgeMs),
    [key, maxAgeMs],
  );

  const clearDraft = useCallback(async () => {
    dirtyRef.current = false;
    await removeFormDraft(key);
  }, [key]);

  useEffect(() => {
    if (!enabled || !dirtyRef.current || !key) return undefined;
    const timer = setTimeout(() => {
      if (enabledRef.current && dirtyRef.current) {
        saveFormDraft(key, values).catch(() => {});
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [enabled, key, values]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') persistNow().catch(() => {});
    });
    return () => subscription.remove();
  }, [persistNow]);

  return { clearDraft, loadDraft, markChanged, persistNow };
}
