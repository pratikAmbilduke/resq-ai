import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import SectionHeader from '../components/SectionHeader';

export default function EmergencyDetailsScreen({ route }) {
  const emergency = route?.params?.emergency;

  const [status, setStatus] = useState(emergency?.status || 'pending');
  const [priority, setPriority] = useState(emergency?.priority || 'medium');
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [acceptedBy, setAcceptedBy] = useState(emergency?.accepted_by || '');
  const [providerLocation, setProviderLocation] = useState(null);

  const intervalRef = useRef(null);

  useEffect(() => {
    loadRole();
    fetchProviderLocation();

    intervalRef.current = setInterval(() => {
      fetchProviderLocation();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || 'user');
    } catch (error) {
      console.log('Load role error:', error);
    }
  };

  const fetchProviderLocation = async () => {
    try {
      if (!emergency?.id) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/provider-location/${emergency.id}`);
      const data = await response.json();

      if (data?.data?.provider_name) {
        setAcceptedBy(data.data.provider_name);
      }

      if (
        data?.data?.latitude !== null &&
        data?.data?.latitude !== undefined &&
        data?.data?.longitude !== null &&
        data?.data?.longitude !== undefined
      ) {
        setProviderLocation(data.data);
      }
    } catch (error) {
      console.log('Provider location fetch error:', error);
    }
  };

  const openInMaps = async () => {
    try {
      if (
        emergency?.latitude === undefined ||
        emergency?.longitude === undefined ||
        emergency?.latitude === null ||
        emergency?.longitude === null
      ) {
        Alert.alert('Error', 'Location coordinates not available');
        return;
      }

      const latitude = Number(emergency.latitude);
      const longitude = Number(emergency.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        Alert.alert('Error', 'Invalid coordinates');
        return;
      }

      let url = '';

      if (Platform.OS === 'android') {
        url = `google.navigation:q=${latitude},${longitude}`;
        const supported = await Linking.canOpenURL(url);

        if (!supported) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        }
      } else {
        url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Open Maps Error:', error);
      Alert.alert('Error', 'Unable to open navigation');
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      setLoading(true);

      let acceptedByName = acceptedBy;

      if (newStatus === 'accepted') {
        const adminName = await AsyncStorage.getItem('userName');
        acceptedByName = adminName || 'Admin';
      }

      const response = await fetch(
        `${API_BASE_URL}/emergency/${emergency.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            accepted_by: newStatus === 'accepted' ? acceptedByName : acceptedBy,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      setStatus(newStatus);

      if (data?.data?.accepted_by !== undefined) {
        setAcceptedBy(data.data.accepted_by || '');
      }

      if (data?.data?.priority) {
        setPriority(data.data.priority);
      }

      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.log('Update status error:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColors = (value) => {
    const s = String(value || '').toLowerCase();

    if (s === 'pending') {
      return { bg: '#FEF3C7', text: '#B45309' };
    }
    if (s === 'accepted') {
      return { bg: '#EDE9FE', text: '#6D28D9' };
    }
    if (s === 'in progress') {
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    }
    if (s === 'resolved') {
      return { bg: '#DCFCE7', text: '#15803D' };
    }
    if (s === 'cancelled') {
      return { bg: '#FEE2E2', text: '#B91C1C' };
    }

    return { bg: '#E5E7EB', text: '#374151' };
  };

  const getPriorityColors = (value) => {
    const p = String(value || '').toLowerCase();

    if (p === 'critical') {
      return { bg: '#FEE2E2', text: '#B91C1C' };
    }
    if (p === 'high') {
      return { bg: '#FFEDD5', text: '#C2410C' };
    }
    if (p === 'medium') {
      return { bg: '#DBEAFE', text: '#1D4ED8' };
    }

    return { bg: '#E5E7EB', text: '#374151' };
  };

  const latitude = Number(emergency?.latitude);
  const longitude = Number(emergency?.longitude);

  const routeCoordinates = useMemo(() => {
    if (!providerLocation) {
      return [];
    }

    const startLat = Number(providerLocation.latitude);
    const startLng = Number(providerLocation.longitude);
    const endLat = Number(latitude);
    const endLng = Number(longitude);

    if (
      Number.isNaN(startLat) ||
      Number.isNaN(startLng) ||
      Number.isNaN(endLat) ||
      Number.isNaN(endLng)
    ) {
      return [];
    }

    return [
      { latitude: startLat, longitude: startLng },
      { latitude: endLat, longitude: endLng },
    ];
  }, [providerLocation, latitude, longitude]);

  if (!emergency) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No emergency details found</Text>
      </View>
    );
  }

  const hasValidCoords =
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const statusColors = getStatusColors(status);
  const priorityColors = getPriorityColors(priority);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Emergency Details</Text>
        <Text style={styles.heroSubtitle}>
          View request information, status updates, and live tracking.
        </Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.badgeText, { color: statusColors.text }]}>
              {String(status || 'pending').toUpperCase()}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: priorityColors.bg }]}>
            <Text style={[styles.badgeText, { color: priorityColors.text }]}>
              {String(priority || 'medium').toUpperCase()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <SectionHeader
        title="Request Information"
        subtitle="Important details about this emergency"
      />

      <AppCard style={styles.infoCard}>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{emergency.type || 'Emergency'}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>
            {emergency.description || 'No description available'}
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>
            {emergency.location_text || 'Location not available'}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Status</Text>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {String(status || 'pending').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Priority</Text>
            <View style={[styles.badge, { backgroundColor: priorityColors.bg }]}>
              <Text style={[styles.badgeText, { color: priorityColors.text }]}>
                {String(priority || 'medium').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Assigned To</Text>
          <Text style={styles.assignedValue}>
            {acceptedBy || 'Not assigned yet'}
          </Text>
        </View>

        {userRole === 'admin' && (
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Latitude</Text>
              <Text style={styles.value}>{String(emergency.latitude ?? '-')}</Text>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Longitude</Text>
              <Text style={styles.value}>{String(emergency.longitude ?? '-')}</Text>
            </View>
          </View>
        )}
      </AppCard>

      {hasValidCoords && (
        <>
          <SectionHeader
            title="Live Tracking"
            subtitle="Track emergency and provider location"
          />

          <AppCard style={styles.mapCard}>
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude,
                  longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
              >
                <Marker
                  coordinate={{ latitude, longitude }}
                  title={emergency.type || 'Emergency'}
                  description={emergency.location_text || 'Emergency Location'}
                  pinColor="red"
                />

                {providerLocation?.latitude && providerLocation?.longitude ? (
                  <Marker
                    coordinate={{
                      latitude: Number(providerLocation.latitude),
                      longitude: Number(providerLocation.longitude),
                    }}
                    title={providerLocation.provider_name || 'Provider'}
                    description="Live Provider Location"
                  >
                    <View style={styles.providerMarkerOuter}>
                      <View style={styles.providerMarkerMiddle}>
                        <View style={styles.providerMarkerInner} />
                      </View>
                    </View>
                  </Marker>
                ) : null}

                {routeCoordinates.length === 2 ? (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#0d6efd"
                    strokeWidth={4}
                  />
                ) : null}
              </MapView>
            </View>

            <TouchableOpacity
              style={styles.mapButtonWrap}
              onPress={openInMaps}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={GRADIENTS.blueCyan}
                style={styles.mapButton}
              >
                <Text style={styles.mapButtonText}>Open Navigation</Text>
              </LinearGradient>
            </TouchableOpacity>
          </AppCard>
        </>
      )}

      {userRole === 'admin' ? (
        <>
          <SectionHeader
            title="Admin Actions"
            subtitle="Update request progress"
          />

          <AppCard style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('accepted')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.actionButton}>
                <Text style={styles.actionText}>Accept Request</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('pending')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={['#f59e0b', '#f97316']} style={styles.actionButton}>
                <Text style={styles.actionText}>Set Pending</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('in progress')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={GRADIENTS.blueCyan} style={styles.actionButton}>
                <Text style={styles.actionText}>Set In Progress</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('resolved')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={GRADIENTS.success} style={styles.actionButton}>
                <Text style={styles.actionText}>Set Resolved</Text>
              </LinearGradient>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            )}
          </AppCard>
        </>
      ) : (
        <AppCard style={styles.noteCard}>
          <Text style={styles.noteTitle}>Tracking Enabled</Text>
          <Text style={styles.noteText}>
            You can track this request here. Status updates are handled by admin.
          </Text>
        </AppCard>
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

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 22,
    marginBottom: 20,
    ...SHADOW.card,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 25,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#e5e7ff',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  badgeRow: {
    flexDirection: 'row',
    marginTop: 14,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  infoCard: {
    marginBottom: 22,
  },
  infoBlock: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  half: {
    width: '48%',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 22,
    fontWeight: '500',
  },
  assignedValue: {
    fontSize: 16,
    color: COLORS.secondary,
    lineHeight: 22,
    fontWeight: '700',
  },

  mapCard: {
    marginBottom: 22,
  },
  mapWrap: {
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },

  providerMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerMarkerMiddle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },

  mapButtonWrap: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButtonText: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: 'bold',
  },

  actionCard: {
    marginBottom: 24,
  },
  actionWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: 15,
  },
  loader: {
    marginTop: 10,
  },

  noteCard: {
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 18,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
});