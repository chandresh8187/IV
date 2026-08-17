import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  BellRing,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  UserCircle2,
} from 'lucide-react-native';
import messaging from '@react-native-firebase/messaging';
import {
  getNotificationStatusApi,
  removeFcmTokenApi,
  scheduleBackgroundNotificationTestApi,
} from '../../api/notificationApi';
import { logoutApi } from '../../api/authApi';
import { getMyProfileApi } from '../../api/profileApi';
import { clearAuth, setAuth } from '../../redux/slices/authSlice';
import { syncNotificationRegistration } from '../../services/notificationRegistrationService';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user: storedUser, token } = useSelector(state => state.auth);
  const { contentMaxWidth } = useResponsive();
  const [profile, setProfile] = useState(storedUser);
  const [loading, setLoading] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [schedulingBackgroundTest, setSchedulingBackgroundTest] =
    useState(false);

  const loadNotificationStatus = useCallback(async () => {
    await syncNotificationRegistration().catch(() => {});
    const response = await getNotificationStatusApi();
    setNotificationStatus(response?.data || null);
  }, []);

  const applyUser = useCallback(
    async next => {
      setProfile(next);
      await AsyncStorage.setItem('user', JSON.stringify(next));
      dispatch(setAuth({ token, user: next }));
    },
    [dispatch, token],
  );

  useEffect(() => {
    getMyProfileApi()
      .then(response =>
        applyUser(
          response?.data?.user || response?.data || response?.user || response,
        ),
      )
      .catch(error =>
        Alert.alert(
          'Error',
          error?.response?.data?.message || 'Unable to load profile',
        ),
      )
      .finally(() => setLoading(false));
  }, [applyUser]);

  useFocusEffect(
    useCallback(() => {
      loadNotificationStatus().catch(() => {});
    }, [loadNotificationStatus]),
  );

  useEffect(() => {
    if (storedUser) setProfile(storedUser);
  }, [storedUser]);

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFcmTokenApi({
              fcm_token: await messaging().getToken(),
            });
          } catch {}
          await logoutApi();
          dispatch(clearAuth());
        },
      },
    ]);

  const testBackgroundNotification = async () => {
    setSchedulingBackgroundTest(true);
    try {
      const response = await scheduleBackgroundNotificationTestApi();
      Alert.alert(
        'Close the app now',
        response?.message ||
          'The notification will be sent in 8 seconds. Close or minimize the app now.',
      );
    } catch (error) {
      Alert.alert(
        'Background test failed',
        error?.response?.data?.message || 'Could not schedule the FCM test.',
      );
    } finally {
      setSchedulingBackgroundTest(false);
    }
  };

  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <UserCircle2 size={64} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{profile?.name || 'User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {profile?.role?.toUpperCase() || '-'}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Mail size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>{profile?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <ShieldCheck size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>{profile?.role}</Text>
        </View>
      </View>
      <View style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            <BellRing size={22} color={COLORS.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.notificationTitle}>Notification devices</Text>
            <Text style={styles.notificationText}>
              {notificationStatus?.device_count || 0} device
              {Number(notificationStatus?.device_count) === 1 ? '' : 's'}{' '}
              registered for this account
            </Text>
          </View>
        </View>

        {(notificationStatus?.devices || []).map(device => (
          <View key={device.id} style={styles.deviceRow}>
            <Smartphone size={17} color={COLORS.secondary} />
            <Text style={styles.deviceText}>
              {String(device.device_type || 'device').toUpperCase()} · token ending{' '}
              {device.token_suffix}
            </Text>
          </View>
        ))}

        {String(profile?.role || '').toLowerCase().trim() !== 'supervisor' ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Test background notification"
            style={styles.backgroundTestBtn}
            disabled={schedulingBackgroundTest}
            onPress={testBackgroundNotification}
          >
            {schedulingBackgroundTest ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.backgroundTestText}>
                TEST BACKGROUND PUSH
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={21} color={COLORS.white} />
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    padding: UI.pagePadding,
    paddingBottom: 36,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusLarge,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...UI.shadow,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: { color: COLORS.primary, fontSize: 23, fontWeight: '800' },
  roleBadge: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 9,
  },
  roleText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 14,
    marginTop: 16,
  },
  infoRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  flex: { flex: 1 },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radius,
    padding: 15,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  notificationTitle: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  notificationText: { color: COLORS.gray, fontSize: 12, marginTop: 3 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  deviceText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  backgroundTestBtn: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  backgroundTestText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  logoutBtn: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  logoutText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
