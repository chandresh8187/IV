import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, Mail, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import messaging from '@react-native-firebase/messaging';
import { removeFcmTokenApi } from '../../api/notificationApi';
import { logoutApi } from '../../api/authApi';
import { changeMyPasswordApi, getMyProfileApi, updateMyProfileApi } from '../../api/profileApi';
import { clearAuth, setAuth } from '../../redux/slices/authSlice';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const Input = props => (
  <TextInput {...props} mode="outlined" style={styles.input} outlineColor={COLORS.inputBorder} activeOutlineColor={COLORS.accent} textColor={COLORS.text} theme={PAPER_THEME} />
);

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user: storedUser, token } = useSelector(state => state.auth);
  const { contentMaxWidth } = useResponsive();
  const [profile, setProfile] = useState(storedUser);
  const [form, setForm] = useState({ name: storedUser?.name || '', email: storedUser?.email || '', current_password: '' });
  const [password, setPassword] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyUser = useCallback(async next => {
    setProfile(next);
    setForm({ name: next?.name || '', email: next?.email || '', current_password: '' });
    await AsyncStorage.setItem('user', JSON.stringify(next));
    dispatch(setAuth({ token, user: next }));
  }, [dispatch, token]);

  useEffect(() => {
    getMyProfileApi()
      .then(response => applyUser(response?.data?.user || response?.data || response?.user || response))
      .catch(error => Alert.alert('Error', error?.response?.data?.message || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, [applyUser]);

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim()) return Alert.alert('Required', 'Name and email are required.');
    const emailChanged = form.email.trim().toLowerCase() !== String(profile?.email || '').toLowerCase();
    if (emailChanged && !form.current_password) return Alert.alert('Required', 'Enter current password to change email.');
    setSaving(true);
    try {
      const response = await updateMyProfileApi({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
      await applyUser(response?.data?.user || response?.data || response?.user || response);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update profile');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (password.new_password.length < 8) return Alert.alert('Invalid', 'New password must be at least 8 characters.');
    if (password.new_password !== password.confirm_password) return Alert.alert('Invalid', 'New passwords do not match.');
    setSaving(true);
    try {
      await changeMyPasswordApi(password);
      setPassword({ current_password: '', new_password: '', confirm_password: '' });
      Alert.alert('Saved', 'Password changed successfully.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not change password');
    } finally { setSaving(false); }
  };

  const handleLogout = () => Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => {
      try { await removeFcmTokenApi({ fcm_token: await messaging().getToken() }); } catch {}
      await logoutApi(); dispatch(clearAuth());
    } },
  ]);

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  return (
    <ScrollView contentContainerStyle={[styles.container, centeredContent(contentMaxWidth)]} keyboardShouldPersistTaps="handled">
      <View style={styles.profileCard}>
        <View style={styles.avatar}><UserCircle2 size={64} color={COLORS.primary} /></View>
        <Text style={styles.name}>{profile?.name || 'User'}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{profile?.role?.toUpperCase() || '-'}</Text></View>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Profile details</Text>
        <Input label="Name" value={form.name} onChangeText={value => setForm(prev => ({ ...prev, name: value }))} />
        <Input label="Email" value={form.email} autoCapitalize="none" keyboardType="email-address" onChangeText={value => setForm(prev => ({ ...prev, email: value }))} />
        <Input label="Current Password (required for email change)" value={form.current_password} secureTextEntry onChangeText={value => setForm(prev => ({ ...prev, current_password: value }))} />
        <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={saveProfile}><Text style={styles.saveText}>SAVE PROFILE</Text></TouchableOpacity>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <Input label="Current Password" value={password.current_password} secureTextEntry onChangeText={value => setPassword(prev => ({ ...prev, current_password: value }))} />
        <Input label="New Password" value={password.new_password} secureTextEntry onChangeText={value => setPassword(prev => ({ ...prev, new_password: value }))} />
        <Input label="Confirm New Password" value={password.confirm_password} secureTextEntry onChangeText={value => setPassword(prev => ({ ...prev, confirm_password: value }))} />
        <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={savePassword}><Text style={styles.saveText}>CHANGE PASSWORD</Text></TouchableOpacity>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}><Mail size={20} color={COLORS.primary} /><Text style={styles.infoText}>{profile?.email}</Text></View>
        <View style={styles.infoRow}><ShieldCheck size={20} color={COLORS.primary} /><Text style={styles.infoText}>{profile?.role}</Text></View>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><LogOut size={21} color={COLORS.white} /><Text style={styles.logoutText}>LOGOUT</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.bg, padding: UI.pagePadding, paddingBottom: 36 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  profileCard: { backgroundColor: COLORS.white, borderRadius: UI.radiusLarge, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...UI.shadow },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { color: COLORS.primary, fontSize: 23, fontWeight: '800' },
  roleBadge: { backgroundColor: COLORS.tealSoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginTop: 9 },
  roleText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  formCard: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 16, ...UI.shadow },
  sectionTitle: { color: COLORS.primary, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },
  saveBtn: { minHeight: 50, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  infoCard: { backgroundColor: COLORS.white, borderRadius: UI.radius, padding: 14, marginTop: 16 },
  infoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  logoutBtn: { marginTop: 16, minHeight: 52, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  logoutText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
