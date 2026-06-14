import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  LayoutDashboard,
  Factory,
  History,
  Users,
  UserCircle2,
  CalendarClock,
} from 'lucide-react-native';

import DashboardScreen from '../screens/superadmin/DashboardScreen';
import ProductionScreen from '../screens/superadmin/ProductionScreen';
import UsersScreen from './../screens/superadmin/UsersScreen';
import HistoryScreen from './../screens/superadmin/HistoryScreen';
import ProfileScreen from './../screens/superadmin/ProfileScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';
import ViewReport from './../screens/common/ViewReport';
import ViewHistory from './../screens/common/ViewHistory';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  lightBlue: '#EEF7FD',
  border: '#E5E7EB',
};

function HistoryStack() {
  return (
    <Stack.Navigator initialRouteName="History">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
        name="History"
        component={HistoryScreen}
      />
      <Stack.Screen
        options={{
          title: 'Production',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontSize: 18,
            color: COLORS.primary,
            fontWeight: 'bold',
          },
          headerTintColor: COLORS.primary,
        }}
        name="ViewHistory"
        component={ViewHistory}
      />
      <Stack.Screen
        options={{
          title: 'Production Report',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontSize: 18,
            color: COLORS.primary,
            fontWeight: 'bold',
          },
          headerTintColor: COLORS.primary,
        }}
        name="ViewReport"
        component={ViewReport}
      />
    </Stack.Navigator>
  );
}

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
      <Tab.Screen name="Shift" component={ShiftScreen} />
      <Tab.Screen name="Production" component={ProductionScreen} />
      <Tab.Screen
        options={{
          tabBarLabel: 'History',
        }}
        name="HistoryTab"
        component={HistoryStack}
      />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 100,
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
