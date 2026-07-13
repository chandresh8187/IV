import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../assets/Colors';

function TabIcon({ icon: Icon, focused, color }) {
  if (!Icon) {
    return null;
  }

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

/**
 * Shared bottom-tab screenOptions used by all role navigators, so the tab
 * bar looks and behaves identically for superadmin/admin/supervisor.
 * `sceneStyle` (the bottom-tabs v7 prop) keeps the scene background the app
 * background color so screens never flash a dark backdrop.
 */
export function createTabScreenOptions(iconByRoute) {
  return ({ route }) => ({
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: COLORS.primary,
    },
    headerTitleStyle: {
      color: COLORS.white,
      fontWeight: '900',
    },
    sceneStyle: {
      backgroundColor: COLORS.bg,
    },
    tabBarHideOnKeyboard: true,
    tabBarStyle: styles.tabBar,
    tabBarItemStyle: styles.tabBarItem,
    tabBarLabelStyle: styles.label,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.gray,
    headerShown: false,
    tabBarIcon: ({ focused, color }) => (
      <TabIcon icon={iconByRoute[route.name]} focused={focused} color={color} />
    ),
  });
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
