import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ClipboardList,
  ChevronRight,
  Factory,
  FileCheck2,
  History,
  BellRing,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react-native';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { COLORS, UI } from '../../assets/Colors';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';
import { shouldShowShiftInProductionMenu } from '../../utils/accessNavigation';

const PRODUCTION_MENUS = [
  {
    title: 'Live Production',
    desc: 'Add and view current shift production',
    icon: Factory,
    screen: 'LiveProduction',
    permission: 'production.view',
  },
  {
    title: 'Shift Status',
    desc: 'Start and end day/night shift',
    icon: Settings2,
    screen: 'ShiftControl',
    permission: 'shifts.view',
  },
  {
    title: 'Production History',
    desc: 'Date and shift wise production reports',
    icon: History,
    screen: 'ProductionHistory',
    permission: 'history.view',
  },
  {
    title: 'Production Planning',
    desc: 'Manage challan wise production planning',
    icon: ClipboardList,
    screen: 'ProductionPlanning',
    permission: 'planning.view',
  },
  {
    title: 'Coating Test Certificate',
    desc: 'Generate galvanizing coating test certificate',
    icon: FileCheck2,
    screen: 'GenerateCertificate',
    permission: 'certificates.view',
  },
];

const CONTROL_PANEL_MENU = {
  title: 'Control Panel',
  desc: 'Monthly alerts, shift settings and audit log',
  icon: SlidersHorizontal,
  screen: 'ControlPanel',
  permissions: ['settings.manage', 'app_updates.manage'],
};

const NOTIFICATION_TEST_MENU = {
  title: 'Test Notifications',
  desc: 'Trigger and diagnose backend notification delivery',
  icon: BellRing,
  screen: 'NotificationTest',
  superadminOnly: true,
};

export default function ProductionMenuScreen({ navigation }) {
  const { isTablet, wideMaxWidth } = useResponsive();
  const loggedUser = useSelector(state => state.auth.user);
  const menus = [
    ...PRODUCTION_MENUS,
    CONTROL_PANEL_MENU,
    NOTIFICATION_TEST_MENU,
  ].filter(item => {
    if (item.superadminOnly) {
      return (
        String(loggedUser?.role || '').toLowerCase().trim() === 'superadmin'
      );
    }
    if (item.screen === 'ShiftControl') {
      return shouldShowShiftInProductionMenu(loggedUser);
    }
    return (item.permissions || [item.permission]).some(permission =>
      hasPermission(loggedUser, permission),
    );
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, centeredContent(wideMaxWidth)]}
    >
      <Text style={styles.eyebrow}>WORKSPACE</Text>
      <Text style={styles.title}>Production</Text>
      <Text style={styles.subtitle}>
        Choose a module to manage today’s operations
      </Text>

      <View style={isTablet && styles.menuGridTablet}>
        {menus.map((item, index) => {
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.screen}
              style={[styles.card, isTablet && styles.cardTablet]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.iconBox}>
                <Icon size={24} color={COLORS.primary} />
              </View>

              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardNumber}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <ChevronRight size={20} color={COLORS.accent} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: UI.pagePadding,
    paddingTop: 22,
    paddingBottom: 30,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  title: {
    color: COLORS.primary,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 20,
  },
  menuGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 17,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...UI.shadow,
  },
  cardTablet: {
    width: '48.5%',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  cardDesc: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  cardMeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  cardNumber: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
