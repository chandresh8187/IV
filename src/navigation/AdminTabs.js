import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Factory,
  History,
  Users,
  UserCircle2,
} from 'lucide-react-native';

import DashboardScreen from '../screens/superadmin/DashboardScreen';
import ProductionScreen from '../screens/superadmin/ProductionScreen';
import HistoryScreen from '../screens/superadmin/HistoryScreen';
import UsersScreen from '../screens/superadmin/UsersScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  lightBlue: '#EEF7FD',
  border: '#E5E7EB',
};

const IconByRoute = {
  Dashboard: LayoutDashboard,
  Production: Factory,
  History: History,
  Users: Users,
  Profile: UserCircle2,
};

function TabIcon({ routeName, focused, color }) {
  const Icon = IconByRoute[routeName];

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

export default function AdminTabs() {
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

        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.label,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarPressColor: 'transparent',
        tabBarPressOpacity: 1,

        sceneContainerStyle: {
          backgroundColor: COLORS.white,
        },
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Production" component={ProductionScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 76,
    paddingTop: 8,
    paddingBottom: 8,
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
