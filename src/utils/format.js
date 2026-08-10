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

const isValidDate = value =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const parseDateForPicker = (value, fallback = new Date()) => {
  if (isValidDate(value)) {
    return new Date(value.getTime());
  }

  const match = String(value || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const parsed = new Date(year, month, day, 12, 0, 0, 0);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(value);
  if (isValidDate(parsed)) {
    return parsed;
  }

  return isValidDate(fallback) ? new Date(fallback.getTime()) : new Date();
};

export const formatDateForApi = value => {
  const date = parseDateForPicker(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseTimeForPicker = (value, fallback = new Date()) => {
  if (isValidDate(value)) {
    return new Date(value.getTime());
  }

  const result = isValidDate(fallback)
    ? new Date(fallback.getTime())
    : new Date();
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) {
    return result;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const period = match[4]?.toUpperCase();

  if (period) {
    if (hour < 1 || hour > 12) return result;
    hour = hour % 12 + (period === 'PM' ? 12 : 0);
  }

  if (hour > 23 || minute > 59 || second > 59) {
    return result;
  }

  result.setHours(hour, minute, second, 0);
  return result;
};

export const formatTimeForApi = value => {
  const date = isValidDate(value) ? value : parseTimeForPicker(value);

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(part => String(part).padStart(2, '0'))
    .join(':');
};

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
