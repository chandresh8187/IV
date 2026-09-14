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
          color={focused ? COLORS.white : color}
          strokeWidth={focused ? 2.3 : 1.8}
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
export function createTabScreenOptions(iconByRoute, useNavigationRail = false) {
  return ({ route }) => ({
    headerShadowVisible: false,
    headerStyle: {
      backgroundColor: COLORS.white,
    },
    headerTitleStyle: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    sceneStyle: {
      backgroundColor: COLORS.bg,
    },
    tabBarHideOnKeyboard: true,
    tabBarPosition: useNavigationRail ? 'left' : 'bottom',
    tabBarLabelPosition: useNavigationRail ? 'beside-icon' : 'below-icon',
    tabBarStyle: useNavigationRail ? styles.rail : styles.tabBar,
    tabBarItemStyle: useNavigationRail ? styles.railItem : styles.tabBarItem,
    tabBarLabelStyle: useNavigationRail ? styles.railLabel : styles.label,
    tabBarActiveTintColor: COLORS.accent,
    tabBarInactiveTintColor: COLORS.gray,
    headerShown: false,
    tabBarIcon: ({ focused, color }) => (
      <TabIcon icon={iconByRoute[route.name]} focused={focused} color={color} />
    ),
  });
}

const styles = StyleSheet.create({
  rail: {
    width: 180,
    paddingHorizontal: 10,
    paddingTop: 24,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  railItem: { minHeight: 64, marginBottom: 8, borderRadius: 12 },
  railLabel: { fontSize: 13, fontWeight: '600' },
  tabBar: {
    height: 76,
    paddingTop: 7,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },

  tabBarItem: {
    paddingVertical: 4,
  },

  label: {
    fontSize: 11,
    fontWeight: '700',
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
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
  },

  iconPill: {
    height: 34,
    minWidth: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconPillActive: {
    backgroundColor: COLORS.accent,
  },
});
