import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Clock,
  Factory,
  LayoutDashboard,
  Settings,
  UserCircle2,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { useSelector } from 'react-redux';

import ProductionStack from './comman/ProductionStock';
import SettingsStack from './comman/SettingsStack';
import { createTabScreenOptions } from './tabOptions';
import DashboardScreen from '../screens/superadmin/DashboardScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';
import UsersScreen from '../screens/superadmin/UsersScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';
import { hasPermission } from '../utils/permissions';
import { useResponsive } from '../utils/responsive';
import {
  canOpenProductionWorkspace,
  shouldShowSettingsTab,
  shouldShowShiftTab,
} from '../utils/accessNavigation';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Production: Factory,
  Shift: Clock,
  Users,
  Settings,
  Profile: UserCircle2,
};

export default function AccessTabs() {
  const { useNavigationRail } = useResponsive();
  const screenOptions = createTabScreenOptions(IconByRoute, useNavigationRail);
  const user = useSelector(state => state.auth.user);
  const canDashboard = hasPermission(user, 'dashboard.view');
  const canProduction = canOpenProductionWorkspace(user);
  const showShiftTab = shouldShowShiftTab(user);
  const canUsers = hasPermission(user, 'users.view');
  const showSettingsTab = shouldShowSettingsTab(user);
  const initialRouteName = canDashboard
    ? 'Dashboard'
    : canProduction
    ? 'Production'
    : showShiftTab
    ? 'Shift'
    : canUsers
    ? 'Users'
    : showSettingsTab
    ? 'Settings'
    : 'Profile';

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={screenOptions}
    >
      {canDashboard && (
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
      )}
      {canProduction && (
        <Tab.Screen name="Production" component={ProductionStack} />
      )}
      {showShiftTab && <Tab.Screen name="Shift" component={ShiftScreen} />}
      {canUsers && <Tab.Screen name="Users" component={UsersScreen} />}
      {showSettingsTab && (
        <Tab.Screen name="Settings" component={SettingsStack} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
