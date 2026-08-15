/**
 * @format
 */

import {
  formatDateForApi,
  formatNumber,
  formatQuantity,
  formatTimeForApi,
  formatTime12Hour,
  formatWeight,
  parseDateForPicker,
  parseTimeForPicker,
} from '../src/utils/format';
import { getCoatingRange } from '../src/utils/coatingRange';
import { hasPermission } from '../src/utils/permissions';
import { shouldDisplayNotification } from '../src/utils/notificationDeduper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildFormDraftKey,
  loadFormDraft,
  removeFormDraft,
  saveFormDraft,
} from '../src/utils/formDraftStorage';
import {
  enqueueOfflineProduction,
  flushOfflineProductions,
  getOfflineProductionQueueStats,
} from '../src/utils/offlineProductionQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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

  test('round-trips picker dates without timezone or invalid-date errors', () => {
    const selectedDate = parseDateForPicker('2026-08-10');

    expect(Number.isNaN(selectedDate.getTime())).toBe(false);
    expect(formatDateForApi(selectedDate)).toBe('2026-08-10');
  });

  test('round-trips production times through a native picker value', () => {
    const selectedTime = parseTimeForPicker('13:45:00');

    expect(Number.isNaN(selectedTime.getTime())).toBe(false);
    expect(formatTimeForApi(selectedTime)).toBe('13:45:00');
  });

  test('uses 80+ coating readings when no custom certificate range is set', () => {
    expect(getCoatingRange('', '')).toEqual({
      minimum: null,
      maximum: null,
      description: 'average coating of 80 micron or above',
      error: null,
    });
  });

  test('accepts an inclusive certificate coating range', () => {
    expect(getCoatingRange('70', '80')).toEqual({
      minimum: 70,
      maximum: 80,
      description: 'average coating from 70 to 80 micron',
      error: null,
    });
    expect(getCoatingRange('81', '80').error).toBe(
      'Minimum coating cannot be greater than maximum coating.',
    );
  });
});

describe('feature access', () => {
  test('uses role defaults until server permissions are loaded', () => {
    expect(hasPermission({ role: 'plant_manager' }, 'planning.view')).toBe(true);
    expect(hasPermission({ role: 'plant_manager' }, 'reports.generate')).toBe(
      false,
    );
  });

  test('uses the server permission list for custom access', () => {
    const plantManager = {
      role: 'plant_manager',
      permissions: ['planning.view', 'reports.generate'],
    };

    expect(hasPermission(plantManager, 'reports.generate')).toBe(true);
    expect(hasPermission(plantManager, 'dashboard.view')).toBe(false);
    expect(hasPermission({ role: 'superadmin', permissions: [] }, 'users.manage')).toBe(
      true,
    );
  });
});

describe('notification delivery', () => {
  test('deduplicates the same foreground FCM and socket alert', () => {
    const notificationKey = 'planning-zinc-test-entry-1';

    expect(shouldDisplayNotification(notificationKey)).toBe(true);
    expect(shouldDisplayNotification(notificationKey)).toBe(false);
    expect(shouldDisplayNotification(`${notificationKey}-different`)).toBe(
      true,
    );
  });
});

describe('persistent form drafts', () => {
  beforeEach(() => AsyncStorage.clear());

  test('stores drafts separately for each user and form scope', async () => {
    const key = buildFormDraftKey({
      formName: 'add-production',
      userId: 7,
      scope: 42,
    });
    const otherShiftKey = buildFormDraftKey({
      formName: 'add-production',
      userId: 7,
      scope: 43,
    });

    await saveFormDraft(key, { dipping_qty: '25' });

    expect(await loadFormDraft(key)).toEqual({ dipping_qty: '25' });
    expect(await loadFormDraft(otherShiftKey)).toBeNull();
    await removeFormDraft(key);
    expect(await loadFormDraft(key)).toBeNull();
  });
});

describe('offline production queue', () => {
  beforeEach(() => AsyncStorage.clear());

  test('deduplicates requests, keeps failed entries, and removes synced entries', async () => {
    const payload = {
      client_request_id: 'mobile-test-request-1',
      entry_type: 'full',
      sr_no: '1',
    };

    await enqueueOfflineProduction(payload, 7);
    await enqueueOfflineProduction(payload, 7);
    expect(await getOfflineProductionQueueStats(7)).toEqual({
      total: 1,
      failed: 0,
    });
    expect((await getOfflineProductionQueueStats(8)).total).toBe(0);

    const failed = await flushOfflineProductions(
      () => Promise.reject(new Error('Still offline')),
      7,
    );
    expect(failed).toEqual({ synced: 0, remaining: 1, failed: 1 });

    const synced = await flushOfflineProductions(() => Promise.resolve(), 7);
    expect(synced).toEqual({ synced: 1, remaining: 0, failed: 0 });
  });
});
