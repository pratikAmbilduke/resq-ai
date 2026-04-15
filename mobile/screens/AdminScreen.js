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

      const response = await fetch('http://localhost:8000/admin/emergencies');
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
      <Text>Description: {item.description}</Text>
      <Text>Location: {item.location_text}</Text>

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

      <FlatList
        data={filteredEmergencies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />

      <TouchableOpacity style={styles.refresh} onPress={fetchAllEmergencies}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  type: { fontWeight: 'bold', fontSize: 16 },
  status: { marginTop: 5, fontWeight: 'bold' },

  pending: { color: '#f39c12' },
  progress: { color: '#3498db' },
  resolved: { color: '#2ecc71' },

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

  refresh: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});