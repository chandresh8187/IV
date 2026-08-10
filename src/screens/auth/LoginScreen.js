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
          <View style={styles.brandMark}>
            <Image
              source={require('../../assets/Image/IV_logo.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.eyebrow}>IV PRODUCTION</Text>
          <Text style={styles.title}>Welcome back.</Text>

          <Text style={styles.description}>
            Sign in to continue managing your plant operations.
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
              <Text style={styles.loginText}>Sign in</Text>
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
    backgroundColor: COLORS.bg,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.radiusLarge,
    padding: 26,
    ...UI.shadow,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  brandMark: {
    width: 70,
    height: 70,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginBottom: 22,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  logo: {
    height: 60,
    width: 60,
  },

  eyebrow: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: 9,
  },

  title: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: '800',
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
    height: 54,
    backgroundColor: COLORS.accent,
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
    fontWeight: '700',
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
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
