import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

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
        body: JSON.stringify({ email: email.trim(), password }),
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
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    color: '#007bff',
    fontWeight: '500',
  },
});