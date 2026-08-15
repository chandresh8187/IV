import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { pick } from '@react-native-documents/picker';
import {
  getAndroidReleaseApi,
  getAuditLogsApi,
  getControlPanelSettingsApi,
  updateAndroidReleaseApi,
  updateControlPanelSettingApi,
  uploadAndroidApkApi,
} from '../../api/controlPanelApi';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { socket } from '../../socket/socket';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { useSelector } from 'react-redux';
import { hasPermission } from '../../utils/permissions';

const defaults = {
  zinc_alert_threshold: { enabled: true, percentage: '7.50' },
  shift_schedule: { automatic: true, day_start: '08:00', night_start: '20:00' },
  maintenance_mode: { enabled: false, message: '' },
};

const emptyRelease = {
  enabled: false,
  latestVersionCode: '',
  latestVersionName: '',
  minimumVersionCode: '0',
  mandatory: false,
  apkUrl: '',
  sha256: '',
  releaseNotes: '',
};

const Input = props => <TextInput {...props} mode="outlined" style={styles.input} outlineColor={COLORS.inputBorder} activeOutlineColor={COLORS.accent} textColor={COLORS.text} theme={PAPER_THEME} />;

export default function ControlPanelScreen() {
  const { contentMaxWidth } = useResponsive();
  const user = useSelector(state => state.auth.user);
  const canManageSettings = hasPermission(user, 'settings.manage');
  const canManageAppUpdates = hasPermission(user, 'app_updates.manage');
  const [settings, setSettings] = useState(defaults);
  const [logs, setLogs] = useState([]);
  const [release, setRelease] = useState(emptyRelease);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    try {
      const [settingResponse, auditResponse, releaseResponse] = await Promise.all([
        canManageSettings ? getControlPanelSettingsApi() : null,
        canManageSettings ? getAuditLogsApi(50) : null,
        canManageAppUpdates ? getAndroidReleaseApi() : null,
      ]);
      if (canManageSettings) {
        const server = settingResponse?.data || {};
        setSettings({
          zinc_alert_threshold: { ...defaults.zinc_alert_threshold, ...server.zinc_alert_threshold, percentage: String(server.zinc_alert_threshold?.percentage ?? '7.50') },
          shift_schedule: { ...defaults.shift_schedule, ...server.shift_schedule },
          maintenance_mode: { ...defaults.maintenance_mode, ...server.maintenance_mode },
        });
        setLogs(Array.isArray(auditResponse?.data) ? auditResponse.data : []);
      }
      if (canManageAppUpdates) {
        setRelease({
          ...emptyRelease,
          ...(releaseResponse || {}),
          latestVersionCode: String(releaseResponse?.latestVersionCode || ''),
          minimumVersionCode: String(releaseResponse?.minimumVersionCode || '0'),
        });
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Unable to load control panel');
    } finally { setLoading(false); setRefreshing(false); }
  }, [canManageAppUpdates, canManageSettings]);

  useEffect(() => {
    load();
    const refresh = () => load();
    socket.on('app_setting_changed', refresh);
    return () => socket.off('app_setting_changed', refresh);
  }, [load]);

  const update = (group, key, value) => setSettings(current => ({ ...current, [group]: { ...current[group], [key]: value } }));
  const updateRelease = (key, value) => setRelease(current => ({ ...current, [key]: value }));
  const save = async key => {
    setSaving(key);
    try {
      await updateControlPanelSettingApi({ key, body: settings[key] });
      Alert.alert('Saved', 'Setting updated successfully.');
      await load();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not save setting');
    } finally { setSaving(''); }
  };

  const saveRelease = async () => {
    const latestVersionCode = Number(release.latestVersionCode);
    const minimumVersionCode = Number(release.minimumVersionCode);
    if (!Number.isInteger(latestVersionCode) || latestVersionCode < 1 || !release.latestVersionName.trim()) {
      Alert.alert('Invalid release', 'Enter a version name and a version code of 1 or higher.');
      return;
    }
    if (!Number.isInteger(minimumVersionCode) || minimumVersionCode < 0 || minimumVersionCode > latestVersionCode) {
      Alert.alert('Invalid release', 'Minimum version code must be between 0 and the latest version code.');
      return;
    }
    setSaving('android-release');
    try {
      await updateAndroidReleaseApi({
        ...release,
        latestVersionCode,
        minimumVersionCode,
        latestVersionName: release.latestVersionName.trim(),
        apkUrl: release.apkUrl.trim(),
        sha256: release.sha256.trim().toLowerCase(),
        releaseNotes: release.releaseNotes.trim(),
      });
      Alert.alert('Saved', 'Android release configuration updated.');
      await load();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not save Android release');
    } finally {
      setSaving('');
    }
  };

  const pickAndUploadApk = async () => {
    try {
      const [file] = await pick({
        type: ['application/vnd.android.package-archive', 'application/octet-stream'],
      });
      if (!file?.name?.toLowerCase().endsWith('.apk')) {
        Alert.alert('Invalid file', 'Please select an Android .apk release file.');
        return;
      }
      setSaving('apk-upload');
      setUploadProgress(0);
      const response = await uploadAndroidApkApi(file, event => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });
      const uploaded = response?.data || {};
      setRelease(current => ({
        ...current,
        apkUrl: uploaded.apkUrl || current.apkUrl,
        sha256: uploaded.sha256 || current.sha256,
      }));
      Alert.alert('Uploaded', 'APK uploaded. Review the values and save the release.');
    } catch (error) {
      if (error?.code !== 'OPERATION_CANCELED') {
        Alert.alert('Error', error?.response?.data?.message || 'Could not upload APK');
      }
    } finally {
      setSaving('');
    }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  return (
    <ScrollView
      contentContainerStyle={[styles.container, centeredContent(contentMaxWidth)]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.headerCard}><Text style={styles.title}>Control Panel</Text><Text style={styles.subtitle}>Authorized app settings and release controls</Text></View>
      {canManageAppUpdates && <SettingCard title="Native Android Update" subtitle="Upload an APK and publish the same native update used by the web control panel.">
        <SwitchRow label="Enable native update" value={release.enabled} onChange={value => updateRelease('enabled', value)} />
        <SwitchRow label="Mandatory update" value={release.mandatory} onChange={value => updateRelease('mandatory', value)} />
        <Input label="Version Name" value={release.latestVersionName} onChangeText={value => updateRelease('latestVersionName', value)} />
        <Input label="Latest Version Code" keyboardType="number-pad" value={release.latestVersionCode} onChangeText={value => updateRelease('latestVersionCode', value)} />
        <Input label="Minimum Version Code" keyboardType="number-pad" value={release.minimumVersionCode} onChangeText={value => updateRelease('minimumVersionCode', value)} />
        <TouchableOpacity style={styles.uploadBtn} disabled={saving === 'apk-upload'} onPress={pickAndUploadApk}>
          {saving === 'apk-upload' ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.uploadText}>SELECT AND UPLOAD APK</Text>}
        </TouchableOpacity>
        {saving === 'apk-upload' ? <Text style={styles.uploadProgress}>Uploading {uploadProgress}%</Text> : null}
        <Input label="APK URL" value={release.apkUrl} onChangeText={value => updateRelease('apkUrl', value)} autoCapitalize="none" />
        <Input label="SHA-256" value={release.sha256} onChangeText={value => updateRelease('sha256', value)} autoCapitalize="none" />
        <Input label="Release Notes" multiline numberOfLines={4} value={release.releaseNotes} onChangeText={value => updateRelease('releaseNotes', value)} />
        <SaveButton loading={saving === 'android-release'} onPress={saveRelease} />
      </SettingCard>}
      {canManageSettings && <>
      <SettingCard title="Monthly Zinc Consumption Alert" subtitle="Planning targets are managed separately per challan.">
        <SwitchRow label="Enable monthly alert" value={settings.zinc_alert_threshold.enabled} onChange={value => update('zinc_alert_threshold', 'enabled', value)} />
        <Input label="Alert Percentage" keyboardType="decimal-pad" value={settings.zinc_alert_threshold.percentage} onChangeText={value => update('zinc_alert_threshold', 'percentage', value)} />
        <SaveButton loading={saving === 'zinc_alert_threshold'} onPress={() => save('zinc_alert_threshold')} />
      </SettingCard>
      <SettingCard title="Shift Schedule" subtitle="Automatic day and night shift timing.">
        <SwitchRow label="Automatic shifts" value={settings.shift_schedule.automatic} onChange={value => update('shift_schedule', 'automatic', value)} />
        <Input label="Day Start (HH:mm)" value={settings.shift_schedule.day_start} onChangeText={value => update('shift_schedule', 'day_start', value)} />
        <Input label="Night Start (HH:mm)" value={settings.shift_schedule.night_start} onChangeText={value => update('shift_schedule', 'night_start', value)} />
        <SaveButton loading={saving === 'shift_schedule'} onPress={() => save('shift_schedule')} />
      </SettingCard>
      <SettingCard title="Maintenance Mode" subtitle="Temporarily block normal app usage with a message.">
        <SwitchRow label="Enable maintenance mode" value={settings.maintenance_mode.enabled} onChange={value => update('maintenance_mode', 'enabled', value)} />
        <Input label="User Message" multiline numberOfLines={3} value={settings.maintenance_mode.message} onChangeText={value => update('maintenance_mode', 'message', value)} />
        <SaveButton loading={saving === 'maintenance_mode'} onPress={() => save('maintenance_mode')} />
      </SettingCard>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Audit Log</Text>
        {logs.length ? logs.map(log => (
          <View key={log.id} style={styles.logRow}>
            <Text style={styles.logAction}>{log.actor_name || 'System'} • {log.action}</Text>
            <Text style={styles.logMeta}>{log.entity_type} {log.entity_id || ''}</Text>
            <Text style={styles.logMeta}>{new Date(log.created_at).toLocaleString('en-IN')}</Text>
          </View>
        )) : <Text style={styles.empty}>No audit activity found.</Text>}
      </View>
      </>}
    </ScrollView>
  );
}

