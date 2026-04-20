import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={['#0d6efd', '#7c3aed']}
      style={styles.container}
    >
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>R</Text>
      </View>

      <Text style={styles.title}>ResQ AI</Text>

      <Text style={styles.subtitle}>
        Smart Emergency Response System
      </Text>

      <ActivityIndicator
        size="large"
        color="#ffffff"
        style={{ marginTop: 30 }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 6,
  },
});