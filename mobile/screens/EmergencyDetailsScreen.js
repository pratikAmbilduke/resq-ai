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
import API_BASE_URL from '../config';

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

  const getPriorityColor = (value) => {
    const p = String(value || '').toLowerCase();
    if (p === 'low') return '#6c757d';
    if (p === 'medium') return '#0d6efd';
    if (p === 'high') return '#fd7e14';
    if (p === 'critical') return '#dc3545';
    return '#6b7280';
  };

  const getStatusColor = (value) => {
    const s = String(value || '').toLowerCase();
    if (s === 'pending') return '#d4a017';
    if (s === 'accepted') return '#6f42c1';
    if (s === 'in progress') return '#0d6efd';
    if (s === 'resolved') return '#198754';
    if (s === 'cancelled') return '#dc3545';
    return '#6b7280';
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

  const statusColor = getStatusColor(status);
  const priorityColor = getPriorityColor(priority);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Emergency Details</Text>
        <Text style={styles.heroSubtitle}>
          Track request details, provider movement, and current progress.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.topBadgesRow}>
          <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>
            {String(status || 'unknown').toUpperCase()}
          </Text>

          <Text style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            {String(priority || 'medium').toUpperCase()}
          </Text>
        </View>

        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{emergency.type || '-'}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{emergency.description || '-'}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{emergency.location_text || '-'}</Text>

        <View style={styles.coordRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Latitude</Text>
            <Text style={styles.coordValue}>{String(emergency.latitude ?? '-')}</Text>
          </View>

          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>Longitude</Text>
            <Text style={styles.coordValue}>{String(emergency.longitude ?? '-')}</Text>
          </View>
        </View>

        {acceptedBy ? (
          <>
            <Text style={styles.label}>Assigned Provider</Text>
            <Text style={styles.assignedText}>{acceptedBy}</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Assigned Provider</Text>
            <Text style={styles.unassignedText}>Not assigned yet</Text>
          </>
        )}
      </View>

      {hasValidCoords && (
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapTitle}>Live Tracking Map</Text>
            <TouchableOpacity style={styles.mapActionChip} onPress={openInMaps}>
              <Text style={styles.mapActionChipText}>Navigate</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity style={styles.fullWidthButton} onPress={openInMaps}>
            <Text style={styles.fullWidthButtonText}>Open Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {userRole === 'admin' ? (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Update Status</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptedButton]}
            onPress={() => updateStatus('accepted')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Accept Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => updateStatus('pending')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Set Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.progressButton]}
            onPress={() => updateStatus('in progress')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Set In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.resolvedButton]}
            onPress={() => updateStatus('resolved')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Set Resolved</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0d6efd"
              style={{ marginTop: 14 }}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>User View</Text>
          <Text style={styles.noteText}>
            You can track the request and assigned provider here. Only admin can update the request status.
          </Text>
        </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f5f7',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },

  heroCard: {
    backgroundColor: '#111827',
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
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityBadge: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: '#111827',
    marginTop: 6,
    lineHeight: 22,
  },
  assignedText: {
    color: '#6f42c1',
    fontWeight: '700',
    fontSize: 16,
    marginTop: 6,
  },
  unassignedText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 15,
    marginTop: 6,
  },

  coordRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  coordBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 14,
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  coordValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 6,
  },

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  mapActionChip: {
    backgroundColor: '#e8f1ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mapActionChipText: {
    color: '#0d6efd',
    fontWeight: '700',
    fontSize: 12,
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  fullWidthButton: {
    backgroundColor: '#0d6efd',
    marginTop: 14,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  fullWidthButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  providerMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 110, 253, 0.25)',
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
    backgroundColor: '#0d6efd',
  },

  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptedButton: {
    backgroundColor: '#6f42c1',
  },
  pendingButton: {
    backgroundColor: '#d4a017',
  },
  progressButton: {
    backgroundColor: '#0d6efd',
  },
  resolvedButton: {
    backgroundColor: '#198754',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  noteText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
  },
});