import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading((prev) => (emergencies.length === 0 ? true : prev));

      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setEmergencies([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setPreviousEmergencies(emergencies);
        setEmergencies(data);
      } else {
        console.log('History API response:', data);
        setEmergencies([]);
      }
    } catch (error) {
      console.log('History Error:', error);
      setEmergencies([]);
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
    if (s === 'in progress') return '#0d6efd';
    if (s === 'resolved') return '#198754';
    if (s === 'cancelled') return '#dc3545';
    return '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#6c757d';
    if (p === 'medium') return '#0d6efd';
    if (p === 'high') return '#fd7e14';
    if (p === 'critical') return '#dc3545';
    return '#6b7280';
  };

  const isStatusChanged = (item) => {
    const oldItem = previousEmergencies.find((e) => e.id === item.id);
    if (!oldItem) return false;
    return String(oldItem.status || '').toLowerCase() !== String(item.status || '').toLowerCase();
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const renderItem = ({ item }) => {
    const changed = isStatusChanged(item);
    const statusColor = getStatusColor(item?.status);
    const priorityColor = getPriorityColor(item?.priority);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          changed && styles.updatedCard,
          String(item?.priority || '').toLowerCase() === 'critical' && styles.criticalCard,
        ]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.type}>{String(item?.type || '').toUpperCase()}</Text>

          <Text style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            {String(item?.priority || 'medium').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.description}>{item?.description || 'No description'}</Text>
        <Text style={styles.location}>{item?.location_text || 'No location available'}</Text>

        <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>
          {String(item?.status || 'unknown').toUpperCase()}
        </Text>

        {item?.accepted_by ? (
          <Text style={styles.acceptedBy}>Assigned: {item.accepted_by}</Text>
        ) : (
          <Text style={styles.acceptedByPending}>Assigned: Not assigned yet</Text>
        )}

        {changed ? <Text style={styles.updatedText}>Updated recently</Text> : null}

        <Text style={styles.linkText}>Tap to view details</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Emergency History</Text>
        <Text style={styles.heroSubtitle}>
          Track your past requests, progress, and final status updates.
        </Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description, location, provider, priority"
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filterOptions}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedStatus === item.key && styles.activeFilterChip,
            ]}
            onPress={() => setSelectedStatus(item.key)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === item.key && styles.activeFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredEmergencies}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          renderItem={renderItem}
          onRefresh={fetchHistory}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredEmergencies.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No emergency history found</Text>
              <Text style={styles.emptySubtitle}>
                Your past requests will appear here after you create them.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f5f7',
    padding: 18,
  },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
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

  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },

  filterContainer: {
    paddingBottom: 8,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#0d6efd',
  },
  filterText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterText: {
    color: '#fff',
  },

  listContainer: {
    paddingBottom: 100,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  updatedCard: {
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  criticalCard: {
    borderWidth: 2,
    borderColor: '#dc3545',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d6efd',
  },
  priorityBadge: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 'bold',
  },

  description: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  location: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 10,
  },

  acceptedBy: {
    color: '#6f42c1',
    fontSize: 13,
    fontWeight: '600',
  },
  acceptedByPending: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },

  updatedText: {
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 10,
    fontSize: 13,
  },

  linkText: {
    marginTop: 12,
    color: '#0d6efd',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
});