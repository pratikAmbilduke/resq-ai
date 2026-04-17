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

export default function EmergencyDetailsScreen({ route, navigation }) {
  const emergency = route?.params?.emergency;

  const [status, setStatus] = useState(emergency?.status || 'pending');
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

      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.log('Update Status Error:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    try {
      Alert.alert(
        'Cancel Request',
        'Are you sure you want to cancel this request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);

                const response = await fetch(
                  `${API_BASE_URL}/emergency/${emergency.id}/status`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      status: 'cancelled',
                    }),
                  }
                );

                const data = await response.json();

                if (data.error) {
                  Alert.alert('Error', data.error);
                  return;
                }

                setStatus('cancelled');
                setAcceptedBy('');
                setProviderLocation(null);

                Alert.alert('Success', 'Request cancelled successfully');
              } catch (error) {
                console.log('Cancel request error:', error);
                Alert.alert('Error', 'Failed to cancel request');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.log('Cancel Alert Error:', error);
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Emergency Details</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{emergency.type || '-'}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{emergency.description || '-'}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{emergency.location_text || '-'}</Text>

        <Text style={styles.label}>Latitude</Text>
        <Text style={styles.value}>{String(emergency.latitude ?? '-')}</Text>

        <Text style={styles.label}>Longitude</Text>
        <Text style={styles.value}>{String(emergency.longitude ?? '-')}</Text>

        <Text style={styles.label}>Status</Text>
        <Text
          style={[
            styles.value,
            status === 'pending'
              ? styles.pending
              : status === 'accepted'
              ? styles.accepted
              : status === 'in progress'
              ? styles.progress
              : status === 'resolved'
              ? styles.resolved
              : styles.cancelled,
          ]}
        >
          {status}
        </Text>

        {acceptedBy ? (
          <>
            <Text style={styles.label}>Accepted By</Text>
            <Text style={styles.acceptedByText}>{acceptedBy}</Text>
          </>
        ) : null}
      </View>

      {hasValidCoords && (
        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>Tracking Map</Text>

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
                  strokeColor="#007bff"
                  strokeWidth={4}
                />
              ) : null}
            </MapView>
          </View>

          <TouchableOpacity style={styles.mapButton} onPress={openInMaps}>
            <Text style={styles.mapButtonText}>Open Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {userRole === 'user' && status === 'pending' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={cancelRequest}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
      )}

      {userRole === 'admin' && (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Update Status</Text>

          <TouchableOpacity
            style={[styles.statusButton, styles.acceptedButton]}
            onPress={() => updateStatus('accepted')}
            disabled={loading}
          >
            <Text style={styles.statusButtonText}>Accept Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusButton, styles.pendingButton]}
            onPress={() => updateStatus('pending')}
            disabled={loading}
          >
            <Text style={styles.statusButtonText}>Set Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusButton, styles.progressButton]}
            onPress={() => updateStatus('in progress')}
            disabled={loading}
          >
            <Text style={styles.statusButtonText}>Set In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusButton, styles.resolvedButton]}
            onPress={() => updateStatus('resolved')}
            disabled={loading}
          >
            <Text style={styles.statusButtonText}>Set Resolved</Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator
              size="large"
              color="#007bff"
              style={{ marginTop: 15 }}
            />
          )}
        </View>
      )}

      {userRole !== 'admin' && status !== 'pending' && (
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            This request can no longer be cancelled.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f6f8',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#222',
    marginTop: 4,
  },
  pending: {
    color: '#c89b00',
    fontWeight: 'bold',
  },
  accepted: {
    color: '#6f42c1',
    fontWeight: 'bold',
  },
  progress: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  resolved: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  cancelled: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  acceptedByText: {
    color: '#6f42c1',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 4,
  },
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    marginBottom: 18,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapButton: {
    backgroundColor: '#007bff',
    marginTop: 15,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  providerMarkerOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerMarkerMiddle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    marginBottom: 18,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  statusButton: {
    paddingVertical: 14,
    borderRadius: 12,
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
    backgroundColor: '#007bff',
  },
  resolvedButton: {
    backgroundColor: '#28a745',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  noteText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});