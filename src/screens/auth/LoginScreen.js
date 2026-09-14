import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { COLORS, PAPER_THEME, UI } from '../../assets/Colors';
import { centeredContent, useResponsive } from '../../utils/responsive';
import { syncNotificationRegistration } from '../../services/notificationRegistrationService';

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
      err.email = 'Please enter email address.';
      valid = false;
    }

    if (!password.trim()) {
      err.password = 'Please enter password.';
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
        syncNotificationRegistration().catch(error => {
          console.warn(
            'Login notification check failed:',
            error?.response?.data?.message || error?.message,
          );
        });
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
          <View style={styles.identity}>
            <View style={styles.brandMark}>
              <Image
                source={require('../../assets/Image/IV_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.eyebrow}>IV PRODUCTION</Text>
              <Text style={styles.identityText}>PLANT OPERATIONS SYSTEM</Text>
            </View>
          </View>
          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.description}>
            Sign in with your assigned plant account to access production and
            shift records.
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
            error={Boolean(Error.email)}
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
            error={Boolean(Error.password)}
            right={
              <TextInput.Icon
                icon={secureText ? 'eye-outline' : 'eye-off-outline'}
                onPress={() => setSecureText(prev => !prev)}
              />
            }
          />

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.loginBtn, loading && styles.disabledBtn]}
            disabled={loading}
            onPress={handleLogin}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginText}>Sign in to operations</Text>
            )}
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <ShieldCheck size={16} color={COLORS.teal} />
            <Text style={styles.secureNoteText}>
              Secure access for authorised plant staff
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.hero,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusLarge,
    padding: 22,
    borderTopWidth: 0,
    ...UI.shadow,
    borderWidth: 0,
    borderColor: COLORS.border,
  },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 24,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  identityCopy: { flex: 1 },
  identityText: {
    color: COLORS.gray,
    fontSize: 10,
    letterSpacing: 1,
    lineHeight: 16,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  logo: {
    height: 48,
    width: 48,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
  },

  description: {
    marginTop: 6,
    marginBottom: 24,
    color: COLORS.gray,
    fontSize: 15,
    lineHeight: 22,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },

  loginBtn: {
    minHeight: 54,
    paddingVertical: 12,
    backgroundColor: COLORS.coral,
    borderRadius: UI.radiusSmall,
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
    fontWeight: '600',
  },

  secureNote: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  secureNoteText: {
    flex: 1,
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
});
