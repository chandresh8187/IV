/**
 * @format
 */

import {
  formatNumber,
  formatQuantity,
  formatTime12Hour,
  formatWeight,
} from '../src/utils/format';

describe('display formatting', () => {
  test('formats production quantities without database decimal padding', () => {
    expect(formatQuantity('672.000')).toBe('672');
    expect(formatNumber('79.400')).toBe('79');
  });

  test('keeps useful weight precision and removes trailing zeroes', () => {
    expect(formatWeight('4230.0000')).toBe('4230');
    expect(formatWeight('4230.5000')).toBe('4230.5');
  });

  test('formats database times using a 12-hour clock', () => {
    expect(formatTime12Hour('00:05:00')).toBe('12:05 AM');
    expect(formatTime12Hour('13:30:00')).toBe('01:30 PM');
  });
});
