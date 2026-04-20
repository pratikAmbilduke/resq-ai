import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={['#0d6efd', '#7c3aed', '#ff416c']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0d6efd" />

      <View style={styles.logoOuter}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>R</Text>
        </View>
      </View>

      <Text style={styles.title}>ResQ AI</Text>
      <Text style={styles.subtitle}>Smart Emergency Response System</Text>

      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading your safety network...</Text>
      </View>

      <View style={styles.footerWrap}>
        <Text style={styles.footerText}>Fast • Smart • Reliable</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logoOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },

  logoInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    color: '#ffffff',
    fontSize: 44,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  subtitle: {
    color: '#e9e7ff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },

  loaderWrap: {
    alignItems: 'center',
    marginTop: 36,
  },

  loadingText: {
    color: '#f3f4f6',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },

  footerWrap: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
  },

  footerText: {
    color: '#fce7f3',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});