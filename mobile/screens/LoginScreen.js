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
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import AppCard from '../components/AppCard';
import AppChip from '../components/AppChip';

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

      const roleFromBackend = data?.data?.role || 'user';

      await AsyncStorage.setItem('userId', String(data.data.id));
      await AsyncStorage.setItem('userName', data.data.name || '');
      await AsyncStorage.setItem('userEmail', data.data.email || '');
      await AsyncStorage.setItem('userRole', roleFromBackend);

      Alert.alert('Success', 'Login successful');

      if (onLoginSuccess) {
        onLoginSuccess();
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
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Welcome to ResQ AI</Text>
        <Text style={styles.heroSubtitle}>
          Smart emergency support with live tracking and fast response.
        </Text>

        <View style={styles.heroChipsRow}>
          <AppChip label="Fast" type="info" />
          <View style={{ width: 8 }} />
          <AppChip label="Secure" type="purple" />
        </View>
      </LinearGradient>

      <AppCard style={styles.formCard}>
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

        <View style={styles.buttonWrap}>
          <AppButton title="Login" onPress={handleLogin} variant="primary" />
        </View>

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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 22,
    ...SHADOW.card,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 28,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  formCard: {
    marginBottom: 10,
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
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },

  buttonWrap: {
    marginTop: 20,
  },

  linkWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
});