import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';

import { loginApi } from '../../api/authApi';
import { setAuth } from '../../redux/slices/authSlice';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
  inputBorder: '#B8C4D6',
  lightBlue: '#EEF7FD',
  danger: '#DC2626',
};

const PAPER_THEME = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

export default function LoginScreen() {
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter email address.');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Required', 'Please enter password.');
      return false;
    }

    return true;
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
          style={{ flex: 1 }}
        >
          <View style={styles.logoBox}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/Image/IV_Logo_1.png')}
                style={{
                  width: 82,
                  height: 82,
                  transform: [{ translateY: 7 }],
                }}
              />
            </View>

            <Text style={styles.appTitle}>IV Production App</Text>

            <Text style={styles.appSubtitle}>
              Hot Dip Galvanizing Production System
            </Text>
          </View>

          <View style={styles.card}>
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
        </TouchableOpacity>
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
