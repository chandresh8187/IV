import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Mail, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import messaging from '@react-native-firebase/messaging';

import { removeFcmTokenApi } from '../../api/notificationApi';
import { logoutApi } from '../../api/authApi';
import { clearAuth } from '../../redux/slices/authSlice';
import { COLORS } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { contentMaxWidth } = useResponsive();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const token = await messaging().getToken();
          await removeFcmTokenApi({
            fcm_token: token,
          });
          await logoutApi();
          dispatch(clearAuth());
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, centeredContent(contentMaxWidth)]}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <UserCircle2 size={64} color={COLORS.primary} />
        </View>

        <Text style={styles.name}>{user?.name || 'User'}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {user?.role?.toUpperCase() || '-'}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <InfoRow
          icon={<Mail size={22} color={COLORS.primary} />}
          label="Email"
          value={user?.email || '-'}
        />

        <InfoRow
          icon={<ShieldCheck size={22} color={COLORS.primary} />}
          label="Role"
          value={user?.role || '-'}
        />
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        activeOpacity={0.85}
        onPress={handleLogout}
      >
        <LogOut size={22} color={COLORS.white} />
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
  },

  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  name: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
  },

  roleBadge: {
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 10,
  },

  roleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    elevation: 3,
    marginTop: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoLabel: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '700',
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },

  logoutBtn: {
    marginTop: 'auto',
    borderRadius: 18,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 15,
  },

  logoutText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
