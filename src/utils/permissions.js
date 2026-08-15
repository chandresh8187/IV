const ROLE_DEFAULTS = {
  'dashboard.view': ['superadmin', 'plant_manager', 'admin'],
  'production.view': ['superadmin', 'plant_manager', 'admin', 'supervisor'],
  'production.save': ['superadmin', 'plant_manager', 'supervisor'],
  'production.grant_edit': ['superadmin'],
  'production.manage_all': ['superadmin'],
  'shifts.view': ['superadmin', 'plant_manager', 'admin', 'supervisor'],
  'shifts.manage': ['superadmin', 'supervisor'],
  'history.view': ['superadmin', 'plant_manager', 'admin', 'supervisor'],
  'reports.generate': ['superadmin'],
  'planning.view': ['superadmin', 'plant_manager', 'admin'],
  'planning.manage': ['superadmin', 'plant_manager', 'admin'],
  'planning.import_pdf': ['superadmin', 'plant_manager', 'admin'],
  'certificates.view': ['superadmin', 'admin'],
  'certificates.generate': ['superadmin', 'admin'],
  'users.view': ['superadmin', 'plant_manager', 'admin'],
  'users.manage': ['superadmin'],
  'plant.view': ['superadmin', 'plant_manager', 'admin'],
  'plant.manage': ['superadmin', 'plant_manager'],
  'settings.manage': ['superadmin'],
  'app_updates.manage': ['superadmin'],
};

export const hasPermission = (user, permissionKey) => {
  const role = String(user?.role || '').toLowerCase().trim();
  if (role === 'superadmin') return true;

  if (Array.isArray(user?.permissions)) {
    return user.permissions.includes(permissionKey);
  }

  return Boolean(ROLE_DEFAULTS[permissionKey]?.includes(role));
};
