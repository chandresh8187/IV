const timeInSeconds = value => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  if (minutes > 59 || seconds > 59) return null;
  if (match[4]) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (match[4].toUpperCase() === 'PM' ? 12 : 0);
  } else if (hours > 23) return null;
  return hours * 3600 + minutes * 60 + seconds;
};

// A shift date is the operational date, so night-shift morning entries belong
// after that evening, not before it. Keep unknown times last within the shift.
export const sortProductionEntries = (rows, fallbackShiftName = '') => {
  const keyedRows = rows.map((row, index) => {
    const shiftName = String(row.shift_name || fallbackShiftName)
      .trim()
      .toLowerCase();
    const seconds = timeInSeconds(row.production_time);
    const time =
      seconds === null
        ? Infinity
        : shiftName === 'night' && seconds < 12 * 3600
        ? seconds + 24 * 3600
        : seconds;
    return {
      row,
      index,
      time,
      date: String(row.shift_date || '').slice(0, 10),
      shift: shiftName === 'night' ? 1 : 0,
    };
  });
  return keyedRows
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.shift - b.shift ||
        a.time - b.time ||
        (Number(a.row.id) || 0) - (Number(b.row.id) || 0) ||
        a.index - b.index,
    )
    .map(({ row }) => row);
};
