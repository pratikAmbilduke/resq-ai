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

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import AppChip from '../components/AppChip';
import SectionHeader from '../components/SectionHeader';

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

      const sortedData = [...data].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
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

  const getStatusChipType = (status) => {
    const value = String(status || '').toLowerCase();

    if (value === 'pending') return 'warning';
    if (value === 'in progress') return 'info';
    if (value === 'resolved') return 'success';
    if (value === 'cancelled') return 'danger';

    return 'default';
  };

  const getPriorityChipType = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'low') return 'default';
    if (value === 'medium') return 'info';
    if (value === 'high') return 'warning';
    if (value === 'critical') return 'danger';

    return 'default';
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

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in progress', label: 'Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: COLORS.background }}
        size="large"
        color={COLORS.primary}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.greenBlue}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Request History</Text>
        <Text style={styles.heroSubtitle}>
          Review all your previous emergency requests and track their final status.
        </Text>

        <View style={styles.heroChipRow}>
          <AppChip label={`${counts.total} Total`} type="info" />
          <View style={{ width: 8 }} />
          <AppChip label={`${counts.resolved} Resolved`} type="success" />
        </View>
      </LinearGradient>

      <SectionHeader
        title="Overview"
        subtitle="Quick summary of your emergency request history"
      />

      <View style={styles.summaryRow}>
        <AppCard variant="orange" style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{counts.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </AppCard>

        <AppCard variant="blue" style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{counts.progress}</Text>
          <Text style={styles.summaryLabel}>Progress</Text>
        </AppCard>

        <AppCard variant="green" style={styles.summaryCard}>
          <Text style={styles.summaryCount}>{counts.resolved}</Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </AppCard>
      </View>

      <AppCard variant="purple" style={styles.searchCard}>
        <Text style={styles.searchLabel}>Search Requests</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by type, location, status, priority"
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
        />

        <View style={styles.filterRow}>
          {filterButtons.map((item) => {
            const active = selectedFilter === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterButton, active && styles.activeFilterButton]}
                onPress={() => setSelectedFilter(item.key)}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    active && styles.activeFilterButtonText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppCard>

      <SectionHeader
        title="All Requests"
        subtitle="Tap any request to open full details"
      />

      {filteredRequests.length === 0 ? (
        <AppCard variant="pink" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptySubtitle}>
            Try another search or filter to view your request history.
          </Text>
        </AppCard>
      ) : (
        filteredRequests.map((item, index) => (
          <TouchableOpacity
            key={String(item?.id ?? index)}
            activeOpacity={0.92}
            onPress={() => navigation.navigate('EmergencyDetails', { emergency: item })}
            style={styles.requestWrap}
          >
            <AppCard style={styles.requestCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.requestType}>
                  {String(item?.type || 'Emergency').toUpperCase()}
                </Text>

                <View style={styles.cardChipsRight}>
                  <AppChip
                    label={String(item?.priority || 'medium').toUpperCase()}
                    type={getPriorityChipType(item?.priority)}
                  />
                </View>
              </View>

              <Text style={styles.requestDescription}>
                {item?.description || 'No description available'}
              </Text>

              <Text style={styles.requestLocation}>
                {item?.location_text || 'No location available'}
              </Text>

              <View style={styles.bottomMetaRow}>
                <AppChip
                  label={String(item?.status || 'unknown').toUpperCase()}
                  type={getStatusChipType(item?.status)}
                />

                <Text style={styles.viewDetailsText}>View details ›</Text>
              </View>
            </AppCard>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 140,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 24,
    ...SHADOW.card,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#DCFCE7',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  searchCard: {
    marginBottom: 24,
  },
  searchLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#D7E3FF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  filterButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  activeFilterButtonText: {
    color: COLORS.textLight,
  },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    marginTop: 6,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  requestWrap: {
    marginBottom: 14,
  },
  requestCard: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestType: {
    flex: 1,
    color: COLORS.primaryDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardChipsRight: {
    alignItems: 'flex-end',
  },
  requestDescription: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 22,
  },
  requestLocation: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  viewDetailsText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
});