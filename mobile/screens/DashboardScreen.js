import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const loadDashboard = async () => {
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
        console.log('Dashboard API response:', data);
        setRequests([]);
        setLoading(false);
        return;
      }

      const sortedData = [...data].sort(
        (a, b) => Number(b?.id || 0) - Number(a?.id || 0)
      );

      setRequests(sortedData);
    } catch (error) {
      console.log('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to load dashboard');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();

      clearPolling();
      intervalRef.current = setInterval(() => {
        loadDashboard();
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

    const accepted = requests.filter(
      (item) => String(item?.status || '').toLowerCase() === 'accepted'
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
      accepted,
      progress,
      resolved,
      cancelled,
    };
  }, [requests]);

  const getStatusColors = (status) => {
    const value = String(status || '').toLowerCase();

    if (value === 'pending') {
      return { bg: '#FEF3C7', text: '#B45309' };
    }

    if (value === 'accepted') {
      return { bg: '#EDE9FE', text: '#6D28D9' };
    }

    if (value === 'in progress') {
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    }

    if (value === 'resolved') {
      return { bg: '#DCFCE7', text: '#15803D' };
    }

    if (value === 'cancelled') {
      return { bg: '#FEE2E2', text: '#B91C1C' };
    }

    return { bg: '#E5E7EB', text: '#374151' };
  };

  const getPriorityColors = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'critical') {
      return { bg: '#FEE2E2', text: '#B91C1C' };
    }

    if (value === 'high') {
      return { bg: '#FFEDD5', text: '#C2410C' };
    }

    if (value === 'medium') {
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    }

    return { bg: '#E5E7EB', text: '#374151' };
  };

  const activeRequest = useMemo(() => {
    return (
      requests.find((item) => {
        const status = String(item?.status || '').toLowerCase();
        return status === 'pending' || status === 'accepted' || status === 'in progress';
      }) || null
    );
  }, [requests]);

  const recentRequests = useMemo(() => {
    return requests.slice(0, 3);
  }, [requests]);

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
    >
      <LinearGradient
        colors={['#0d6efd', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Dashboard</Text>
        <Text style={styles.heroSubtitle}>
          Live emergency overview, active request tracking, and quick actions.
        </Text>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Overview</Text>
        <Text style={styles.sectionSubtext}>Real-time emergency summary</Text>
      </View>

      <View style={styles.topStatsRow}>
        <View style={[styles.mainStatCard, styles.totalCard]}>
          <Text style={styles.mainStatValue}>{counts.total}</Text>
          <Text style={styles.mainStatLabel}>Total Requests</Text>
        </View>

        <View style={styles.sideStatsColumn}>
          <View style={[styles.smallStatCard, styles.pendingCard]}>
            <Text style={styles.smallStatValue}>{counts.pending}</Text>
            <Text style={styles.smallStatLabel}>Pending</Text>
          </View>

          <View style={[styles.smallStatCard, styles.progressCard]}>
            <Text style={styles.smallStatValue}>{counts.progress}</Text>
            <Text style={styles.smallStatLabel}>In Progress</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomStatsRow}>
        <View style={[styles.bottomStatCard, styles.acceptedCard]}>
          <Text style={styles.bottomStatValue}>{counts.accepted}</Text>
          <Text style={styles.bottomStatLabel}>Accepted</Text>
        </View>

        <View style={[styles.bottomStatCard, styles.resolvedCard]}>
          <Text style={styles.bottomStatValue}>{counts.resolved}</Text>
          <Text style={styles.bottomStatLabel}>Resolved</Text>
        </View>

        <View style={[styles.bottomStatCard, styles.cancelledCard]}>
          <Text style={styles.bottomStatValue}>{counts.cancelled}</Text>
          <Text style={styles.bottomStatLabel}>Cancelled</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Request</Text>
        <Text style={styles.sectionSubtext}>Your most urgent ongoing request</Text>
      </View>

      {activeRequest ? (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() =>
            navigation.navigate('EmergencyDetails', { emergency: activeRequest })
          }
          style={styles.activeWrap}
        >
          <LinearGradient
            colors={['#111827', '#1f2937']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeCard}
          >
            <View style={styles.activeTopRow}>
              <Text style={styles.activeType}>
                {String(activeRequest?.type || 'Emergency').toUpperCase()}
              </Text>

              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: getPriorityColors(activeRequest?.priority).bg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityBadgeText,
                    {
                      color: getPriorityColors(activeRequest?.priority).text,
                    },
                  ]}
                >
                  {String(activeRequest?.priority || 'medium').toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.activeDescription}>
              {activeRequest?.description || 'No description available'}
            </Text>

            <Text style={styles.activeLocation}>
              📍 {activeRequest?.location_text || 'Location not available'}
            </Text>

            <View style={styles.activeBottomRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColors(activeRequest?.status).bg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: getStatusColors(activeRequest?.status).text,
                    },
                  ]}
                >
                  {String(activeRequest?.status || 'unknown').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.trackText}>Track Now ›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyActiveCard}>
          <Text style={styles.emptyActiveTitle}>No active request</Text>
          <Text style={styles.emptyActiveSubtitle}>
            You currently have no pending or in-progress emergency requests.
          </Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtext}>Fast access to important sections</Text>
      </View>

      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickActionWrap}
          activeOpacity={0.92}
          onPress={() => navigation.navigate('Emergency')}
        >
          <View style={[styles.quickActionCard, styles.quickActionBlue]}>
            <Text style={styles.quickActionEmoji}>🚨</Text>
            <Text style={styles.quickActionTitle}>New SOS</Text>
            <Text style={styles.quickActionSubtitle}>Create emergency request</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionWrap}
          activeOpacity={0.92}
          onPress={() => navigation.navigate('HistoryTab')}
        >
          <View style={[styles.quickActionCard, styles.quickActionPurple]}>
            <Text style={styles.quickActionEmoji}>📜</Text>
            <Text style={styles.quickActionTitle}>History</Text>
            <Text style={styles.quickActionSubtitle}>See all requests</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.sectionSubtext}>Latest 3 request updates</Text>
      </View>

      {recentRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Your recent emergency activity will appear here.
          </Text>
        </View>
      ) : (
        recentRequests.map((item, index) => {
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
                <View style={styles.requestTopRow}>
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

                <View style={styles.requestBottomRow}>
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

                  <Text style={styles.viewDetailsText}>Open ›</Text>
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
    marginBottom: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 25,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#e5e7ff',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
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

  topStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mainStatCard: {
    width: '48%',
    borderRadius: 20,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 170,
  },
  totalCard: {
    backgroundColor: '#ede9fe',
  },
  mainStatValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#111827',
  },
  mainStatLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },

  sideStatsColumn: {
    width: '48%',
    justifyContent: 'space-between',
  },
  smallStatCard: {
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    minHeight: 79,
    justifyContent: 'center',
  },
  pendingCard: {
    backgroundColor: '#fef3c7',
  },
  progressCard: {
    backgroundColor: '#dbeafe',
  },
  smallStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  smallStatLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
    marginTop: 4,
  },

  bottomStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bottomStatCard: {
    width: '31%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  acceptedCard: {
    backgroundColor: '#fce7f3',
  },
  resolvedCard: {
    backgroundColor: '#dcfce7',
  },
  cancelledCard: {
    backgroundColor: '#fee2e2',
  },
  bottomStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  bottomStatLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },

  activeWrap: {
    marginBottom: 20,
  },
  activeCard: {
    borderRadius: 22,
    padding: 18,
  },
  activeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeType: {
    flex: 1,
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 'bold',
    paddingRight: 10,
  },
  activeDescription: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    lineHeight: 26,
  },
  activeLocation: {
    color: '#d1d5db',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  activeBottomRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackText: {
    color: '#c084fc',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyActiveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
  },
  emptyActiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyActiveSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },

  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionWrap: {
    width: '48%',
  },
  quickActionCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 14,
    minHeight: 128,
  },
  quickActionBlue: {
    backgroundColor: '#dbeafe',
  },
  quickActionPurple: {
    backgroundColor: '#ede9fe',
  },
  quickActionEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 5,
    lineHeight: 18,
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

  requestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestType: {
    flex: 1,
    fontSize: 14,
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

  requestBottomRow: {
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
  viewDetailsText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 13,
  },
});