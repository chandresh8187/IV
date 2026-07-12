import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Clock, Factory, UserCircle2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../assets/Colors';
import ProductionScreen from '../screens/superadmin/ProductionScreen';
import ProfileScreen from '../screens/superadmin/ProfileScreen';
import ShiftScreen from '../screens/supervisor/ShiftScreen';

const Tab = createBottomTabNavigator();

const IconByRoute = {
  Shift: Clock,
  Production: Factory,
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

export default function SupervisorTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Production"
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
      <Tab.Screen name="Production" component={ProductionScreen} />
      <Tab.Screen name="Shift" component={ShiftScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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
