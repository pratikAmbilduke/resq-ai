import { useEffect, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation, onLogout }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  useEffect(() => {
    loadUserData();
    fetchStats();

    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    const name = await AsyncStorage.getItem('userName');
    const role = await AsyncStorage.getItem('userRole');

    if (name) setUserName(name);
    if (role) setUserRole(role);
  };

  const fetchStats = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`http://localhost:8000/emergencies/${userId}`);
      const data = await response.json();

      if (data.error) return;

      const pending = data.filter((e) => e.status === 'pending').length;
      const in_progress = data.filter((e) => e.status === 'in_progress').length;
      const resolved = data.filter((e) => e.status === 'resolved').length;

      setStats({ pending, in_progress, resolved });
    } catch (error) {
      console.log('Stats Error:', error);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (onLogout) await onLogout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🚑 ResQ AI</Text>
        <Text style={styles.subtitle}>Emergency Help System</Text>

        {/* USER CARD */}
        <View style={styles.card}>
          <Text style={styles.small}>Welcome</Text>
          <Text style={styles.name}>{userName}</Text>
          <Text style={styles.role}>Role: {userRole}</Text>
        </View>

        {/* SOS BUTTON */}
        <TouchableOpacity
          style={styles.sos}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>

        {/* QUICK STATS */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#fff3cd' }]}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text>Pending</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: '#d1ecf1' }]}>
            <Text style={styles.statValue}>{stats.in_progress}</Text>
            <Text>Progress</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: '#d4edda' }]}>
            <Text style={styles.statValue}>{stats.resolved}</Text>
            <Text>Resolved</Text>
          </View>
        </View>

        {/* ACTION CARDS */}
        <TouchableOpacity
          style={styles.action}
          onPress={() => navigation.navigate('History')}
        >
          <Text>📜 History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text>📊 Dashboard</Text>
        </TouchableOpacity>

        {userRole === 'admin' && (
          <TouchableOpacity
            style={styles.action}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text>🛠 Admin Panel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.action}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text>👤 Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={confirmLogout}>
          <Text style={{ color: '#fff' }}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  content: { padding: 20 },

  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 15 },

  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  small: { color: '#666' },
  name: { fontSize: 20, fontWeight: 'bold' },
  role: { color: '#007bff' },

  sos: {
    backgroundColor: 'red',
    height: 150,
    width: 150,
    borderRadius: 75,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sosText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 10,
    margin: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: 'bold' },

  action: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  logout: {
    backgroundColor: '#dc3545',
    padding: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
  },
});