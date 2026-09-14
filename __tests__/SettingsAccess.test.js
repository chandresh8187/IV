import { shouldShowSettingsTab } from '../src/utils/accessNavigation';

describe('Settings tab role access', () => {
  test.each(['superadmin', 'plant_manager', ' Plant_Manager ', 'SUPERADMIN'])(
    'shows Settings for %s',
    role => {
      expect(shouldShowSettingsTab({ role, permissions: [] })).toBe(true);
    },
  );
  test.each(['admin', 'supervisor', ' ADMIN ', '', 'unknown'])(
    'hides Settings for %s even with a permission override',
    role => {
      expect(
        shouldShowSettingsTab({ role, permissions: ['settings.manage'] }),
      ).toBe(false);
    },
  );
  test('hides Settings without a signed-in user', () => {
    expect(shouldShowSettingsTab(null)).toBe(false);
  });
});
