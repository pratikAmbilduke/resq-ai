import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';

export default function HistoryScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([]);
  const [previousEmergencies, setPreviousEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const intervalRef = useRef(null);
  const emergenciesRef = useRef([]);

  useEffect(() => {
    emergenciesRef.current = emergencies;
  }, [emergencies]);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setEmergencies([]);
        setPreviousEmergencies([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setPreviousEmergencies(emergenciesRef.current);
        setEmergencies(data);
      } else {
        console.log('History API response:', data);
        setPreviousEmergencies(emergenciesRef.current);
        setEmergencies([]);
      }
    } catch (error) {
      console.log('History Error:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();

      clearPolling();
      intervalRef.current = setInterval(() => {
        fetchHistory();
      }, 4000);

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

  const filteredEmergencies = useMemo(() => {
    const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];
    const query = search.trim().toLowerCase();

    return safeEmergencies.filter((item) => {
      const type = String(item?.type || '').toLowerCase();
      const description = String(item?.description || '').toLowerCase();
      const location = String(item?.location_text || '').toLowerCase();
      const status = String(item?.status || '').toLowerCase();
      const acceptedBy = String(item?.accepted_by || '').toLowerCase();
      const priority = String(item?.priority || '').toLowerCase();

      const matchesSearch =
        !query ||
        type.includes(query) ||
        description.includes(query) ||
        location.includes(query) ||
        acceptedBy.includes(query) ||
        priority.includes(query);

      const matchesStatus =
        selectedStatus === 'all' || status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [emergencies, search, selectedStatus]);

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return '#d4a017';
    if (s === 'accepted') return '#6f42c1';
    if (s === 'in progress') return '#007bff';
    if (s === 'resolved') return '#28a745';
    if (s === 'cancelled') return '#dc3545';
    return '#666';
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#6c757d';
    if (p === 'medium') return '#0d6efd';
    if (p === 'high') return '#fd7e14';
    if (p === 'critical') return '#dc3545';
    return '#666';
  };

  const isStatusChanged = (item) => {
    const oldItem = previousEmergencies.find((e) => e.id === item.id);
    if (!oldItem) return false;

    return (
      String(oldItem.status || '').toLowerCase() !==
      String(item.status || '').toLowerCase()
    );
  };

  const renderItem = ({ item }) => {
    const changed = isStatusChanged(item);

    return (
      <TouchableOpacity
        style={[styles.card, changed && styles.highlightCard]}
        onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
      >
        <Text style={styles.type}>{String(item?.type || '').toUpperCase()}</Text>
        <Text style={styles.description}>{item?.description || 'No description'}</Text>
        <Text style={styles.location}>{item?.location_text || 'No location available'}</Text>

        <Text style={[styles.status, { color: getStatusColor(item?.status) }]}>
          {String(item?.status || 'unknown').toUpperCase()}
        </Text>

        <Text style={[styles.priorityText, { color: getPriorityColor(item?.priority) }]}>
          PRIORITY: {String(item?.priority || 'medium').toUpperCase()}
        </Text>

        {item?.accepted_by ? (
          <Text style={styles.acceptedBy}>Accepted By: {item.accepted_by}</Text>
        ) : (
          <Text style={styles.acceptedByPending}>Accepted By: Not assigned yet</Text>
        )}

        {changed && <Text style={styles.updatedText}>🔄 Updated</Text>}

        <Text style={styles.linkText}>Tap to view details and map</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 My Emergency History</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description, location, provider or priority"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'all' && styles.activeFilter]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.filterText, selectedStatus === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'pending' && styles.activeFilter]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text style={[styles.filterText, selectedStatus === 'pending' && styles.activeFilterText]}>
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'accepted' && styles.activeFilter]}
          onPress={() => setSelectedStatus('accepted')}
        >
          <Text style={[styles.filterText, selectedStatus === 'accepted' && styles.activeFilterText]}>
            Accepted
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'in progress' && styles.activeFilter]}
          onPress={() => setSelectedStatus('in progress')}
        >
          <Text style={[styles.filterText, selectedStatus === 'in progress' && styles.activeFilterText]}>
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'resolved' && styles.activeFilter]}
          onPress={() => setSelectedStatus('resolved')}
        >
          <Text style={[styles.filterText, selectedStatus === 'resolved' && styles.activeFilterText]}>
            Resolved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'cancelled' && styles.activeFilter]}
          onPress={() => setSelectedStatus('cancelled')}
        >
          <Text style={[styles.filterText, selectedStatus === 'cancelled' && styles.activeFilterText]}>
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredEmergencies}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={renderItem}
          onRefresh={fetchHistory}
          refreshing={false}
          contentContainerStyle={
            filteredEmergencies.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No emergency history found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#222',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  activeFilter: {
    backgroundColor: '#007bff',
  },
  filterText: {
    color: '#222',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  highlightCard: {
    borderWidth: 2,
    borderColor: '#ff9800',
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  description: {
    fontSize: 18,
    color: '#222',
    marginBottom: 6,
    fontWeight: '500',
  },
  location: {
    fontSize: 15,
    color: '#666',
    marginBottom: 10,
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  acceptedBy: {
    fontSize: 14,
    color: '#6f42c1',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  acceptedByPending: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  updatedText: {
    color: '#ff9800',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 15,
    color: '#e63946',
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});