const SettingCard = ({ title, subtitle, children }) => <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardSubtitle}>{subtitle}</Text>{children}</View>;
const SwitchRow = ({ label, value, onChange }) => <View style={styles.switchRow}><Text style={styles.switchLabel}>{label}</Text><Switch value={!!value} onValueChange={onChange} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor={COLORS.white} /></View>;
const SaveButton = ({ loading, onPress }) => <TouchableOpacity style={styles.saveBtn} disabled={loading} onPress={onPress}>{loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>SAVE SETTING</Text>}</TouchableOpacity>;

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, backgroundColor: COLORS.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  headerCard: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, marginBottom: 14 },
  title: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#D8ECFA', fontSize: 13, fontWeight: '700', marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14 },
  cardTitle: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
  cardSubtitle: { color: COLORS.gray, fontSize: 12, lineHeight: 18, marginTop: 3, marginBottom: 12 },
  switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  switchLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  input: { backgroundColor: COLORS.white, marginBottom: 12 },
  saveBtn: { minHeight: 50, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  uploadBtn: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  uploadText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  uploadProgress: { color: COLORS.gray, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  logRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logAction: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  logMeta: { color: COLORS.gray, fontSize: 11, fontWeight: '600', marginTop: 3 },
  empty: { color: COLORS.gray, fontWeight: '700', marginTop: 12 },
});
