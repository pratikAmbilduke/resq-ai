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
  Modal,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupRequest, setPopupRequest] = useState(null);

  const intervalRef = useRef(null);
  const firstLoadDoneRef = useRef(false);
  const latestSeenRequestIdRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(420)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

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

  const openPopup = (requestItem) => {
    setPopupRequest(requestItem);
    setPopupVisible(true);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closePopup = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 420,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPopupVisible(false);
      setPopupRequest(null);
    });
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

      const sortedData = [...data].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

      setRequests(sortedData);
      calculateCounts(sortedData);

      const newestRequest = sortedData[0] || null;
      const newestRequestId = newestRequest ? Number(newestRequest.id || 0) : null;

      if (!firstLoadDoneRef.current) {
        latestSeenRequestIdRef.current = newestRequestId;
        firstLoadDoneRef.current = true;
      } else if (
        newestRequest &&
        newestRequestId &&
        latestSeenRequestIdRef.current &&
        newestRequestId > latestSeenRequestIdRef.current &&
        String(newestRequest?.status || '').toLowerCase() === 'pending'
      ) {
        latestSeenRequestIdRef.current = newestRequestId;
        openPopup(newestRequest);
      } else if (
        newestRequestId &&
        (!latestSeenRequestIdRef.current || newestRequestId > latestSeenRequestIdRef.current)
      ) {
        latestSeenRequestIdRef.current = newestRequestId;
      }
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
    if (s === 'pending') return '#d97706';
    if (s === 'accepted') return '#7c3aed';
    if (s === 'in progress') return '#2563eb';
    if (s === 'resolved') return '#16a34a';
    if (s === 'cancelled') return '#dc2626';
    return '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#6b7280';
    if (p === 'medium') return '#2563eb';
    if (p === 'high') return '#ea580c';
    if (p === 'critical') return '#dc2626';
    return '#6b7280';
  };

  const getPriorityBackground = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#e5e7eb';
    if (p === 'medium') return '#dbeafe';
    if (p === 'high') return '#ffedd5';
    if (p === 'critical') return '#fee2e2';
    return '#e5e7eb';
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

  const handleAcceptRequest = async (requestItem) => {
    try {
      if (!requestItem?.id) {
        Alert.alert('Error', 'Invalid request');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/emergency/${requestItem.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'accepted',
            accepted_by: adminName || 'Admin',
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      Alert.alert('Success', 'Request accepted successfully');
      closePopup();
      loadAdminData();
    } catch (error) {
      console.log('Accept request error:', error);
      Alert.alert('Error', 'Failed to accept request');
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
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: '#f3f5f7' }}
        size="large"
        color="#0d6efd"
      />
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#111827', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Admin Operations</Text>
          <Text style={styles.heroSubtitle}>
            Monitor new requests, manage priorities, and respond quickly.
          </Text>
        </LinearGradient>

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
          activeOpacity={0.9}
        >
          <Text style={styles.mapButtonText}>📍 Open Live Map</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Request Management</Text>
          <Text style={styles.sectionSubtext}>
            Search, filter, prioritize, and manage requests
          </Text>
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
                    {String(item?.type || 'Emergency').toUpperCase()}
                  </Text>

                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityBackground(item?.priority) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        { color: getPriorityColor(item?.priority) },
                      ]}
                    >
                      {String(item?.priority || 'medium').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestDescription}>
                  {item?.description || 'No description'}
                </Text>

                <Text style={styles.requestLocation}>
                  📍 {item?.location_text || 'No location available'}
                </Text>

                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor: getStatusColor(item?.status),
                        backgroundColor: '#fff',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(item?.status) },
                      ]}
                    >
                      {String(item?.status || 'unknown').toUpperCase()}
                    </Text>
                  </View>

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

      <Modal
        visible={popupVisible}
        transparent
        animationType="none"
        onRequestClose={closePopup}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: overlayAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={closePopup}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.popupSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#ff416c', '#ff4b2b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.popupHeader}
          >
            <Text style={styles.popupHeaderTitle}>🚨 New Emergency Request</Text>
            <Text style={styles.popupHeaderSubtitle}>
              A new user request needs your attention
            </Text>
          </LinearGradient>

          {popupRequest ? (
            <View style={styles.popupContent}>
              <View style={styles.popupTopRow}>
                <Text style={styles.popupType}>
                  {String(popupRequest?.type || 'Emergency').toUpperCase()}
                </Text>

                <View
                  style={[
                    styles.popupPriorityBadge,
                    { backgroundColor: getPriorityBackground(popupRequest?.priority) },
                  ]}
                >
                  <Text
                    style={[
                      styles.popupPriorityText,
                      { color: getPriorityColor(popupRequest?.priority) },
                    ]}
                  >
                    {String(popupRequest?.priority || 'medium').toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.popupDescription}>
                {popupRequest?.description || 'No description available'}
              </Text>

              <Text style={styles.popupLocation}>
                📍 {popupRequest?.location_text || 'Location not available'}
              </Text>

              <View style={styles.popupStatusWrap}>
                <View
                  style={[
                    styles.popupStatusBadge,
                    { borderColor: getStatusColor(popupRequest?.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.popupStatusText,
                      { color: getStatusColor(popupRequest?.status) },
                    ]}
                  >
                    {String(popupRequest?.status || 'pending').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.popupButtonRow}>
                <TouchableOpacity
                  style={[styles.popupActionButton, styles.popupDismissButton]}
                  onPress={closePopup}
                  activeOpacity={0.9}
                >
                  <Text style={styles.popupDismissText}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupActionButton, styles.popupViewButton]}
                  onPress={() => {
                    const selected = popupRequest;
                    closePopup();
                    setTimeout(() => {
                      navigation.navigate('EmergencyDetails', { emergency: selected });
                    }, 220);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.popupViewText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupActionButton, styles.popupAcceptButton]}
                  onPress={() => handleAcceptRequest(popupRequest)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.popupAcceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
    paddingBottom: 110,
  },

  heroCard: {
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
    alignItems: 'center',
  },
  totalSummary: {
    backgroundColor: '#ede9fe',
  },
  pendingSummary: {
    backgroundColor: '#fef3c7',
  },
  acceptedSummary: {
    backgroundColor: '#fce7f3',
  },
  progressSummary: {
    backgroundColor: '#dbeafe',
  },
  resolvedSummary: {
    backgroundColor: '#dcfce7',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
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
    borderColor: '#dc2626',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestType: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d6efd',
    paddingRight: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  requestDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    lineHeight: 24,
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
    marginBottom: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptedByText: {
    color: '#7c3aed',
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
    marginBottom: 14,
  },
  priorityButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  lowButton: {
    backgroundColor: '#e5e7eb',
  },
  mediumButton: {
    backgroundColor: '#dbeafe',
  },
  highButton: {
    backgroundColor: '#ffedd5',
  },
  criticalButton: {
    backgroundColor: '#fee2e2',
  },
  priorityButtonText: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 13,
  },

  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  overlayTouch: {
    flex: 1,
  },

  popupSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  popupHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  popupHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  popupHeaderSubtitle: {
    color: '#ffe4e6',
    fontSize: 13,
    marginTop: 6,
  },

  popupContent: {
    padding: 20,
    paddingBottom: 28,
  },
  popupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupType: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    paddingRight: 10,
  },
  popupPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  popupPriorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  popupDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
    lineHeight: 24,
  },
  popupLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },
  popupStatusWrap: {
    marginTop: 14,
  },
  popupStatusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popupStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  popupButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  popupActionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  popupDismissButton: {
    backgroundColor: '#e5e7eb',
  },
  popupViewButton: {
    backgroundColor: '#dbeafe',
  },
  popupAcceptButton: {
    backgroundColor: '#22c55e',
  },
  popupDismissText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 14,
  },
  popupViewText: {
    color: '#1d4ed8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  popupAcceptText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});