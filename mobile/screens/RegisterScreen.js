import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    const finalName = name.trim();
    const finalEmail = email.trim().toLowerCase();
    const finalPassword = password.trim();

    if (!finalName || !finalEmail || !finalPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          email: finalEmail,
          password: finalPassword,
        }),
      });

      const text = await response.text();

      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.log('REGISTER RAW RESPONSE:', text);
        Alert.alert('Server Error', 'Invalid server response');
        return;
      }

      console.log('REGISTER RESPONSE:', data);

      if (data?.error) {
        Alert.alert('Register Failed', data.error);
        return;
      }

      if (!response.ok) {
        Alert.alert('Register Failed', data?.detail || 'Server error');
        return;
      }

      Alert.alert('Success', 'Account created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error) {
      console.log('REGISTER ERROR:', error);
      Alert.alert('Error', 'Network or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.main}>
      <LinearGradient colors={['#4f46e5', '#9333ea']} style={styles.header}>
        <Text style={styles.logo}>R</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join ResQ AI and stay connected to emergency support
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Register</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logo: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ddd',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    marginTop: -40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: '#6366f1',
  },
});