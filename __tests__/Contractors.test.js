import {
  activeContractorRule,
  contractorWeight,
  contractorMonth,
  offsetContractorMonth,
} from '../src/utils/contractors';
import {
  canOpenProductionWorkspace,
  shouldOpenLiveProductionDirectly,
} from '../src/utils/accessNavigation';
import { hasPermission } from '../src/utils/permissions';

const rules = [
  { shift_name: 'day', effective_from: '2026-09-20', contractor_id: 2 },
  { shift_name: 'day', effective_from: '2026-09-18', contractor_id: 1 },
  { shift_name: 'night', effective_from: '2026-09-18', contractor_id: 2 },
  { shift_name: 'day', effective_from: '2026-09-22', contractor_id: null },
];
test('assignment repeats until the next dated rule without changing earlier dates', () => {
  expect(activeContractorRule(rules, 'day', '2026-09-17')).toBeUndefined();
  expect(activeContractorRule(rules, 'day', '2026-09-18').contractor_id).toBe(
    1,
  );
  expect(activeContractorRule(rules, 'day', '2026-09-19').contractor_id).toBe(
    1,
  );
  expect(activeContractorRule(rules, 'day', '2026-09-20').contractor_id).toBe(
    2,
  );
  expect(activeContractorRule(rules, 'night', '2026-09-20').contractor_id).toBe(
    2,
  );
  expect(
    activeContractorRule(rules, 'day', '2026-09-25').contractor_id,
  ).toBeNull();
  expect(rules[0].effective_from).toBe('2026-09-20');
});

test('monthly rotation and mid-month changes match historical ownership', () => {
  const rotations = [
    {
      effective_from: '2026-09-18',
      day_contractor_id: 1,
      night_contractor_id: 2,
      rotate_monthly: 1,
    },
  ];
  expect(
    activeContractorRule([], 'night', '2026-09-30', rotations).contractor_id,
  ).toBe(2);
  expect(
    activeContractorRule([], 'night', '2026-10-01', rotations).contractor_id,
  ).toBe(1);
  expect(
    activeContractorRule([], 'day', '2027-01-01', rotations).contractor_id,
  ).toBe(1);
  rotations.push({
    effective_from: '2026-10-15',
    day_contractor_id: 1,
    night_contractor_id: 2,
    rotate_monthly: 1,
  });
  expect(
    activeContractorRule([], 'day', '2026-10-14', rotations).contractor_id,
  ).toBe(2);
  expect(
    activeContractorRule([], 'day', '2026-10-15', rotations).contractor_id,
  ).toBe(1);
  expect(
    activeContractorRule([], 'day', '2026-11-01', rotations).contractor_id,
  ).toBe(2);
});

test('month navigation handles December and January boundaries', () => {
  expect(contractorMonth(new Date(2026, 8, 30))).toBe('2026-09');
  expect(offsetContractorMonth('2026-12', 1)).toBe('2027-01');
  expect(offsetContractorMonth('2026-01', -1)).toBe('2025-12');
});
test('one tonne equals 1000 kg', () => {
  expect(contractorWeight(1605, 't')).toBe('1.605');
  expect(contractorWeight(1605, 'kg')).toBe('1,605.00');
  expect(contractorWeight(null, 't')).toBe('0.000');
});
test('permission defaults and overrides gate contractor access', () => {
  expect(hasPermission({ role: 'plant_manager' }, 'contractors.manage')).toBe(
    true,
  );
  expect(hasPermission({ role: 'admin' }, 'contractors.manage')).toBe(false);
  expect(hasPermission({ role: 'supervisor' }, 'contractors.view')).toBe(false);
  const user = {
    role: 'supervisor',
    permissions: ['production.view', 'contractors.view'],
  };
  expect(canOpenProductionWorkspace(user)).toBe(true);
  expect(shouldOpenLiveProductionDirectly(user)).toBe(false);
});
