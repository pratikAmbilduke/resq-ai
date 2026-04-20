import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Login Failed', data.error);
        return;
      }

      await AsyncStorage.setItem('userId', String(data.data.id));
      await AsyncStorage.setItem('userName', data.data.name || '');
      await AsyncStorage.setItem('userEmail', data.data.email || '');
      await AsyncStorage.setItem('userRole', data.data.role || 'user');

      Alert.alert('Success', 'Login successful');

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.log('Login Error:', error);
      Alert.alert('Error', 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#0d6efd', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topSection}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>R</Text>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue using ResQ AI
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Login</Text>
        <Text style={styles.formSubTitle}>Enter your credentials</Text>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInputCustom
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInputCustom
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLinkWrap}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerText}>
            Don&apos;t have an account? Register
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

import { TextInput } from 'react-native';

const TextInputCustom = ({ style, ...props }) => (
  <TextInput
    {...props}
    style={[styles.input, style]}
    placeholderTextColor="#9ca3af"
  />
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f3f5f7',
    paddingBottom: 40,
  },

  topSection: {
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  logoText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },

  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#e5e7ff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 18,
    marginTop: -18,
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },

  formSubTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 8,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#111827',
    fontSize: 15,
  },

  loginButton: {
    marginTop: 20,
    backgroundColor: '#0d6efd',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  registerLinkWrap: {
    marginTop: 18,
    alignItems: 'center',
  },

  registerText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 14,
  },
});