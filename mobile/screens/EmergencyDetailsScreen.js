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
import AppChip from '../components/AppChip';
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || 'user');
    } catch (error) {
      console.log('Load Role Error:', error);
    }
  };

  const fetchProviderLocation = async () => {
    try {
      if (!emergency?.id) return;

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

  const getPriorityChipType = (value) => {
    const p = String(value || '').toLowerCase();
    if (p === 'low') return 'default';
    if (p === 'medium') return 'info';
    if (p === 'high') return 'warning';
    if (p === 'critical') return 'danger';
    return 'default';
  };

  const getStatusChipType = (value) => {
    const s = String(value || '').toLowerCase();
    if (s === 'pending') return 'warning';
    if (s === 'accepted') return 'purple';
    if (s === 'in progress') return 'info';
    if (s === 'resolved') return 'success';
    if (s === 'cancelled') return 'danger';
    return 'default';
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
      console.log('Update Status Error:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const latitude = Number(emergency?.latitude);
  const longitude = Number(emergency?.longitude);

  const routeCoordinates = useMemo(() => {
    if (!providerLocation) return [];

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
          View complete request information, live tracking, and response updates.
        </Text>

        <View style={styles.heroChipRow}>
          <AppChip
            label={String(status || 'pending').toUpperCase()}
            type={getStatusChipType(status)}
          />
          <View style={{ width: 8 }} />
          <AppChip
            label={String(priority || 'medium').toUpperCase()}
            type={getPriorityChipType(priority)}
          />
        </View>
      </LinearGradient>

      <SectionHeader
        title="Request Information"
        subtitle="All key emergency details in one place"
      />

      <AppCard style={styles.detailsCard}>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{emergency.type || '-'}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{emergency.description || '-'}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{emergency.location_text || '-'}</Text>
        </View>

        <View style={styles.rowInfo}>
          <View style={styles.halfBlock}>
            <Text style={styles.label}>Latitude</Text>
            <Text style={styles.value}>{String(emergency.latitude ?? '-')}</Text>
          </View>

          <View style={styles.halfBlock}>
            <Text style={styles.label}>Longitude</Text>
            <Text style={styles.value}>{String(emergency.longitude ?? '-')}</Text>
          </View>
        </View>

        <View style={styles.rowInfo}>
          <View style={styles.halfBlock}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chipWrap}>
              <AppChip
                label={String(status || 'pending').toUpperCase()}
                type={getStatusChipType(status)}
              />
            </View>
          </View>

          <View style={styles.halfBlock}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipWrap}>
              <AppChip
                label={String(priority || 'medium').toUpperCase()}
                type={getPriorityChipType(priority)}
              />
            </View>
          </View>
        </View>

        {acceptedBy ? (
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Accepted By</Text>
            <Text style={styles.acceptedByText}>{acceptedBy}</Text>
          </View>
        ) : null}
      </AppCard>

      {hasValidCoords && (
        <>
          <SectionHeader
            title="Live Tracking"
            subtitle="Track emergency location and provider movement"
          />

          <AppCard style={styles.mapCard}>
            <View style={styles.mapContainer}>
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

      {userRole === 'admin' && (
        <>
          <SectionHeader
            title="Status Actions"
            subtitle="Update current emergency progress"
          />

          <AppCard style={styles.actionCard}>
            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('accepted')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={GRADIENTS.pinkPurple} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Accept Request</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('pending')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={['#F59E0B', '#F97316']} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Set Pending</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('in progress')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={GRADIENTS.blueCyan} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Set In Progress</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionWrap}
              onPress={() => updateStatus('resolved')}
              disabled={loading}
              activeOpacity={0.92}
            >
              <LinearGradient colors={GRADIENTS.greenBlue} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Set Resolved</Text>
              </LinearGradient>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={{ marginTop: 16 }}
              />
            )}
          </AppCard>
        </>
      )}

      {userRole !== 'admin' && (
        <AppCard variant="purple" style={styles.noteCard}>
          <Text style={styles.noteText}>
            Only admin can update emergency status.
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
    color: '#E0E7FF',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  detailsCard: {
    marginBottom: 24,
  },
  infoBlock: {
    marginBottom: 14,
  },
  rowInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  halfBlock: {
    flex: 1,
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
  chipWrap: {
    marginTop: 2,
  },
  acceptedByText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '700',
  },

  mapCard: {
    marginBottom: 24,
  },
  mapContainer: {
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
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

  actionCard: {
    marginBottom: 24,
  },
  actionWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  statusButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: 15,
  },

  noteCard: {
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 18,
  },
  noteText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});