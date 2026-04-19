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
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import AppChip from '../components/AppChip';
import SectionHeader from '../components/SectionHeader';

export default function AdminScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [adminUserId, setAdminUserId] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);

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

  const toggleExpandCard = (id) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
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
        setRequests([]);
        calculateCounts([]);
        setLoading(false);
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

  const getStatusChipType = (status) => {
    const value = String(status || '').toLowerCase();

    if (value === 'pending') return 'warning';
    if (value === 'accepted') return 'purple';
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
      const priorityA =
        priorityOrder[String(a?.priority || 'medium').toLowerCase()] || 0;
      const priorityB =
        priorityOrder[String(b?.priority || 'medium').toLowerCase()] || 0;

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

                const updatedRequests = requests.filter(
                  (item) => item.id !== emergencyId
                );

                setRequests(updatedRequests);
                calculateCounts(updatedRequests);

                if (expandedCardId === emergencyId) {
                  setExpandedCardId(null);
                }

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
    { key: 'in progress', label: 'Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'my-assigned', label: 'My Assigned' },
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
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={GRADIENTS.dark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Admin Operations</Text>
        <Text style={styles.heroSubtitle}>
          Manage emergencies, priorities, and live request flow in one place.
        </Text>

        <View style={styles.heroChipRow}>
          <AppChip label={`${totalRequests} Total`} type="info" />
          <View style={styles.heroChipSpacer} />
          <AppChip label={`${pendingCount} Pending`} type="warning" />
        </View>
      </LinearGradient>

      <SectionHeader
        title="Summary"
        subtitle="Live emergency request overview"
      />

      <View style={styles.summaryGrid}>
        <AppCard variant="purple" style={styles.largeSummaryCard}>
          <Text style={styles.largeSummaryLabel}>Total Requests</Text>
          <Text style={styles.largeSummaryValue}>{totalRequests}</Text>
        </AppCard>

        <AppCard variant="orange" style={styles.smallSummaryCard}>
          <Text style={styles.smallSummaryValue}>{pendingCount}</Text>
          <Text style={styles.smallSummaryLabel}>Pending</Text>
        </AppCard>

        <AppCard variant="pink" style={styles.smallSummaryCard}>
          <Text style={styles.smallSummaryValue}>{acceptedCount}</Text>
          <Text style={styles.smallSummaryLabel}>Accepted</Text>
        </AppCard>

        <AppCard variant="blue" style={styles.smallSummaryCard}>
          <Text style={styles.smallSummaryValue}>{progressCount}</Text>
          <Text style={styles.smallSummaryLabel}>Progress</Text>
        </AppCard>

        <AppCard variant="green" style={styles.smallSummaryCard}>
          <Text style={styles.smallSummaryValue}>{resolvedCount}</Text>
          <Text style={styles.smallSummaryLabel}>Resolved</Text>
        </AppCard>
      </View>

      <TouchableOpacity
        style={styles.mapWrap}
        onPress={() => navigation.navigate('AdminMapTab')}
        activeOpacity={0.92}
      >
        <LinearGradient
          colors={GRADIENTS.blueCyan}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mapCard}
        >
          <View style={styles.mapCardTextWrap}>
            <Text style={styles.mapTitle}>📍 Open Live Map</Text>
            <Text style={styles.mapSubtitle}>
              Track emergency locations and provider movement
            </Text>
          </View>
          <Text style={styles.arrowWhite}>›</Text>
        </LinearGradient>
      </TouchableOpacity>

      <SectionHeader
        title="Request Management"
        subtitle="Tap any card to expand actions"
      />

      <AppCard variant="blue" style={styles.searchCard}>
        <Text style={styles.searchLabel}>Search Requests</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by type, description, location, provider, priority"
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
        />

        <View style={styles.filterRow}>
          {filterOptions.map((filter) => {
            const active = selectedFilter === filter.key;

            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterButton, active && styles.activeFilterButton]}
                onPress={() => setSelectedFilter(filter.key)}
                activeOpacity={0.92}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    active && styles.activeFilterButtonText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppCard>

      {filteredRequests.length === 0 ? (
        <AppCard variant="pink" style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests found</Text>
          <Text style={styles.emptySubtitle}>
            Try another search term or choose a different filter.
          </Text>
        </AppCard>
      ) : (
        filteredRequests.map((item, index) => {
          const isExpanded = expandedCardId === item.id;

          return (
            <View key={String(item?.id ?? index)} style={styles.requestWrap}>
              <AppCard
                style={[
                  styles.requestCard,
                  String(item?.priority || '').toLowerCase() === 'critical' &&
                    styles.criticalCard,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => toggleExpandCard(item.id)}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.requestType}>
                      {String(item?.type || 'Emergency').toUpperCase()}
                    </Text>

                    <View style={styles.rightTopSection}>
                      <AppChip
                        label={String(item?.status || 'unknown').toUpperCase()}
                        type={getStatusChipType(item?.status)}
                      />
                      <Text style={styles.expandIcon}>
                        {isExpanded ? '▴' : '▾'}
                      </Text>
                    </View>
                  </View>

                  <Text numberOfLines={isExpanded ? undefined : 2} style={styles.requestDescription}>
                    {item?.description || 'No description'}
                  </Text>

                  <Text style={styles.requestLocation}>
                    📍 {item?.location_text || 'No location available'}
                  </Text>

                  <View style={styles.metaRowFixed}>
                    <AppChip
                      label={String(item?.priority || 'medium').toUpperCase()}
                      type={getPriorityChipType(item?.priority)}
                    />

                    <Text style={styles.assignedText}>
                      {item?.accepted_by ? `👤 ${item.accepted_by}` : 'Unassigned'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.divider} />

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() =>
                          navigation.navigate('EmergencyDetails', { emergency: item })
                        }
                        activeOpacity={0.92}
                      >
                        <Text style={styles.actionText}>View</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleSetPriority(item.id, 'high')}
                        activeOpacity={0.92}
                      >
                        <Text style={styles.actionText}>High</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteRequest(item.id)}
                        activeOpacity={0.92}
                      >
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.quickPriorityRow}>
                      <TouchableOpacity
                        style={[styles.smallPriorityBtn, styles.lowSmallBtn]}
                        onPress={() => handleSetPriority(item.id, 'low')}
                        activeOpacity={0.92}
                      >
                        <Text style={styles.smallPriorityText}>Low</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallPriorityBtn, styles.mediumSmallBtn]}
                        onPress={() => handleSetPriority(item.id, 'medium')}
                        activeOpacity={0.92}
                      >
                        <Text style={styles.smallPriorityText}>Medium</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallPriorityBtn, styles.criticalSmallBtn]}
                        onPress={() => handleSetPriority(item.id, 'critical')}
                        activeOpacity={0.92}
                      >
                        <Text style={styles.smallPriorityText}>Critical</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </AppCard>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 80,
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
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  heroChipSpacer: {
    width: 8,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  largeSummaryCard: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
    paddingVertical: 22,
  },
  largeSummaryLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  largeSummaryValue: {
    fontSize: 38,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  smallSummaryCard: {
    width: '48%',
    marginBottom: 12,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallSummaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  smallSummaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '700',
    textAlign: 'center',
  },

  mapWrap: {
    marginBottom: 24,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  mapCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 92,
    padding: 18,
  },
  mapCardTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  mapTitle: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: 'bold',
  },
  mapSubtitle: {
    color: '#E0F2FE',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
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
    padding: 16,
  },
  criticalCard: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  requestType: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  rightTopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandIcon: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  requestDescription: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
    lineHeight: 22,
  },
  requestLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },

  metaRowFixed: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  assignedText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },

  quickPriorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  smallPriorityBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  lowSmallBtn: {
    backgroundColor: '#E5E7EB',
  },
  mediumSmallBtn: {
    backgroundColor: '#DBEAFE',
  },
  criticalSmallBtn: {
    backgroundColor: '#FEE2E2',
  },
  smallPriorityText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },

  arrowWhite: {
    color: COLORS.textLight,
    fontSize: 30,
    fontWeight: '300',
  },
});