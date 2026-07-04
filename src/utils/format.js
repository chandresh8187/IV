export const formatNumber = (value, fallback = '-') => {
  const num = Number(value);
  return Number.isFinite(num) ? String(Math.round(num)) : fallback;
};
