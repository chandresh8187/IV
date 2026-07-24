export const formatNumber = (value, fallback = '-') => {
  const num = Number(value);
  return Number.isFinite(num) ? String(Math.round(num)) : fallback;
};

export const formatWeight = value => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '0';
  }

  return Number(number.toFixed(2)).toString();
};
