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

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'my-assigned', label: 'My Assigned' },
  ];

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0d6efd" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Admin Operations</Text>
        <Text style={styles.heroSubtitle}>
          Monitor emergencies, manage priorities, and handle requests quickly.
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.totalSummary]}>
          <Text style={styles.summaryCount}>{totalRequests}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={[styles.summaryCard, styles.pendingSummary]}>
          <Text style={styles.summaryCount}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>

        <View style={[styles.summaryCard, styles.acceptedSummary]}>
          <Text style={styles.summaryCount}>{acceptedCount}</Text>
          <Text style={styles.summaryLabel}>Accepted</Text>
        </View>

        <View style={[styles.summaryCard, styles.progressSummary]}>
          <Text style={styles.summaryCount}>{progressCount}</Text>
          <Text style={styles.summaryLabel}>Progress</Text>
        </View>

        <View style={[styles.summaryCard, styles.resolvedSummary]}>
          <Text style={styles.summaryCount}>{resolvedCount}</Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => navigation.navigate('AdminMapTab')}
      >
        <Text style={styles.mapButtonText}>📍 Open Live Map</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Request Management</Text>
        <Text style={styles.sectionSubtext}>Search, filter, prioritize, and delete requests</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description, location, provider, priority"
        placeholderTextColor="#9ca3af"
        value={searchText}
        onChangeText={setSearchText}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.activeFilterChip,
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter.key && styles.activeFilterChipText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptySubtitle}>
            Try changing filters or search keywords.
          </Text>
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
              activeOpacity={0.9}
              onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.requestType}>
                  {String(item?.type || '').toUpperCase()}
                </Text>

                <Text
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(item?.priority) },
                  ]}
                >
                  {String(item?.priority || 'medium').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.requestDescription}>
                {item?.description || 'No description'}
              </Text>

              <Text style={styles.requestLocation}>
                {item?.location_text || 'No location available'}
              </Text>

              <View style={styles.metaRow}>
                <Text
                  style={[
                    styles.statusBadge,
                    { color: getStatusColor(item?.status), borderColor: getStatusColor(item?.status) },
                  ]}
                >
                  {String(item?.status || 'unknown').toUpperCase()}
                </Text>

                {item?.accepted_by ? (
                  <Text style={styles.acceptedByText}>
                    Assigned: {item.accepted_by}
                  </Text>
                ) : (
                  <Text style={styles.notAssignedText}>Not assigned</Text>
                )}
              </View>

              <Text style={styles.viewDetailsText}>Tap to view details</Text>
            </TouchableOpacity>

            <Text style={styles.actionSectionTitle}>Set Priority</Text>

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
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
    paddingBottom: 100,
  },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
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

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  totalSummary: {
    backgroundColor: '#e8f1ff',
  },
  pendingSummary: {
    backgroundColor: '#fff3cd',
  },
  acceptedSummary: {
    backgroundColor: '#efe7ff',
  },
  progressSummary: {
    backgroundColor: '#d9ecff',
  },
  resolvedSummary: {
    backgroundColor: '#dff5e3',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginTop: 6,
  },

  mapButton: {
    backgroundColor: '#0d6efd',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },

  filterScroll: {
    paddingBottom: 4,
    marginBottom: 16,
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
  filterChipText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterChipText: {
    color: '#fff',
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
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },

  requestCard: {
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
  criticalCard: {
    borderWidth: 2,
    borderColor: '#dc3545',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestType: {
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

  requestDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  requestLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  acceptedByText: {
    color: '#6f42c1',
    fontSize: 13,
    fontWeight: '600',
  },
  notAssignedText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },

  viewDetailsText: {
    marginTop: 12,
    color: '#0d6efd',
    fontWeight: '700',
    fontSize: 13,
  },

  actionSectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },

  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  priorityButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  lowButton: {
    backgroundColor: '#6c757d',
  },
  medium