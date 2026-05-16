import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { TextInput } from 'react-native-paper';
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const navigation = useNavigation();

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        {/* Replace with your logo */}
        <Image
          source={require('../assets/Image/IV_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>

        <Text style={styles.description}>Login to continue</Text>

        {/* Email Input */}
        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          outlineColor="#B8C4D6"
          activeOutlineColor="#39A9E6"
          textColor="#1F2544"
          theme={{
            colors: {
              primary: '#39A9E6',
              onSurfaceVariant: '#232B5D',
              background: '#FFFFFF',
            },
            roundness: 14,
          }}
          left={<TextInput.Icon icon="email-outline" />}
        />

        {/* Password Input */}
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          mode="outlined"
          style={styles.input}
          outlineColor="#B8C4D6"
          activeOutlineColor="#39A9E6"
          textColor="#1F2544"
          theme={{
            colors: {
              primary: '#39A9E6',
              onSurfaceVariant: '#232B5D',
              background: '#FFFFFF',
            },
            roundness: 14,
          }}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={secure ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setSecure(!secure)}
            />
          }
        />

        {/* Login Button */}
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Home');
          }}
          activeOpacity={0.7}
          style={styles.loginButton}
        >
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        © 2026 IV Square Structure India Pvt Ltd
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    justifyContent: 'center',
    flex: 1,
  },

  logoContainer: {
    alignItems: 'center',
  },

  logo: {
    width: 200,
    height: 200,
  },

  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#232B5D',
    letterSpacing: 1,
  },

  subTitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
  },

  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#232B5D',
  },

  description: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 5,
    marginBottom: 24,
  },

  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },

  loginButton: {
    backgroundColor: '#232B5D',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#39A9E6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  forgotText: {
    textAlign: 'center',
    marginTop: 18,
    color: '#39A9E6',
    fontWeight: '600',
  },

  footer: {
    textAlign: 'center',
    marginTop: 28,
    color: '#9CA3AF',
    fontSize: 12,
  },
});
