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
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      Alert.alert('Validation Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();
      console.log('REGISTER RESPONSE:', data);

      if (!response.ok) {
        Alert.alert('Register Failed', data?.detail || 'Server error');
        return;
      }

      if (data?.error) {
        Alert.alert('Register Failed', data.error);
        return;
      }

      if (!data?.data?.id) {
        Alert.alert('Error', 'Server returned invalid response');
        return;
      }

      Alert.alert('Success', 'Account created successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Login');
          },
        },
      ]);
    } catch (error) {
      console.log('REGISTER ERROR:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#ec4899', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topCard}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>R</Text>
          </View>

          <Text style={styles.topTitle}>Create Account</Text>
          <Text style={styles.topSubtitle}>
            Join ResQ AI and stay connected to emergency support
          </Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Register</Text>
          <Text style={styles.formSubtitle}>Fill your details to continue</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />

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
            placeholder="Create password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    padding: 18,
    justifyContent: 'center',
  },

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
  avatarText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
  },
  topSubtitle: {
    color: '#fdf2f8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    elevation: 4,
  },
  formTitle: {
    color: '#1f2937',
    fontSize: 23,
    fontWeight: 'bold',
  },
  formSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },

  label: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: '#111827',
  },

  registerButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  loginText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 18,
  },
  loginLink: {
    color: '#4f46e5',
    fontWeight: 'bold',
  },
});