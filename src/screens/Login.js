import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { IVSnackbar } from '../components/IVSnackbar';
import { loginSuccess } from '../redux/features/auth/authSlice';
import { apiRequest } from '../redux/services/api';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  border: '#B8C4D6',
  text: '#1F2544',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  white: '#FFFFFF',
  background: '#F8FAFC',
};

function LoginScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [Error, setError] = useState({});

  const loginMutation = useMutation({
    mutationFn: values =>
      apiRequest({
        endpoint: '/auth/login',
        method: 'POST',
        body: values,
      }),

    onSuccess: data => {
      dispatch(
        loginSuccess({
          token: data.token,
          user: data.user,
        }),
      );
      IVSnackbar(data.message);
      // navigation.reset({
      //   index: 0,
      //   routes: [{ name: 'Home' }],
      // });
    },

    onError: error => {
      IVSnackbar(error.message);
    },
  });

  const validateForm = useCallback(() => {
    let isValid = true;
    let err = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      err['email'] = 'Email address is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      err['email'] = 'Enter a valid email address';
      isValid = false;
    }

    if (!password) {
      err['password'] = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      err['password'] = 'Password must be at least 6 characters';
      isValid = false;
    }
    setError(err);
    return Object.keys(err).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    loginMutation.mutate({
      email,
      password,
    });
  }, [email, password, loginMutation, validateForm]);

  const toggleSecure = useCallback(() => {
    setSecure(prev => !prev);
  }, []);

  const isLoading = loginMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={'padding'}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/Image/IV_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.description}>Login to continue</Text>

        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.accent}
          textColor={COLORS.text}
          theme={inputTheme}
          left={<TextInput.Icon icon="email-outline" />}
          disabled={isLoading}
          error={Error.email}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          mode="outlined"
          style={styles.input}
          outlineColor={COLORS.border}
          activeOutlineColor={COLORS.accent}
          textColor={COLORS.text}
          theme={inputTheme}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={secure ? 'eye-off-outline' : 'eye-outline'}
              onPress={toggleSecure}
            />
          }
          disabled={isLoading}
          error={Error.password}
        />

        <TouchableOpacity
          onPress={handleLogin}
          activeOpacity={0.75}
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.loginText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} disabled={isLoading}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        © 2026 IV Square Structure India Pvt Ltd
      </Text>
    </KeyboardAvoidingView>
  );
}

const inputTheme = {
  colors: {
    primary: COLORS.accent,
    onSurfaceVariant: COLORS.primary,
    background: COLORS.white,
  },
  roundness: 14,
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    justifyContent: 'center',
    flex: 1,
    backgroundColor: COLORS.background,
  },

  logoContainer: {
    alignItems: 'center',
  },

  logo: {
    width: 200,
    height: 200,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },

  description: {
    fontSize: 15,
    color: COLORS.gray,
    marginTop: 5,
    marginBottom: 24,
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 18,
  },

  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  disabledButton: {
    opacity: 0.7,
  },

  loginText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  forgotText: {
    textAlign: 'center',
    marginTop: 18,
    color: COLORS.accent,
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    marginTop: 28,
    color: COLORS.lightGray,
    fontSize: 12,
  },
});

export default memo(LoginScreen);
