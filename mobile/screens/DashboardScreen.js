import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
  });

  const fetchStats = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const response = await fetch(`http://localhost:8000/emergencies/${userId}`);
      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      const total = data.length;
      const pending = data.filter((e) => e.status === 'pending').length;
      const in_progress = data.filter((e) => e.status === 'in_progress').length;
      const resolved = data.filter((e) => e.status === 'resolved').length;

      setStats({ total, pending, in_progress, resolved });
    } catch (error) {
      console.log('Dashboard Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Auto refresh every 5 seconds
  useEffect(() => {
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.total}>Total: {stats.total}</Text>
      </View>

      <View style={[styles.card, styles.pending]}>
        <Text style={styles.text}>Pending: {stats.pending}</Text>
      </View>

      <View style={[styles.card, styles.progress]}>
        <Text style={styles.text}>In Progress: {stats.in_progress}</Text>
      </View>

      <View style={[styles.card, styles.resolved]}>
        <Text style={styles.text}>Resolved: {stats.resolved}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: 'white',
    elevation: 3,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  pending: {
    backgroundColor: '#fff3cd',
  },
  progress: {
    backgroundColor: '#d1ecf1',
  },
  resolved: {
    backgroundColor: '#d4edda',
  },
});