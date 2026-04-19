import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function HomeScreen({ navigation, onLogout }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const sendLocation = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});

      await fetch(`${API_BASE_URL}/update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });
    } catch (e) {}
  };

  const loadData = async () => {
    const name = await AsyncStorage.getItem('userName');
    const role = await AsyncStorage.getItem('userRole');
    const userId = await AsyncStorage.getItem('userId');
    const img = await AsyncStorage.getItem('userProfileImage');

    setUserName(name || 'User');
    setUserRole(role || 'user');
    setProfileImage(img || '');

    if (!userId) return;

    const res = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
    const data = await res.json();

    if (!Array.isArray(data)) return;

    setPendingCount(data.filter(i => i.status === 'pending').length);
    setProgressCount(data.filter(i => i.status === 'in progress').length);
    setResolvedCount(data.filter(i => i.status === 'resolved').length);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      sendLocation();

      intervalRef.current = setInterval(() => {
        loadData();
        sendLocation();
      }, 6000);

      return clearPolling;
    }, [])
  );

  const firstName = userName.split(' ')[0];

  const renderProfile = () => (
    profileImage
      ? <Image source={{ uri: profileImage }} style={styles.profileImage} />
      : (
        <View style={styles.profilePlaceholder}>
          <Text style={styles.profileText}>{firstName[0]}</Text>
        </View>
      )
  );

  const call = (num) => Linking.openURL(`tel:${num}`);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.profileRow}>
          {renderProfile()}
          <View>
            <Text style={styles.greeting}>Hello</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={{ color: '#fff' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 🔥 GRADIENT HERO */}
      <LinearGradient
        colors={['#0d6efd', '#6610f2']}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Emergency Support</Text>
        <Text style={styles.heroSub}>Fast, reliable, real-time help</Text>
      </LinearGradient>

      {/* 🔥 FLOATING SOS */}
      <View style={styles.sosWrapper}>
        <TouchableOpacity
          style={styles.sos}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* ACTION CARDS */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.cardRed} onPress={() => call('112')}>
          <Text style={styles.cardTitle}>📞 Call 112</Text>
          <Text style={styles.cardSub}>Emergency number</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cardGreen}>
          <Text style={styles.cardTitle}>👤 Contact</Text>
          <Text style={styles.cardSub}>Saved contact</Text>
        </TouchableOpacity>
      </View>

      {/* STATUS */}
      <View style={styles.row}>
        <View style={styles.statusCard}>
          <Text style={styles.count}>{pendingCount}</Text>
          <Text>Pending</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.count}>{progressCount}</Text>
          <Text>Progress</Text>
        </View>
        <View style={styles.statusCard}>
          <Text style={styles.count}>{resolvedCount}</Text>
          <Text>Done</Text>
        </View>
      </View>

    </ScrollView>
  );
}

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  profileRow: { flexDirection: 'row', alignItems: 'center' },

  profileImage: { width: 55, height: 55, borderRadius: 30, marginRight: 10 },

  profilePlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  profileText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  greeting: { color: '#6b7280' },
  name: { fontSize: 20, fontWeight: 'bold' },

  logoutBtn: {
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 10,
  },

  hero: {
    padding: 25,
    borderRadius: 25,
    marginBottom: 30,
  },

  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  heroSub: { color: '#e0e0e0', marginTop: 5 },

  sosWrapper: {
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 20,
  },

  sos: {
    backgroundColor: 'red',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },

  sosText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  cardRed: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginRight: 8,
    elevation: 3,
  },

  cardGreen: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginLeft: 8,
    elevation: 3,
  },

  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardSub: { fontSize: 12, color: '#777', marginTop: 4 },

  statusCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
  },

  count: { fontSize: 22, fontWeight: 'bold' },
});