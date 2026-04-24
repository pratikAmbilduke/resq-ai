import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

// ✅ FIX: Import correct function
import { fetchJson } from '../utils/api';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Validation Error', 'Please enter email and password');
      return;
    }

    try {
      setLoading(true);

      const result = await fetchJson(`${API_BASE_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      console.log('LOGIN RESPONSE:', result);

      // ❌ OLD WRONG
      // if (!result.ok)

      // ✅ FIXED
      if (result.error) {
        Alert.alert('Login Failed', result.error);
        return;
      }

      const user = result.data;

      if (!user?.id || !user?.role) {
        Alert.alert('Error', 'Invalid server response');
        return;
      }

      await AsyncStorage.multiSet([
        ['userId', String(user.id)],
        ['userName', String(user.name || '')],
        ['userEmail', String(user.email || trimmedEmail)],
        ['userRole', String(user.role || 'user')],
      ]);

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (error) {
      console.log('LOGIN ERROR:', error);
      Alert.alert('Error', 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#2563eb', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topCard}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>R</Text>
          </View>

          <Text style={styles.topTitle}>Welcome Back</Text>
          <Text style={styles.topSubtitle}>Sign in to continue using ResQ AI</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Login</Text>
          <Text style={styles.formSubtitle}>Enter your details to continue</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerLink}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, padding: 18, justifyContent: 'center' },
  topCard: {
    borderRadius: 28,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: -24,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  topTitle: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  topSubtitle: {
    color: '#e0e7ff',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    elevation: 4,
  },
  formTitle: { fontSize: 23, fontWeight: 'bold' },
  formSubtitle: { marginBottom: 18 },
  label: { marginTop: 10, marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 15,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  loginButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  registerText: { textAlign: 'center', marginTop: 18 },
  registerLink: { color: '#2563eb', fontWeight: 'bold' },
});