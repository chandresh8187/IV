import {
  BellRing,
  CalendarRange,
  HardHat,
  PackageOpen,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react-native';
import React from 'react';
import { useSelector } from 'react-redux';

import ModuleMenu from '../../components/ModuleMenu';
import { hasPermission } from '../../utils/permissions';

const SETTINGS_ACTIONS = [
  {
    title: 'User Access',
    icon: ShieldCheck,
    screen: 'UserAccess',
    description: 'Manage users and decide which operations each user can perform.',
    superadminOnly: true,
  },
  {
    title: 'Contractors',
    icon: HardHat,
    screen: 'Contractors',
    description: 'Add contractors and browse the contractor list.',
    permissions: ['contractors.view'],
  },
  {
    title: 'Items',
    icon: PackageOpen,
    screen: 'Items',
    description: 'Material catalogue and production item definitions.',
  },
  {
    title: 'Financial Year',
    icon: CalendarRange,
    screen: 'FinancialYear',
    description: 'Accounting periods and financial year records.',
  },
  {
    title: 'Control Panel',
    icon: SlidersHorizontal,
    screen: 'ControlPanel',
    description: 'Shift rules, app releases and system configuration.',
    permissions: ['settings.manage', 'app_updates.manage'],
  },
  {
    title: 'Test Notifications',
    icon: BellRing,
    screen: 'NotificationTest',
    description: 'Verify device delivery and production alerts.',
    superadminOnly: true,
  },
];

export default function SettingsMenuScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const role = String(user?.role || '')
    .toLowerCase()
    .trim();
  const actions = SETTINGS_ACTIONS.filter(item => {
    if (item.superadminOnly) return role === 'superadmin';
    if (item.permissions) {
      return item.permissions.some(permission =>
        hasPermission(user, permission),
      );
    }
    return true;
  });

  return (
    <ModuleMenu
      eyebrow="SYSTEM ADMINISTRATION"
      title="Settings"
      description="Master records, access controls and system diagnostics."
      actions={actions}
      onSelect={item => navigation.navigate(item.screen)}
    />
  );
}
