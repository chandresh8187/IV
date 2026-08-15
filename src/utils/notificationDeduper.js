const recentlyDisplayed = new Map();
const DEDUPE_WINDOW_MS = 10000;

export const shouldDisplayNotification = key => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return true;

  const now = Date.now();
  const previous = recentlyDisplayed.get(normalizedKey) || 0;
  recentlyDisplayed.set(normalizedKey, now);

  for (const [storedKey, displayedAt] of recentlyDisplayed) {
    if (now - displayedAt > DEDUPE_WINDOW_MS) {
      recentlyDisplayed.delete(storedKey);
    }
  }

  return now - previous > DEDUPE_WINDOW_MS;
};
