import { shouldShowSettingsTab } from '../src/utils/accessNavigation';

describe('Settings tab permission access', () => {
  test('superadmin always sees Settings', () => {
    expect(shouldShowSettingsTab({ role: 'superadmin', permissions: [] })).toBe(true);
  });
  test.each(['plant_manager', 'admin', 'supervisor'])(
    '%s sees Settings when granted a settings feature',
    role => {
      expect(shouldShowSettingsTab({ role, permissions: ['contractors.view'] })).toBe(true);
      expect(shouldShowSettingsTab({ role, permissions: ['settings.manage'] })).toBe(true);
    },
  );
  test.each(['plant_manager', 'admin', 'supervisor'])(
    '%s does not see Settings when relevant permissions are disabled',
    role => {
      expect(shouldShowSettingsTab({ role, permissions: [] })).toBe(false);
    },
  );
  test('hides Settings without a signed-in user', () => {
    expect(shouldShowSettingsTab(null)).toBe(false);
  });
});
