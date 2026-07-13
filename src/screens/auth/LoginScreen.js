import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';

import { loginApi } from '../../api/authApi';
import { setAuth } from '../../redux/slices/authSlice';
import { IVSnackbar } from './../../components/IVSnackbar';
import { getFCMToken } from '../../services/firebaseService';
import { saveFcmTokenApi } from '../../api/notificationApi';
import { COLORS, PAPER_THEME } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';

export default function LoginScreen() {
  const dispatch = useDispatch();
  const { isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [Error, setError] = useState({});

  const validate = () => {
    let err = {};
    let valid = true;
    if (!email.trim()) {
      err['email'] = 'Please enter email address.';
      valid = false;
    }

    if (!password.trim()) {
      err['password'] = 'Please enter password.';
      valid = false;
    }

    if (!valid) {
      IVSnackbar('Please enter login details properly');
    }
    setError(err);
    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const res = await loginApi({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (res?.success) {
        dispatch(
          setAuth({
            token: res.token,
            user: res.user,
          }),
        );
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            const fcmToken = await getFCMToken();

            if (fcmToken) {
              await saveFcmTokenApi({
                fcm_token: fcmToken,
                device_type: 'android',
              });
            }
          }
        } catch (error) {
          console.log('SAVE FCM ERROR', error);
        }
      } else {
        Alert.alert('Login Failed', res?.message || 'Invalid login details.');
      }
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="always"
      >
        <View style={[styles.card, isTablet && centeredContent(480)]}>
          <Text style={styles.title}>Login</Text>

          <Text style={styles.description}>
            Login with your registered email and password
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
            error={Error.email}
            left={<TextInput.Icon icon="email-outline" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureText}
            style={styles.input}
            outlineColor={COLORS.inputBorder}
            activeOutlineColor={COLORS.accent}
            textColor={COLORS.text}
            theme={PAPER_THEME}
            left={<TextInput.Icon icon="lock-outline" />}
            error={Error.password}
            right={
              <TextInput.Icon
                icon={secureText ? 'eye-outline' : 'eye-off-outline'}
                onPress={() => setSecureText(prev => !prev)}
              />
            }
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.disabledBtn]}
            disabled={loading}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  flex: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  scrollContent: {
    // flexGrow (not flex) lets the card center vertically while still
    // allowing the view to scroll when the keyboard shrinks the space.
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  logoBox: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 5,
    overflow: 'hidden',
  },

  logoText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },

  appTitle: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: '900',
  },

  appSubtitle: {
    marginTop: 6,
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 26,
    padding: 20,
    elevation: 5,
  },

  title: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
  },

  description: {
    marginTop: 6,
    marginBottom: 20,
    color: COLORS.gray,
    fontSize: 14,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },

  loginBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  disabledBtn: {
    opacity: 0.65,
  },

  loginText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  note: {
    marginTop: 16,
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
  },
});
