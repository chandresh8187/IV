import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BellRing, Radio, Smartphone, Users } from 'lucide-react-native';
import { TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';

import { sendTestNotificationApi } from '../../api/notificationApi';
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

const DEFAULT_TITLE = 'IV Production Notification Test';
const DEFAULT_BODY = 'Backend notification delivery is working for this device.';

export default function NotificationTestScreen() {
  const { contentMaxWidth } = useResponsive();
  const user = useSelector(state => state.auth.user);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const isSuperadmin =
    String(user?.role || '').toLowerCase().trim() === 'superadmin';

  const sendTest = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Required', 'Enter a notification title and message.');
      return;
    }

    setSending(true);
    setDelivery(null);
    try {
      const response = await sendTestNotificationApi({
        title: title.trim(),
        body: body.trim(),
      });
      setDelivery({ ...response?.data, message: response?.message });
    } catch (error) {
      Alert.alert(
        'Notification test failed',
        error?.response?.data?.message ||
          'The backend could not run the notification test.',
      );
    } finally {
      setSending(false);
    }
  };

  if (!isSuperadmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.deniedTitle}>Superadmin access required</Text>
        <Text style={styles.deniedText}>
          Notification delivery tests are restricted to superadmins.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        centeredContent(contentMaxWidth),
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <BellRing size={25} color={COLORS.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>Backend Notification Test</Text>
          <Text style={styles.subtitle}>
            Sends to active superadmins, admins and plant managers. Supervisors
            are excluded.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test message</Text>
        <TextInput
          label="Notification title"
          mode="outlined"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          style={styles.input}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.accent}
          theme={PAPER_THEME}
        />
        <TextInput
          label="Notification message"
          mode="outlined"
          value={body}
          onChangeText={setBody}
          maxLength={500}
          multiline
          numberOfLines={4}
          style={styles.input}
          outlineColor={COLORS.inputBorder}
          activeOutlineColor={COLORS.accent}
          theme={PAPER_THEME}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Trigger backend notification test"
          activeOpacity={0.8}
          disabled={sending}
          onPress={sendTest}
          style={[styles.sendButton, sending && styles.buttonDisabled]}
        >
          {sending ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Radio size={19} color={COLORS.white} />
              <Text style={styles.sendButtonText}>TRIGGER BACKEND TEST</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {delivery && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery result</Text>
          <Text style={styles.resultMessage}>{delivery.message}</Text>
          <View style={styles.metricGrid}>
            <Metric
              icon={Users}
              label="Eligible users"
              value={delivery.eligibleUserCount}
            />
            <Metric
              icon={Smartphone}
              label="Registered users"
              value={delivery.registeredUserCount}
            />
            <Metric
              icon={Radio}
              label="Connected apps"
              value={delivery.socketConnectionCount}
            />
            <Metric
              icon={BellRing}
              label="Push delivered"
              value={delivery.successCount}
            />
          </View>
          <Text style={styles.detailText}>
            Device tokens: {delivery.tokenCount || 0} · Push failures:{' '}
            {delivery.failureCount || 0}
          </Text>
          {delivery.pushErrorCode ? (
            <Text style={styles.errorText}>
              Firebase error: {delivery.pushErrorCode}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>How to read the result</Text>
        <Text style={styles.helpText}>
          Registered users confirms that the backend has saved FCM tokens.
          Connected apps confirms live socket delivery. Push delivered confirms
          Firebase accepted the background notification.
        </Text>
      </View>
    </ScrollView>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <View style={styles.metric}>
      <Icon size={18} color={COLORS.primary} />
      <Text style={styles.metricValue}>{Number(value) || 0}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: UI.pagePadding, paddingBottom: 36 },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  deniedTitle: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  deniedText: { color: COLORS.gray, marginTop: 8, textAlign: 'center' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 18,
    marginBottom: 14,
    borderRadius: UI.radius,
    backgroundColor: COLORS.primary,
    ...UI.shadow,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  title: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
  subtitle: {
    color: '#D8ECFA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...UI.shadow,
  },
  cardTitle: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
  input: { marginTop: 13, backgroundColor: COLORS.white },
  sendButton: {
    minHeight: 52,
    marginTop: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: { opacity: 0.7 },
  sendButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  resultMessage: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metric: {
    width: '48.5%',
    minHeight: 105,
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightBlue,
  },
  metricValue: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 5,
  },
  metricLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },
  detailText: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  helpCard: {
    padding: 15,
    borderRadius: UI.radius,
    borderWidth: 1,
    borderColor: '#D8ECFA',
    backgroundColor: COLORS.lightBlue,
  },
  helpTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  helpText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
});
