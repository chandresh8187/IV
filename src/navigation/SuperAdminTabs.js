import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CalendarClock,
  Factory,
  History,
  LayoutDashboard,
  UserCircle2,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS } from '../assets/Colors';
import DashboardScreen from '../screens/superadmin/DashboardScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';
import ProfileScreen from './../screens/superadmin/ProfileScreen';
import UsersScreen from './../screens/superadmin/UsersScreen';
import HistoryStack from './comman/HistoryStack';
import ProductionStack from './comman/ProductionStock';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Shift: CalendarClock,
  Production: Factory,
  History: History,
  Users: Users,
  Profile: UserCircle2,
};

function TabIcon({ routeName, focused, color }) {
  const Icon = IconByRoute[routeName] || LayoutDashboard;

  return (
    <View style={styles.iconOuter}>
      {focused && <View style={styles.topLine} />}

      <View style={[styles.iconPill, focused && styles.iconPillActive]}>
        <Icon
          size={22}
          color={focused ? COLORS.primary : color}
          strokeWidth={focused ? 2.7 : 2.2}
        />
      </View>
    </View>
  );
}

export default function SuperAdminTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTitleStyle: {
          color: COLORS.white,
          fontWeight: '900',
        },
        sceneStyle: {
          backgroundColor: COLORS.primary,
        },
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,

        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Production" component={ProductionStack} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 12,
  },

  tabBarItem: {
    paddingVertical: 4,
  },

  label: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  iconOuter: {
    height: 34,
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topLine: {
    position: 'absolute',
    top: -7,
    width: 24,
    height: 3,
    borderRadius: 99,
    backgroundColor: COLORS.accent,
  },

  iconPill: {
    height: 34,
    minWidth: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconPillActive: {
    backgroundColor: COLORS.lightBlue,
  },
});
