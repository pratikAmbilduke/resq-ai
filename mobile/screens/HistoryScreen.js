import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function HistoryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const loadHistory = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const sortedData = [...data].sort(
        (a, b) => Number(b?.id || 0) - Number(a?.id || 0)
      );

      setRequests(sortedData);
    } catch (error) {
      console.log('History load error:', error);
      Alert.alert('Error', 'Failed to load history');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();

      clearPolling();
      intervalRef.current = setInterval(() => {
        loadHistory();
      }, 5000);

      return () => {
        clearPolling();
      };
    }, [])
  );

  const counts = useMemo(() => {
    const pending = requests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'pending'
    ).length;

    const progress = requests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'in progress'
    ).length;

    const resolved = requests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'resolved'
    ).length;

    const cancelled = requests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'cancelled'
    ).length;

    return {
      total: requests.length,
      pending,
      progress,
      resolved,
      cancelled,
    };
  }, [requests]);

  const getStatusColors = (status) => {
    const value = String(status || '').toLowerCase();

    if (value === 'pending') {
      return {
        bg: '#FEF3C7',
        text: '#B45309',
      };
    }

    if (value === 'in progress') {
      return {
        bg: '#DBEAFE',
        text: '#1D4ED8',
      };
    }

    if (value === 'resolved') {
      return {
        bg: '#DCFCE7',
        text: '#15803D',
      };
    }

    if (value === 'cancelled') {
      return {
        bg: '#FEE2E2',
        text: '#B91C1C',
      };
    }

    return {
      bg: '#E5E7EB',
      text: '#374151',
    };
  };

  const getPriorityColors = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'critical') {
      return {
        bg: '#FEE2E2',
        text: '#B91C1C',
      };
    }

    if (value === 'high') {
      return {
        bg: '#FFEDD5',
        text: '#C2410C',
      };
    }

    if (value === 'medium') {
      return {
        bg: '#DBEAFE',
        text: '#1D4ED8',
      };
    }

    return {
      bg: '#E5E7EB',
      text: '#374151',
    };
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return requests.filter((item) => {
      const type = String(item?.type || '').toLowerCase();
      const description = String(item?.description || '').toLowerCase();
      const location = String(item?.location_text || '').toLowerCase();
      const status = String(item?.status || '').toLowerCase();
      const priority = String(item?.priority || '').toLowerCase();

      const matchesSearch =
        !query ||
        type.includes(query) ||
        description.includes(query) ||
        location.includes(query) ||
        status.includes(query) ||
        priority.includes(query);

      let matchesFilter = true;

      if (selectedFilter === 'pending') {
        matchesFilter = status === 'pending';
      } else if (selectedFilter === 'in progress') {
        matchesFilter = status === 'in progress';
      } else if (selectedFilter === 'resolved') {
        matchesFilter = status === 'resolved';
      } else if (selectedFilter === 'cancelled') {
        matchesFilter = status === 'cancelled';
      }

      return matchesSearch && matchesFilter;
    });
  }, [requests, searchText, selectedFilter]);

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
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={['#10b981', '#0d6efd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Emergency History</Text>
        <Text style={styles.heroSubtitle}>
          Track all your past requests and monitor their final status.
        </Text>
      </LinearGradient>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <Text style={styles.summaryCount}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={[styles.summaryCard, styles.pendingCard]}>
          <Text style={styles.summaryCount}>{counts.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.progressCard]}>
          <Text style={styles.summaryCount}>{counts.progress}</Text>
          <Text style={styles.summaryLabel}>Progress</Text>
        </View>

        <View style={[styles.summaryCard, styles.resolvedCard]}>
          <Text style={styles.summaryCount}>{counts.resolved}</Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.sectionTitle}>Search Requests</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by type, description, location, status"
          placeholderTextColor="#9ca3af"
          value={searchText}
          onChangeText={setSearchText}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'pending' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('pending')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'pending' && styles.filterChipTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'in progress' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('in progress')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'in progress' && styles.filterChipTextActive,
              ]}
            >
              Progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'resolved' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('resolved')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'resolved' && styles.filterChipTextActive,
              ]}
            >
              Resolved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'cancelled' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('cancelled')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'cancelled' && styles.filterChipTextActive,
              ]}
            >
              Cancelled
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Text style={styles.sectionTitle}>All Requests</Text>

      {filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptySubtitle}>
            Try changing your search or filter.
          </Text>
        </View>
      ) : (
        filteredRequests.map((item, index) => {
          const statusColors = getStatusColors(item?.status);
          const priorityColors = getPriorityColors(item?.priority);

          return (
            <TouchableOpacity
              key={String(item?.id ?? index)}
              activeOpacity={0.92}
              onPress={() =>
                navigation.navigate('EmergencyDetails', { emergency: item })
              }
              style={styles.requestWrap}
            >
              <View style={styles.requestCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.requestType}>
                    {String(item?.type || 'Emergency').toUpperCase()}
                  </Text>

                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: priorityColors.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        { color: priorityColors.text },
                      ]}
                    >
                      {String(item?.priority || 'medium').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestDescription}>
                  {item?.description || 'No description available'}
                </Text>

                <Text style={styles.requestLocation}>
                  📍 {item?.location_text || 'Location not available'}
                </Text>

                <View style={styles.cardBottomRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusColors.text },
                      ]}
                    >
                      {String(item?.status || 'unknown').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.viewText}>View Details ›</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 120,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
  },

  heroCard: {
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
    color: '#e5f9f1',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  totalCard: {
    backgroundColor: '#ede9fe',
  },
  pendingCard: {
    backgroundColor: '#fef3c7',
  },
  progressCard: {
    backgroundColor: '#dbeafe',
  },
  resolvedCard: {
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

  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#111827',
  },

  filterContainer: {
    paddingTop: 14,
    paddingBottom: 2,
  },
  filterChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#0d6efd',
  },
  filterChipText: {
    color: '#1e40af',
    fontWeight: '700',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
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

  requestWrap: {
    marginBottom: 14,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  requestType: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d6efd',
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
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
    lineHeight: 22,
  },
  requestLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },

  cardBottomRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 13,
  },
});