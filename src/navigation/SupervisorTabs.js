import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Clock, Factory, UserCircle2 } from 'lucide-react-native';
import React from 'react';

import ProductionScreen from '../screens/superadmin/ProductionScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';
import { createTabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Shift: Clock,
  Production: Factory,
  Profile: UserCircle2,
};

const screenOptions = createTabScreenOptions(IconByRoute);

export default function SupervisorTabs() {
  return (
    <Tab.Navigator initialRouteName="Production" screenOptions={screenOptions}>
      <Tab.Screen name="Production" component={ProductionScreen} />
      <Tab.Screen name="Shift" component={ShiftScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
