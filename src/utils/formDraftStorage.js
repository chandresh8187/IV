import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'iv:form-draft:v1';
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const safeKeyPart = value => encodeURIComponent(String(value ?? '').trim());

export const buildFormDraftKey = ({ formName, userId, scope }) => {
  if (!formName || !userId) return null;
  const parts = [DRAFT_PREFIX, safeKeyPart(formName), `user-${safeKeyPart(userId)}`];
  if (scope != null && scope !== '') parts.push(`scope-${safeKeyPart(scope)}`);
  return parts.join(':');
};

export const loadFormDraft = async (key, maxAgeMs = DEFAULT_MAX_AGE_MS) => {
  if (!key) return null;

  try {
    const draft = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
    const savedAt = new Date(draft?.saved_at).getTime();
    if (!draft?.values || !Number.isFinite(savedAt)) return null;

    if (Date.now() - savedAt > maxAgeMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return draft.values;
  } catch {
    return null;
  }
};

export const saveFormDraft = async (key, values) => {
  if (!key || !values) return;
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ values, saved_at: new Date().toISOString() }),
  );
};

export const removeFormDraft = async key => {
  if (key) await AsyncStorage.removeItem(key);
};
