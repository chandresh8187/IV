import { hasPermission } from './permissions';

const PRODUCTION_WORKSPACE_PERMISSIONS = [
  'production.view',
  'history.view',
  'planning.view',
  'certificates.view',
  'settings.manage',
  'app_updates.manage',
];

const NON_LIVE_PRODUCTION_PERMISSIONS = PRODUCTION_WORKSPACE_PERMISSIONS.filter(
  key => key !== 'production.view',
);

export const normalizeUserRole = user =>
  String(user?.role || '').toLowerCase().trim();

export const canOpenProductionWorkspace = user =>
  PRODUCTION_WORKSPACE_PERMISSIONS.some(key => hasPermission(user, key)) ||
  (normalizeUserRole(user) !== 'supervisor' &&
    hasPermission(user, 'shifts.view'));

export const shouldOpenLiveProductionDirectly = user =>
  normalizeUserRole(user) === 'supervisor' &&
  hasPermission(user, 'production.view') &&
  !NON_LIVE_PRODUCTION_PERMISSIONS.some(key => hasPermission(user, key));

export const shouldShowShiftTab = user =>
  normalizeUserRole(user) === 'supervisor' &&
  hasPermission(user, 'shifts.view');

export const shouldShowShiftInProductionMenu = user =>
  normalizeUserRole(user) !== 'supervisor' &&
  hasPermission(user, 'shifts.view');
