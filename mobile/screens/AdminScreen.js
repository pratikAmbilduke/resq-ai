import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../config';

export default function AdminScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [adminUserId, setAdminUserId] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const calculateCounts = (data) => {
    const pending = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'pending'
    ).length;

    const accepted = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'accepted'
    ).length;

    const progress = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'in progress'
    ).length;

    const resolved = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'resolved'
    ).length;

    setPendingCount(pending);
    setAcceptedCount(accepted);
    setProgressCount(progress);
    setResolvedCount(resolved);
    setTotalRequests(data.length);
  };

  const loadAdminData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');

      setAdminName(storedName || '');
      setAdminUserId(userId || '');

      if (!userId) {
        setLoading(false);
        setRequests([]);
        calculateCounts([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/emergencies/${userId}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.log('Admin API response:', data);
        setRequests([]);
        calculateCounts([]);
        setLoading(false);
        return;
      }

      setRequests(data);
      calculateCounts(data);
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

  const priorityOrder = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const result = requests.filter((item) => {
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

      let matchesFilter = true;

      if (selectedFilter === 'pending') {
        matchesFilter = status === 'pending';
      } else if (selectedFilter === 'accepted') {
        matchesFilter = status === 'accepted';
      } else if (selectedFilter === 'in progress') {
        matchesFilter = status === 'in progress';
      } else if (selectedFilter === 'resolved') {
        matchesFilter = status === 'resolved';
      } else if (selectedFilter === 'cancelled') {
        matchesFilter = status === 'cancelled';
      } else if (selectedFilter === 'my-assigned') {
        matchesFilter =
          !!adminName &&
          acceptedBy === String(adminName).trim().toLowerCase();
      }

      return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
      const priorityA = priorityOrder[String(a?.priority || 'medium').toLowerCase()] || 0;
      const priorityB = priorityOrder[String(b?.priority || 'medium').toLowerCase()] || 0;

      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [requests, searchText, selectedFilter, adminName]);

  const handleDeleteRequest = async (emergencyId) => {
    try {
      if (!adminUserId) {
        Alert.alert('Error', 'Admin user not found');
        return;
      }

      Alert.alert(
        'Delete Request',
        'Are you sure you want to permanently delete this request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/admin/emergency/${emergencyId}/${adminUserId}`,
                  {
                    method: 'DELETE',
                  }
                );

                const data = await response.json();

                if (data.error) {
                  Alert.alert('Error', data.error);
                  return;
                }

                const updatedRequests = requests.filter((item) => item.id !== emergencyId);
                setRequests(updatedRequests);
                calculateCounts(updatedRequests);

                Alert.alert('Success', 'Request deleted successfully');
                loadAdminData();
              } catch (error) {
                console.log('Delete request error:', error);
                Alert.alert('Error', 'Failed to delete request');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.log('Delete alert error:', error);
    }
  };

  const handleSetPriority = async (emergencyId, priority) => {
    try {
      if (!adminUserId) {
        Alert.alert('Error', 'Admin user not found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/emergency/${emergencyId}/priority/${adminUserId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ priority }),
        }
      );

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      const updatedRequests = requests.map((item) =>
        item.id === emergencyId ? { ...item, priority } : item
      );

      setRequests(updatedRequests);
      calculateCounts(updatedRequests);

      Alert.alert('Success', `Priority updated to ${priority}`);
      loadAdminData();
    } catch (error) {
      console.log('Priority update error:', error);
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🛠 Admin Panel</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Requests</Text>
        <Text style={styles.totalValue}>{totalRequests}</Text>
      </View>

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

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.buttonText}>🗺 Open Live Map</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>All Requests</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description, location, provider, priority"
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.filterContainer}>
        {['all', 'pending', 'accepted', 'in progress', 'resolved', 'cancelled', 'my-assigned'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, selectedFilter === filter && styles.activeFilter]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.activeFilterText]}>
              {filter === 'my-assigned'
                ? 'My Assigned'
                : filter === 'in progress'
                ? 'In Progress'
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No requests found</Text>
        </View>
      ) : (
        filteredRequests.map((item, index) => (
          <View
            key={String(item?.id ?? index)}
            style={[
              styles.requestCard,
              String(item?.priority || '').toLowerCase() === 'critical' && styles.criticalCard,
            ]}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
            >
              <Text style={styles.requestType}>
                {String(item?.type || '').toUpperCase()}
              </Text>

              <Text style={styles.requestDescription}>
                {item?.description || 'No description'}
              </Text>

              <Text style={styles.requestLocation}>
                {item?.location_text || 'No location available'}
              </Text>

              <Text
                style={[
                  styles.requestStatus,
                  { color: getStatusColor(item?.status) },
                ]}
              >
                {String(item?.status || 'unknown').toUpperCase()}
              </Text>

              <Text
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item?.priority) },
                ]}
              >
                {String(item?.priority || 'medium').toUpperCase()}
              </Text>

              {item?.accepted_by ? (
                <Text style={styles.acceptedBy}>
                  Accepted By: {item.accepted_by}
                </Text>
              ) : (
                <Text style={styles.notAssigned}>Accepted By: Not assigned yet</Text>
              )}

              <Text style={styles.tapText}>Tap to manage request</Text>
            </TouchableOpacity>

            <View style={styles.priorityRow}>
              <TouchableOpacity
                style={[styles.priorityButton, styles.lowButton]}
                onPress={() => handleSetPriority(item.id, 'low')}
              >
                <Text style={styles.priorityButtonText}>Low</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.priorityButton, styles.mediumButton]}
                onPress={() => handleSetPriority(item.id, 'medium')}
              >
                <Text style={styles.priorityButtonText}>Medium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.priorityButton, styles.highButton]}
                onPress={() => handleSetPriority(item.id, 'high')}
              >
                <Text style={styles.priorityButtonText}>High</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.priorityButton, styles.criticalButton]}
                onPress={() => handleSetPriority(item.id, 'critical')}
              >
                <Text style={styles.priorityButtonText}>Critical</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteRequest(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete Request</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
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
    marginTop: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 14,
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  criticalCard: {
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  requestType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 17,
    color: '#222',
    marginBottom: 6,
    fontWeight: '500',
  },
  requestLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  requestStatus: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  acceptedBy: {
    fontSize: 14,
    color: '#6f42c1',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notAssigned: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  tapText: {
    fontSize: 14,
    color: '#e63946',
    fontWeight: '600',
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lowButton: {
    backgroundColor: '#6c757d',
  },
  mediumButton: {
    backgroundColor: '#0d6efd',
  },
  highButton: {
    backgroundColor: '#fd7e14',
  },
  criticalButton: {
    backgroundColor: '#dc3545',
  },
  priorityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});