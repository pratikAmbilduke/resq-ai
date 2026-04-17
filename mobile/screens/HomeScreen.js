import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import API_BASE_URL from '../config';

export default function HomeScreen({ navigation, onLogout }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');

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

  const sendLocation = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      await fetch(`${API_BASE_URL}/update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId, 10),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });

      console.log('📍 Location sent');
    } catch (error) {
      console.log('Location Error:', error);
    }
  };

  const loadHomeData = async () => {
    try {
      const storedName = await AsyncStorage.getItem('userName');
      const storedRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');

      setUserName(storedName || 'User');
      setUserRole(storedRole || 'user');

      if (!userId) {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        return;
      }

      if ((storedRole || 'user') === 'admin') {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        return;
      }

      const pending = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'pending'
      ).length;

      const progress = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'in progress'
      ).length;

      const resolved = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'resolved'
      ).length;

      setPendingCount(pending);
      setProgressCount(progress);
      setResolvedCount(resolved);
    } catch (error) {
      console.log('Home load error:', error);
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
      }, 5000);

      return () => {
        clearPolling();
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  const handleLogout = async () => {
    try {
      clearPolling();

      await AsyncStorage.multiRemove([
        'userId',
        'userName',
        'userEmail',
        'userRole',
      ]);

      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log('Logout Error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  if (userRole === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Home</Text>

        <View style={styles.logoSection}>
          <Text style={styles.logoTitle}>🚑 ResQ AI</Text>
          <Text style={styles.logoSubtitle}>Emergency Help System</Text>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.roleText}>Role: admin</Text>
        </View>

        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Admin')}
        >
          <Text style={styles.menuText}>🛠 Admin Panel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Home</Text>

      <View style={styles.logoSection}>
        <Text style={styles.logoTitle}>🚑 ResQ AI</Text>
        <Text style={styles.logoSubtitle}>Emergency Help System</Text>
      </View>

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.roleText}>Role: {userRole}</Text>
      </View>

      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => navigation.navigate('Emergency')}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <View style={styles.statusRow}>
        <View style={[styles.statusCard, styles.pendingCard]}>
          <Text style={styles.statusCount}>{pendingCount}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </View>

        <View style={[styles.statusCard, styles.progressCard]}>
          <Text style={styles.statusCount}>{progressCount}</Text>
          <Text style={styles.statusLabel}>Progress</Text>
        </View>

        <View style={[styles.statusCard, styles.resolvedCard]}>
          <Text style={styles.statusCount}>{resolvedCount}</Text>
          <Text style={styles.statusLabel}>Resolved</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.menuText}>📜 History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.menuText}>📊 Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.menuText}>👤 Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuCard}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.menuText}>📍 Live Map</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f5f7',
    flexGrow: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#007bff',
    marginTop: 6,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ff1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 28,
  },
  sosText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#efe4b8',
  },
  progressCard: {
    backgroundColor: '#bddbe2',
  },
  resolvedCard: {
    backgroundColor: '#c8dfcb',
  },
  statusCount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    marginBottom: 16,
  },
  menuText: {
    fontSize: 18,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#ff0f47',
    borderRadius: 16,
    padding: 22,
    marginTop: 18,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});