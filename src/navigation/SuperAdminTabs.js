import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Factory,
  LayoutDashboard,
  UserCircle2,
  Users,
} from 'lucide-react-native';
import React from 'react';

import DashboardScreen from '../screens/superadmin/DashboardScreen';
import ProfileScreen from './../screens/superadmin/ProfileScreen';
import UsersScreen from './../screens/superadmin/UsersScreen';
import ProductionStack from './comman/ProductionStock';
import { createTabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Production: Factory,
  Users: Users,
  Profile: UserCircle2,
};

const screenOptions = createTabScreenOptions(IconByRoute);

export default function SuperAdminTabs() {
  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Production" component={ProductionStack} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
