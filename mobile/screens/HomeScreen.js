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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 🔥 Send location
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
    } catch (error) {
      console.log('Location Error:', error);
    }
  };

  // 🔥 Load profile
  const loadProfileData = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
      const data = await res.json();

      if (data && !data.error) {
        setEmergencyContactPhone(data.emergency_contact_phone || '');
      }
    } catch {
      setEmergencyContactPhone('');
    }
  };

  // 🔥 Load home data
  const loadHomeData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const role = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const img = await AsyncStorage.getItem('userProfileImage');

      setUserName(name || 'User');
      setUserRole(role || 'user');
      setProfileImage(img || '');

      if (!userId) return;

      await loadProfileData(userId);

      if (role === 'admin') return;

      const res = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await res.json();

      if (!Array.isArray(data)) return;

      setPendingCount(data.filter(i => i.status === 'pending').length);
      setProgressCount(data.filter(i => i.status === 'in progress').length);
      setResolvedCount(data.filter(i => i.status === 'resolved').length);

    } catch (e) {
      console.log('Home Error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
      sendLocation();

      clearPolling();
      intervalRef.current = setInterval(() => {
        loadHomeData();
        sendLocation();
      }, 6000);

      return clearPolling;
    }, [])
  );

  useEffect(() => () => clearPolling(), []);

  // 🔥 Logout
  const handleLogout = async () => {
    await AsyncStorage.clear();
    if (onLogout) onLogout();
  };

  // 🔥 Call function
  const callPhoneNumber = async (number) => {
    if (!number) return Alert.alert('Error', 'Number not available');

    const url = `tel:${number}`;
    const supported = await Linking.canOpenURL(url);

    if (!supported) return Alert.alert('Error', 'Call not supported');

    Linking.openURL(url);
  };

  const firstName = userName.split(' ')[0];

  // 🔥 Profile UI
  const renderProfile = () => (
    profileImage
      ? <Image source={{ uri: profileImage }} style={styles.profileImage} />
      : (
        <View style={styles.profilePlaceholder}>
          <Text style={styles.profileText}>{firstName[0]}</Text>
        </View>
      )
  );

  // ================= ADMIN =================
  if (userRole === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileRow}>
            {renderProfile()}
            <View>
              <Text style={styles.greeting}>Welcome</Text>
              <Text style={styles.name}>{firstName}</Text>
              <Text style={styles.role}>Admin</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroDark}>
          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroSub}>
            Manage emergencies & monitor activity
          </Text>
        </View>

        <TouchableOpacity style={styles.bigCard}
          onPress={() => navigation.navigate('RequestsTab')}>
          <Text style={styles.cardTitle}>🛠 Manage Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallCard}
          onPress={() => navigation.navigate('AdminMapTab')}>
          <Text style={styles.cardTitleDark}>📍 Live Map</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ================= USER =================
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* HERO */}
      <View style={styles.heroBlue}>
        <Text style={styles.heroTitle}>Emergency Support</Text>
        <Text style={styles.heroSub}>Fast help when you need it</Text>
      </View>

      {/* SOS */}
      <TouchableOpacity style={styles.sosBtn}
        onPress={() => navigation.navigate('Emergency')}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      {/* QUICK ACTION */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.actionRed}
          onPress={() => callPhoneNumber('112')}>
          <Text style={styles.actionText}>📞 Call 112</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionGreen}
          onPress={() => callPhoneNumber(emergencyContactPhone)}>
          <Text style={styles.actionText}>👤 Contact</Text>
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

// ================= STYLES =================
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

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 10,
  },

  profilePlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  profileText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  greeting: { color: '#6b7280' },
  name: { fontSize: 20, fontWeight: 'bold' },
  role: { color: '#0d6efd' },

  logoutBtn: {
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 10,
  },

  logoutText: { color: '#fff' },

  heroBlue: {
    backgroundColor: '#0d6efd',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },

  heroDark: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },

  heroTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  heroSub: { color: '#ddd', marginTop: 5 },

  sosBtn: {
    backgroundColor: 'red',
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  sosText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  actionRed: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginRight: 5,
  },

  actionGreen: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginLeft: 5,
  },

  actionText: { fontWeight: 'bold' },

  statusCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 3,
  },

  count: { fontSize: 22, fontWeight: 'bold' },

  bigCard: {
    backgroundColor: '#0d6efd',
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
  },

  smallCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
  },

  cardTitle: { color: '#fff', fontSize: 18 },
  cardTitleDark: { fontSize: 18 },
});