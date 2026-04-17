import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';

export default function AdminScreen({ navigation, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchAdminRequests = async () => {
    try {
      setLoading((prev) => (requests.length === 0 ? true : prev));

      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setRequests([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/emergencies/${userId}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        console.log('Admin API response:', data);
        setRequests([]);
      }
    } catch (error) {
      console.log('Admin fetch error:', error);
      setRequests([]);
      Alert.alert('Error', 'Failed to load admin requests');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdminRequests();

      clearPolling();
      intervalRef.current = setInterval(() => {
        fetchAdminRequests();
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
      console.log('Admin Logout Error:', error);
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return '#d4a017';
    if (s === 'in progress') return '#007bff';
    if (s === 'resolved') return '#28a745';
    return '#666';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
    >
      <Text style={styles.type}>{String(item?.type || '').toUpperCase()}</Text>
      <Text style={styles.description}>{item?.description || 'No description'}</Text>
      <Text style={styles.location}>{item?.location_text || 'No location available'}</Text>
      <Text style={[styles.status, { color: getStatusColor(item?.status) }]}>
        {String(item?.status || 'unknown').toUpperCase()}
      </Text>
      <Text style={styles.linkText}>Tap to manage request</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.mapButtonText}>📍 Live Map</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={renderItem}
          onRefresh={fetchAdminRequests}
          refreshing={loading}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No requests found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  mapButton: {
    backgroundColor: '#007bff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#ff0f47',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  description: {
    fontSize: 17,
    color: '#222',
    marginBottom: 6,
    fontWeight: '500',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  linkText: {
    fontSize: 14,
    color: '#e63946',
    fontWeight: '600',
  },
});