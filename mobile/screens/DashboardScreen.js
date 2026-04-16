import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

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
        setStats({
          total: 0,
          pending: 0,
          in_progress: 0,
          resolved: 0,
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (data.error) {
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

  useEffect(() => {
    fetchStats();

    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderSkeleton = () => {
    return (
      <View>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.skeletonCard}>
            <View style={styles.skeletonLine} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Dashboard</Text>
      <Text style={styles.subtitle}>Live emergency summary</Text>

      {loading ? (
        renderSkeleton()
      ) : (
        <>
          <View style={[styles.card, styles.totalCard]}>
            <Text style={styles.cardTitle}>Total Emergencies</Text>
            <Text style={styles.cardValue}>{stats.total}</Text>
          </View>

          <View style={[styles.card, styles.pendingCard]}>
            <Text style={styles.cardTitle}>Pending</Text>
            <Text style={styles.cardValue}>{stats.pending}</Text>
          </View>

          <View style={[styles.card, styles.progressCard]}>
            <Text style={styles.cardTitle}>In Progress</Text>
            <Text style={styles.cardValue}>{stats.in_progress}</Text>
          </View>

          <View style={[styles.card, styles.resolvedCard]}>
            <Text style={styles.cardTitle}>Resolved</Text>
            <Text style={styles.cardValue}>{stats.resolved}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    elevation: 3,
  },
  totalCard: {
    backgroundColor: '#ffffff',
  },
  pendingCard: {
    backgroundColor: '#fff3cd',
  },
  progressCard: {
    backgroundColor: '#d1ecf1',
  },
  resolvedCard: {
    backgroundColor: '#d4edda',
  },
  cardTitle: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
  },
  skeletonCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 2,
  },
  skeletonLine: {
    height: 22,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
  },
});