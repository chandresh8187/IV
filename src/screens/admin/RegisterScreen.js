import React, { memo, useCallback, useRef, useState } from 'react';
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
import PagerView from 'react-native-pager-view';
import { TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { IVSnackbar } from '../../components/IVSnackbar';
import { apiRequest } from '../../redux/services/api';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  border: '#B8C4D6',
  text: '#1F2544',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  white: '#FFFFFF',
  background: '#F8FAFC',
  danger: '#EF4444',
};

function RegisterScreen() {
  const navigation = useNavigation();
  const pagerRef = useRef(null);

  const { token, role: loggedInRole } = useSelector(state => state.auth);

  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [role, setRole] = useState('supervisor');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [confirmSecure, setConfirmSecure] = useState(true);

  const [Error, setError] = useState({});

  const registerMutation = useMutation({
    mutationFn: values =>
      apiRequest({
        endpoint: '/auth/register',
        method: 'POST',
        token,
        body: values,
      }),

    onSuccess: data => {
      IVSnackbar(data.message || 'User registered successfully');
      navigation.goBack();
    },

    onError: error => {
      IVSnackbar(error.message || 'Registration failed');
    },
  });

  const goToStep = useCallback(nextStep => {
    setStep(nextStep);
    pagerRef.current?.setPage(nextStep);
  }, []);

  const validateStepOne = useCallback(() => {
    let err = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      err.name = 'Name is required';
    } else if (trimmedName.length < 3) {
      err.name = 'Name must be at least 3 characters';
    }

    if (!trimmedEmail) {
      err.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      err.email = 'Enter a valid email address';
    }

    setError(err);
    return Object.keys(err).length === 0;
  }, [name, email]);

  const validateStepTwo = useCallback(() => {
    let err = {};

    if (!role) {
      err.role = 'Please select user role';
    }

    setError(err);
    return Object.keys(err).length === 0;
  }, [role]);

  const validateStepThree = useCallback(() => {
    let err = {};

    if (!password) {
      err.password = 'Password is required';
    } else if (password.length < 6) {
      err.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      err.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      err.confirmPassword = 'Password does not match';
    }

    setError(err);
    return Object.keys(err).length === 0;
  }, [password, confirmPassword]);

  const handleNext = useCallback(() => {
    if (step === 0 && validateStepOne()) {
      goToStep(1);
      return;
    }

    if (step === 1 && validateStepTwo()) {
      goToStep(2);
    }
  }, [step, validateStepOne, validateStepTwo, goToStep]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      goToStep(step - 1);
      return;
    }

    navigation.goBack();
  }, [step, goToStep, navigation]);

  const handleRegister = useCallback(() => {
    if (!validateStepThree()) {
      return;
    }

    registerMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      role,
      password,
    });
  }, [name, email, role, password, validateStepThree, registerMutation]);

  const isLoading = registerMutation.isPending;

  if (loggedInRole !== 'superadmin') {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Access Denied</Text>

        <Text style={styles.permissionText}>
          Only superadmin can register supervisor or admin users.
        </Text>

        <TouchableOpacity
          style={styles.goBackButton}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/Image/IV_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Register User</Text>
        <Text style={styles.description}>Step {step + 1} of 3</Text>

        <View style={styles.progressRow}>
          {[0, 1, 2].map(item => (
            <View
              key={item}
              style={[
                styles.progressDot,
                step >= item && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          scrollEnabled={false}
        >
          <View key="step-one" style={styles.page}>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={inputTheme}
              left={<TextInput.Icon icon="account-outline" />}
              disabled={isLoading}
              error={!!Error.name}
            />

            {Error.name ? (
              <Text style={styles.errorText}>{Error.name}</Text>
            ) : null}

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
              error={!!Error.email}
            />

            {Error.email ? (
              <Text style={styles.errorText}>{Error.email}</Text>
            ) : null}
          </View>

          <View key="step-two" style={styles.page}>
            <Text style={styles.roleTitle}>Select User Role</Text>

            {['supervisor', 'admin'].map(item => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.75}
                style={[
                  styles.roleCard,
                  role === item && styles.roleCardActive,
                ]}
                onPress={() => setRole(item)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.roleCardTitle,
                    role === item && styles.roleCardTitleActive,
                  ]}
                >
                  {item === 'supervisor' ? 'Supervisor' : 'Admin'}
                </Text>
              </TouchableOpacity>
            ))}

            {Error.role ? (
              <Text style={styles.errorText}>{Error.role}</Text>
            ) : null}
          </View>

          <View key="step-three" style={styles.page}>
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
                  onPress={() => setSecure(prev => !prev)}
                />
              }
              disabled={isLoading}
              error={!!Error.password}
            />

            {Error.password ? (
              <Text style={styles.errorText}>{Error.password}</Text>
            ) : null}

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={confirmSecure}
              mode="outlined"
              style={styles.input}
              outlineColor={COLORS.border}
              activeOutlineColor={COLORS.accent}
              textColor={COLORS.text}
              theme={inputTheme}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={confirmSecure ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setConfirmSecure(prev => !prev)}
                />
              }
              disabled={isLoading}
              error={!!Error.confirmPassword}
            />

            {Error.confirmPassword ? (
              <Text style={styles.errorText}>{Error.confirmPassword}</Text>
            ) : null}
          </View>
        </PagerView>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>
              {step === 0 ? 'CANCEL' : 'BACK'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.nextButton, isLoading && styles.disabledButton]}
            onPress={step === 2 ? handleRegister : handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 2 ? 'REGISTER' : 'NEXT'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
    // justifyContent: 'center',
    flex: 1,
    backgroundColor: COLORS.background,
  },

  logoContainer: {
    alignItems: 'center',
  },

  logo: {
    width: 150,
    height: 150,
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
    marginBottom: 16,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },

  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },

  progressDotActive: {
    backgroundColor: COLORS.accent,
  },

  pagerView: {
    height: 160,
  },

  page: {
    width: '100%',
  },

  input: {
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: '500',
  },

  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 14,
  },

  roleCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    marginBottom: 14,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  roleCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },

  roleCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },

  roleCardTitleActive: {
    color: COLORS.primary,
  },

  roleCardText: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 19,
  },

  roleCardTextActive: {
    color: '#E5E7EB',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },

  backButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  nextButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  nextButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },

  disabledButton: {
    opacity: 0.7,
  },

  footer: {
    textAlign: 'center',
    marginTop: 28,
    color: COLORS.lightGray,
    fontSize: 12,
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  permissionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },

  permissionText: {
    color: COLORS.gray,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
    lineHeight: 22,
  },

  goBackButton: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  goBackButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default memo(RegisterScreen);
