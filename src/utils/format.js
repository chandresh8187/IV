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

export const formatQuantity = (value, fallback = '0') =>
  formatNumber(value, fallback);

export const formatTime12Hour = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

  if (!match) {
    return String(value);
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const existingPeriod = match[3]?.toUpperCase();

  if (existingPeriod) {
    hour = hour % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${minute} ${existingPeriod}`;
  }

  if (hour > 23) {
    return String(value);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${String(hour).padStart(2, '0')}:${minute} ${period}`;
};
