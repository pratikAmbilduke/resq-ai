import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// ✅ Design System
import { COLORS, RADIUS, SPACING } from '../theme';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppCard from '../components/AppCard';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

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
        onLoginSuccess(data.data.role || 'user');
      }
    } catch (error) {
      console.log('Login Error:', error);
      Alert.alert('Error', 'Cannot connect to server');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 🔥 HERO */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Welcome to ResQ AI</Text>
        <Text style={styles.heroSubtitle}>
          Fast emergency support, live tracking, and safer response in one app.
        </Text>
      </View>

      {/* 🔥 FORM */}
      <AppCard>
        <Text style={styles.formTitle}>Login</Text>
        <Text style={styles.formSubtitle}>Sign in to continue</Text>

        <Text style={styles.label}>Email</Text>
        <AppInput
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <AppInput
          placeholder="Enter password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 🔥 BUTTON */}
        <View style={{ marginTop: 18 }}>
          <AppButton title="Login" onPress={handleLogin} />
        </View>

        {/* 🔥 LINK */}
        <TouchableOpacity
          style={styles.linkWrapper}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Don&apos;t have an account? Register
          </Text>
        </TouchableOpacity>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: SPACING.md,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  heroCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.xl,
    padding: 22,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    marginTop: 12,
    marginBottom: 6,
  },

  linkWrapper: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});