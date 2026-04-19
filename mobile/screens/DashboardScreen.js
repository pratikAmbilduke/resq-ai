import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [total, setTotal] = useState(0);

  const loadDashboard = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setLoading(false);
        return;
      }

      const pendingCount = data.filter(
        (item) => String(item?.status).toLowerCase() === 'pending'
      ).length;

      const progressCount = data.filter(
        (item) => String(item?.status).toLowerCase() === 'in progress'
      ).length;

      const resolvedCount = data.filter(
        (item) => String(item?.status).toLowerCase() === 'resolved'
      ).length;

      setPending(pendingCount);
      setProgress(progressCount);
      setResolved(resolvedCount);
      setTotal(data.length);
    } catch (error) {
      console.log('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0d6efd" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HERO */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Dashboard</Text>
        <Text style={styles.heroSubtitle}>
          Track your emergency activity and request status in real time.
        </Text>
      </View>

      {/* TOTAL CARD */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Requests</Text>
        <Text style={styles.totalValue}>{total}</Text>
      </View>

      {/* STATUS CARDS */}
      <View style={styles.grid}>
        <View style={[styles.card, styles.pendingCard]}>
          <Text style={styles.count}>{pending}</Text>
          <Text style={styles.label}>Pending</Text>
        </View>

        <View style={[styles.card, styles.progressCard]}>
          <Text style={styles.count}>{progress}</Text>
          <Text style={styles.label}>In Progress</Text>
        </View>

        <View style={[styles.card, styles.resolvedCard]}>
          <Text style={styles.count}>{resolved}</Text>
          <Text style={styles.label}>Resolved</Text>
        </View>
      </View>

      {/* ANALYTICS SECTION */}
      <View style={styles.analyticsCard}>
        <Text style={styles.analyticsTitle}>Insights</Text>

        <Text style={styles.analyticsText}>
          • Most of your requests are currently {pending > progress ? 'Pending' : 'In Progress'}.
        </Text>

        <Text style={styles.analyticsText}>
          • Your resolution rate is{' '}
          {total > 0 ? Math.round((resolved / total) * 100) : 0}%.
        </Text>

        <Text style={styles.analyticsText}>
          • Stay alert and monitor your active emergencies.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
    paddingBottom: 100,
  },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 2,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 6,
    color: '#111827',
  },

  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },

  card: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#fff3cd',
  },
  progressCard: {
    backgroundColor: '#d9ecff',
  },
  resolvedCard: {
    backgroundColor: '#dff5e3',
  },

  count: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    marginTop: 6,
    color: '#374151',
    fontWeight: '600',
  },

  analyticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    elevation: 2,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  analyticsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
});