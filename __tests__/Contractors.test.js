import {
  activeContractorRule,
  contractorWeight,
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
