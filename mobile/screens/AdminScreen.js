import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [emergencies, setEmergencies] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAllEmergencies();
  }, []);

  const fetchAllEmergencies = async () => {
    try {
      setLoading(true);

      const userId = await AsyncStorage.getItem('userId');
      const userRole = await AsyncStorage.getItem('userRole');

      if (!userId) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      if (userRole !== 'admin') {
        Alert.alert('Access Denied', 'Only admin can access this panel');
        return;
      }

      const response = await fetch('http://localhost:8000/admin/emergencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId, 10) }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      setEmergencies(data);
    } catch (error) {
      console.log('Admin Fetch Error:', error);
      Alert.alert('Error', 'Failed to load emergencies');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:8000/emergency/${id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      Alert.alert('Success', `Status updated to ${newStatus}`);
      fetchAllEmergencies();
    } catch (error) {
      console.log('Update Status Error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const confirmUpdate = (id, status) => {
    Alert.alert(
      'Confirm Update',
      `Change status to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => updateStatus(id, status),
        },
      ]
    );
  };

  const filteredEmergencies =
    filter === 'all'
      ? emergencies
      : emergencies.filter((item) => item.status === filter);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.pending;
      case 'in_progress':
        return styles.progress;
      case 'resolved':
        return styles.resolved;
      default:
        return {};
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.type}>{item.type.toUpperCase()}</Text>
      <Text style={styles.text}>Description: {item.description}</Text>
      <Text style={styles.text}>Location: {item.location_text}</Text>
      <Text style={styles.text}>User ID: {item.user_id}</Text>

      <Text style={[styles.status, getStatusStyle(item.status)]}>
        Status: {item.status}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.btnPending}
          onPress={() => confirmUpdate(item.id, 'pending')}
        >
          <Text style={styles.btnText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnProgress}
          onPress={() => confirmUpdate(item.id, 'in_progress')}
        >
          <Text style={styles.btnText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnResolved}
          onPress={() => confirmUpdate(item.id, 'resolved')}
        >
          <Text style={styles.btnText}>Resolved</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛠️ Admin Panel</Text>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
          onPress={() => setFilter('pending')}
        >
          <Text style={styles.filterText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'in_progress' && styles.activeFilter]}
          onPress={() => setFilter('in_progress')}
        >
          <Text style={styles.filterText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.activeFilter]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={styles.filterText}>Resolved</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.refresh} onPress={fetchAllEmergencies}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredEmergencies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No emergencies found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f8' },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'center',
  },
  filterButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  activeFilter: {
    backgroundColor: '#007bff',
  },
  filterText: {
    color: '#111',
    fontWeight: '600',
  },
  refresh: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pending: {
    color: '#e0a800',
  },
  progress: {
    color: '#17a2b8',
  },
  resolved: {
    color: '#28a745',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  btnPending: {
    backgroundColor: '#f39c12',
    padding: 8,
    borderRadius: 8,
  },
  btnProgress: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 8,
  },
  btnResolved: {
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontSize: 16,
  },
});