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
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Mail, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import messaging from '@react-native-firebase/messaging';
import { removeFcmTokenApi } from '../../api/notificationApi';
import { logoutApi } from '../../api/authApi';
import { changeMyPasswordApi, getMyProfileApi, updateMyProfileApi } from '../../api/profileApi';
import { clearAuth, setAuth } from '../../redux/slices/authSlice';
import { getNotificationInstallationId } from '../../services/notificationRegistrationService';
import { COLORS, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user: storedUser, token } = useSelector(state => state.auth);
  const { contentMaxWidth } = useResponsive();
  const [profile, setProfile] = useState(storedUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: storedUser?.name || '', email: storedUser?.email || '', current_password: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const applyUser = useCallback(
    async next => {
      setProfile(next);
      setProfileForm({ name: next?.name || '', email: next?.email || '', current_password: '' });
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

  useEffect(() => {
    if (storedUser) setProfile(storedUser);
  }, [storedUser]);

  const saveProfile = async () => {
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Check details', 'Enter your name and a valid email address.');
      return;
    }
    if (email.toLowerCase() !== String(profile?.email || '').toLowerCase() && !profileForm.current_password) {
      Alert.alert('Current password required', 'Enter your current password to change your email address.');
      return;
    }
    setSaving(true);
    try {
      const response = await updateMyProfileApi({ name, email, current_password: profileForm.current_password });
      await applyUser(response?.data?.user || response?.data || response?.user);
      Alert.alert('Saved', response?.message || 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Could not save profile', error?.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      Alert.alert('Required', 'Enter your current password, new password and confirmation.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      Alert.alert('Passwords do not match', 'Confirm the new password exactly.');
      return;
    }
    if (passwordForm.new_password.length > 72) {
      Alert.alert('Password too long', 'Use 72 characters or fewer.');
      return;
    }
    setChangingPassword(true);
    try {
      const response = await changeMyPasswordApi(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      Alert.alert('Saved', response?.message || 'Password changed successfully.');
    } catch (error) {
      Alert.alert('Could not change password', error?.response?.data?.message || 'Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const installationId = await getNotificationInstallationId();
            await removeFcmTokenApi({
              fcm_token: await messaging().getToken(),
              installation_id: installationId,
            });
          } catch {}
          await logoutApi();
          dispatch(clearAuth());
        },
      },
    ]);

  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>Your account</Text>
      <Text style={styles.pageTitle}>My profile</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <UserCircle2 size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{profile?.name || 'User'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {profile?.role?.replace(/_/g, ' ')?.toUpperCase() || '-'}
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
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Edit profile</Text>
        <TextInput label="Name" mode="outlined" value={profileForm.name} onChangeText={name => setProfileForm(current => ({ ...current, name }))} maxLength={100} style={styles.input} />
        <TextInput label="Email address" mode="outlined" value={profileForm.email} onChangeText={email => setProfileForm(current => ({ ...current, email }))} keyboardType="email-address" autoCapitalize="none" maxLength={190} style={styles.input} />
        {profileForm.email.trim().toLowerCase() !== String(profile?.email || '').toLowerCase() && <TextInput label="Current password to change email" mode="outlined" value={profileForm.current_password} onChangeText={current_password => setProfileForm(current => ({ ...current, current_password }))} secureTextEntry style={styles.input} />}
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={saving}><Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text></TouchableOpacity>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Change password</Text>
        <TextInput label="Current password" mode="outlined" value={passwordForm.current_password} onChangeText={current_password => setPasswordForm(current => ({ ...current, current_password }))} secureTextEntry style={styles.input} />
        <TextInput label="New password" mode="outlined" value={passwordForm.new_password} onChangeText={new_password => setPasswordForm(current => ({ ...current, new_password }))} secureTextEntry style={styles.input} />
        <TextInput label="Confirm new password" mode="outlined" value={passwordForm.confirm_password} onChangeText={confirm_password => setPasswordForm(current => ({ ...current, confirm_password }))} secureTextEntry style={styles.input} />
        <TouchableOpacity style={styles.saveButton} onPress={savePassword} disabled={changingPassword}><Text style={styles.saveText}>{changingPassword ? 'Saving…' : 'Change password'}</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={21} color={COLORS.danger} />
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  eyebrow: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 8,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 24,
  },
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
    alignItems: 'flex-start',
    borderWidth: 0,
    borderColor: COLORS.border,
    ...UI.shadow,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: { color: COLORS.text, fontSize: 23, fontWeight: '700' },
  roleBadge: {
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 3,
    marginTop: 9,
  },
  roleText: { color: COLORS.teal, fontSize: 12, fontWeight: '600' },
  infoCard: {
    borderWidth: 0,
    borderColor: COLORS.border,
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
  infoText: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  formCard: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16, marginTop: 16, gap: 12, ...UI.shadow },
  formTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  input: { backgroundColor: COLORS.white },
  saveButton: { minHeight: 48, borderRadius: UI.radiusSmall, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: COLORS.white, fontWeight: '700' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: COLORS.dangerSoft,
    marginTop: 16,
    minHeight: 52,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  logoutText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
});
