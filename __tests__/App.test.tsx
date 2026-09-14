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
import {
  canOpenProductionWorkspace,
  shouldOpenLiveProductionDirectly,
  shouldShowShiftInProductionMenu,
  shouldShowShiftTab,
} from '../src/utils/accessNavigation';

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

  test('routes a live-production-only supervisor directly to the table', () => {
    const supervisor = {
      role: 'supervisor',
      permissions: ['production.view'],
    };

    expect(canOpenProductionWorkspace(supervisor)).toBe(true);
    expect(shouldOpenLiveProductionDirectly(supervisor)).toBe(true);
    expect(shouldShowShiftTab(supervisor)).toBe(false);
    expect(shouldShowShiftInProductionMenu(supervisor)).toBe(false);
  });

  test('keeps supervisor shift access in a tab and other roles in the menu', () => {
    const supervisor = {
      role: 'supervisor',
      permissions: ['production.view', 'shifts.view'],
    };
    const admin = { role: 'admin', permissions: ['shifts.view'] };

    expect(shouldOpenLiveProductionDirectly(supervisor)).toBe(true);
    expect(shouldShowShiftTab(supervisor)).toBe(true);
    expect(shouldShowShiftInProductionMenu(supervisor)).toBe(false);
    expect(shouldShowShiftTab(admin)).toBe(false);
    expect(shouldShowShiftInProductionMenu(admin)).toBe(true);
    expect(canOpenProductionWorkspace(admin)).toBe(true);
  });

  test('uses the Production menu when a supervisor has another module', () => {
    expect(
      shouldOpenLiveProductionDirectly({
        role: 'supervisor',
        permissions: ['production.view', 'history.view'],
      }),
    ).toBe(false);
  });

  test('keeps plant control in Production and settings access out of it', () => {
    expect(
      canOpenProductionWorkspace({
        role: 'admin',
        permissions: ['plant.view'],
      }),
    ).toBe(true);
    expect(
      canOpenProductionWorkspace({
        role: 'admin',
        permissions: ['settings.manage'],
      }),
    ).toBe(false);
  });
});
