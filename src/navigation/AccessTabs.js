import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Clock,
  Factory,
  Gauge,
  LayoutDashboard,
  UserCircle2,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { useSelector } from 'react-redux';

import ProductionStack from './comman/ProductionStock';
import { createTabScreenOptions } from './tabOptions';
import DashboardScreen from '../screens/superadmin/DashboardScreen';
import PlantControlScreen from '../screens/superadmin/PlantControlScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';
import UsersScreen from '../screens/superadmin/UsersScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';
import { hasPermission } from '../utils/permissions';
import {
  canOpenProductionWorkspace,
  shouldShowShiftTab,
} from '../utils/accessNavigation';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Production: Factory,
  Shift: Clock,
  Users,
  PlantControl: Gauge,
  Profile: UserCircle2,
};

const screenOptions = createTabScreenOptions(IconByRoute);
export default function AccessTabs() {
  const user = useSelector(state => state.auth.user);
  const canDashboard = hasPermission(user, 'dashboard.view');
  const canProduction = canOpenProductionWorkspace(user);
  const showShiftTab = shouldShowShiftTab(user);
  const canUsers = hasPermission(user, 'users.view');
  const canPlantControl = hasPermission(user, 'plant.view');
  const initialRouteName = canDashboard
    ? 'Dashboard'
    : canProduction
      ? 'Production'
      : showShiftTab
        ? 'Shift'
        : canUsers
          ? 'Users'
          : canPlantControl
            ? 'PlantControl'
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
      {canPlantControl && (
        <Tab.Screen
          name="PlantControl"
          component={PlantControlScreen}
          options={{ title: 'Plant Control' }}
        />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
