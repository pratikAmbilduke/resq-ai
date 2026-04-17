import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';

export default function AdminScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const [totalRequests, setTotalRequests] = useState(0);

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const loadAdminData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/emergencies/${userId}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.log('Admin API response:', data);
        setLoading(false);
        return;
      }

      const pending = data.filter(
        (item) => String(item?.status).toLowerCase() === 'pending'
      ).length;

      const accepted = data.filter(
        (item) => String(item?.status).toLowerCase() === 'accepted'
      ).length;

      const progress = data.filter(
        (item) => String(item?.status).toLowerCase() === 'in progress'
      ).length;

      const resolved = data.filter(
        (item) => String(item?.status).toLowerCase() === 'resolved'
      ).length;

      setPendingCount(pending);
      setAcceptedCount(accepted);
      setProgressCount(progress);
      setResolvedCount(resolved);
      setTotalRequests(data.length);
    } catch (error) {
      console.log('Admin load error:', error);
      Alert.alert('Error', 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdminData();

      clearPolling();
      intervalRef.current = setInterval(() => {
        loadAdminData();
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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🛠 Admin Dashboard</Text>

      {/* TOTAL */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Requests</Text>
        <Text style={styles.totalValue}>{totalRequests}</Text>
      </View>

      {/* STATUS CARDS */}
      <View style={styles.grid}>
        <View style={[styles.card, styles.pending]}>
          <Text style={styles.count}>{pendingCount}</Text>
          <Text style={styles.label}>Pending</Text>
        </View>

        <View style={[styles.card, styles.accepted]}>
          <Text style={styles.count}>{acceptedCount}</Text>
          <Text style={styles.label}>Accepted</Text>
        </View>

        <View style={[styles.card, styles.progress]}>
          <Text style={styles.count}>{progressCount}</Text>
          <Text style={styles.label}>In Progress</Text>
        </View>

        <View style={[styles.card, styles.resolved]}>
          <Text style={styles.count}>{resolvedCount}</Text>
          <Text style={styles.label}>Resolved</Text>
        </View>
      </View>

      {/* ACTION BUTTONS */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>📜 View All Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.buttonText}>🗺 Open Live Map</Text>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 3,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
  },

  pending: {
    backgroundColor: '#efe4b8',
  },
  accepted: {
    backgroundColor: '#e0ccff',
  },
  progress: {
    backgroundColor: '#bddbe2',
  },
  resolved: {
    backgroundColor: '#c8dfcb',
  },

  count: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    marginTop: 5,
  },

  button: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});