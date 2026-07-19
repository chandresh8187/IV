import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Factory,
  Gauge,
  LayoutDashboard,
  UserCircle2,
} from 'lucide-react-native';
import React from 'react';

import DashboardScreen from '../screens/superadmin/DashboardScreen';
import PlantControlScreen from '../screens/superadmin/PlantControlScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';
import ProductionStack from './comman/ProductionStock';
import { createTabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Production: Factory,
  PlantControl: Gauge,
  Profile: UserCircle2,
};

const screenOptions = createTabScreenOptions(IconByRoute);

export default function PlantManagerTabs() {
  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Production" component={ProductionStack} />
      <Tab.Screen
        name="PlantControl"
        component={PlantControlScreen}
        options={{ title: 'Plant Control' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
