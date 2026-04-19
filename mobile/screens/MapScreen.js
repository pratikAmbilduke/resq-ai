import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import API_BASE_URL from '../config';

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('emergency');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const mapRef = useRef(null);

  const nearbyServices = [
    {
      id: 'h1',
      type: 'hospital',
      name: 'Ruby Hall Clinic',
      description: 'Nearby Hospital',
      location_text: 'Pune',
      latitude: 18.5362,
      longitude: 73.8767,
    },
    {
      id: 'h2',
      type: 'hospital',
      name: 'Sassoon General Hospital',
      description: 'Nearby Hospital',
      location_text: 'Pune',
      latitude: 18.5286,
      longitude: 73.8743,
    },
    {
      id: 'p1',
      type: 'police',
      name: 'Shivajinagar Police Station',
      description: 'Nearby Police Station',
      location_text: 'Pune',
      latitude: 18.5308,
      longitude: 73.8475,
    },
    {
      id: 'p2',
      type: 'police',
      name: 'Deccan Police Station',
      description: 'Nearby Police Station',
      location_text: 'Pune',
      latitude: 18.5141,
      longitude: 73.8397,
    },
    {
      id: 'a1',
      type: 'ambulance',
      name: 'Emergency Ambulance Point 1',
      description: 'Nearby Ambulance Service',
      location_text: 'Pune',
      latitude: 18.5004,
      longitude: 73.8567,
    },
    {
      id: 'a2',
      type: 'ambulance',
      name: 'Emergency Ambulance Point 2',
      description: 'Nearby Ambulance Service',
      location_text: 'Pune',
      latitude: 18.4929,
      longitude: 73.8198,
    },
  ];

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/all-locations`);
      const data = await res.json();

      console.log('Map API response:', data);

      if (Array.isArray(data)) {
        setLocations(data);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.log('Map error:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const latitude = Number(currentLocation.coords.latitude);
      const longitude = Number(currentLocation.coords.longitude);

      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        setUserLocation({
          latitude,
          longitude,
        });
      }
    } catch (error) {
      console.log('User current location error:', error);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchUserCurrentLocation();

    const interval = setInterval(() => {
      fetchLocations();
      fetchUserCurrentLocation();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEmergencyPinColor = (name = '') => {
    const lower = String(name).toLowerCase();

    if (lower.includes('pending')) return 'orange';
    if (lower.includes('in progress')) return 'blue';
    if (lower.includes('resolved')) return 'green';

    return 'red';
  };

  const getServicePinColor = (type = '') => {
    const lower = String(type).toLowerCase();

    if (lower === 'hospital') return 'violet';
    if (lower === 'police') return 'indigo';
    if (lower === 'ambulance') return 'green';

    return 'gray';
  };

  const openNavigation = async (latitude, longitude) => {
    try {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        Alert.alert('Error', 'Invalid location');
        return;
      }

      let url = '';

      if (Platform.OS === 'android') {
        url = `google.navigation:q=${lat},${lng}`;
        const supported = await Linking.canOpenURL(url);

        if (!supported) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        }
      } else {
        url = `http://maps.apple.com/?daddr=${lat},${lng}`;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Navigation error:', error);
      Alert.alert('Error', 'Unable to open navigation');
    }
  };

  const filteredServices = useMemo(() => {
    if (selectedType === 'all-services') return nearbyServices;
    if (selectedType === 'hospital') {
      return nearbyServices.filter((item) => item.type === 'hospital');
    }
    if (selectedType === 'police') {
      return nearbyServices.filter((item) => item.type === 'police');
    }
    if (selectedType === 'ambulance') {
      return nearbyServices.filter((item) => item.type === 'ambulance');
    }
    return [];
  }, [selectedType]);

  const visibleEmergencyMarkers = useMemo(() => {
    if (selectedType === 'emergency') return locations;
    return [];
  }, [selectedType, locations]);

  const visibleServiceMarkers = useMemo(() => {
    if (
      selectedType === 'all-services' ||
      selectedType === 'hospital' ||
      selectedType === 'police' ||
      selectedType === 'ambulance'
    ) {
      return filteredServices;
    }
    return [];
  }, [selectedType, filteredServices]);

  const allVisibleMarkers = [...visibleEmergencyMarkers, ...visibleServiceMarkers];

  const firstLatitude =
    Number(allVisibleMarkers[0]?.latitude) ||
    Number(userLocation?.latitude) ||
    18.5204;

  const firstLongitude =
    Number(allVisibleMarkers[0]?.longitude) ||
    Number(userLocation?.longitude) ||
    73.8567;

  const handleSelectMarker = (marker, markerCategory) => {
    setSelectedMarker({
      ...marker,
      markerCategory,
    });

    const lat = Number(marker.latitude);
    const lng = Number(marker.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng) && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  };

  const routeCoordinates = useMemo(() => {
    if (!userLocation || !selectedMarker) return [];

    const startLat = Number(userLocation.latitude);
    const startLng = Number(userLocation.longitude);
    const endLat = Number(selectedMarker.latitude);
    const endLng = Number(selectedMarker.longitude);

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
  }, [userLocation, selectedMarker]);

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRadians = (value) => (value * Math.PI) / 180;

    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const selectedDistanceKm = useMemo(() => {
    if (!userLocation || !selectedMarker) return null;

    const startLat = Number(userLocation.latitude);
    const startLng = Number(userLocation.longitude);
    const endLat = Number(selectedMarker.latitude);
    const endLng = Number(selectedMarker.longitude);

    if (
      Number.isNaN(startLat) ||
      Number.isNaN(startLng) ||
      Number.isNaN(endLat) ||
      Number.isNaN(endLng)
    ) {
      return null;
    }

    return calculateDistanceKm(startLat, startLng, endLat, endLng);
  }, [userLocation, selectedMarker]);

  const selectedDistanceText =
    selectedDistanceKm !== null ? `${selectedDistanceKm.toFixed(2)} km away` : '';

  const selectedEtaText = useMemo(() => {
    if (selectedDistanceKm === null) return '';

    const averageSpeedKmPerHour = 30;
    const etaMinutes = (selectedDistanceKm / averageSpeedKmPerHour) * 60;

    if (etaMinutes < 1) {
      return 'Less than 1 min';
    }

    return `${Math.ceil(etaMinutes)} min ETA`;
  }, [selectedDistanceKm]);

  const getEmptyText = () => {
    if (selectedType === 'hospital') return 'No hospitals available for this filter';
    if (selectedType === 'police') return 'No police locations available for this filter';
    if (selectedType === 'ambulance') return 'No ambulance points available for this filter';
    if (selectedType === 'all-services') return 'No service locations available for this filter';
    return 'No emergency locations available for this filter';
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0d6efd" />;
  }

  if (!allVisibleMarkers.length && !userLocation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No map data available</Text>
        <Text style={styles.emptyText}>{getEmptyText()}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'emergency' && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedType('emergency');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'emergency' && styles.activeFilterChipText,
              ]}
            >
              Emergencies
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'all-services' && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedType('all-services');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'all-services' && styles.activeFilterChipText,
              ]}
            >
              All Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'hospital' && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedType('hospital');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'hospital' && styles.activeFilterChipText,
              ]}
            >
              Hospitals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'police' && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedType('police');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'police' && styles.activeFilterChipText,
              ]}
            >
              Police
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === 'ambulance' && styles.activeFilterChip,
            ]}
            onPress={() => {
              setSelectedType('ambulance');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'ambulance' && styles.activeFilterChipText,
              ]}
            >
              Ambulance
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {selectedMarker ? (
        <View style={styles.infoCard}>
          <View style={styles.infoTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {selectedMarker.name || 'Selected Location'}
              </Text>
              <Text style={styles.infoType}>
                {selectedMarker.markerCategory === 'emergency'
                  ? 'Emergency'
                  : String(selectedMarker.type || 'Service').toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.infoDescription}>
            {selectedMarker.description || 'No description'}
          </Text>

          <Text style={styles.infoLocation}>
            {selectedMarker.location_text || 'No address'}
          </Text>

          {!!selectedDistanceText ? (
            <Text style={styles.distanceText}>📏 {selectedDistanceText}</Text>
          ) : null}

          {!!selectedEtaText ? (
            <Text style={styles.etaText}>⏱ {selectedEtaText}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openNavigation(selectedMarker.latitude, selectedMarker.longitude)}
          >
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: firstLatitude,
          longitude: firstLongitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        onPress={() => setSelectedMarker(null)}
      >
        {userLocation ? (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }}
            title="You"
            description="Your Current Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerOuter}>
              <View style={styles.userMarkerMiddle}>
                <View style={styles.userMarkerInner} />
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

        {visibleEmergencyMarkers.map((loc, index) => (
          <Marker
            key={loc.id ? `emergency-${loc.id}` : `emergency-${index}`}
            coordinate={{
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
            }}
            title={loc.name || 'Emergency'}
            description={loc.location_text || 'Location'}
            pinColor={getEmergencyPinColor(loc.name)}
            onPress={() => handleSelectMarker(loc, 'emergency')}
          />
        ))}

        {visibleServiceMarkers.map((service) => (
          <Marker
            key={service.id}
            coordinate={{
              latitude: Number(service.latitude),
              longitude: Number(service.longitude),
            }}
            title={service.name}
            description={service.location_text}
            pinColor={getServicePinColor(service.type)}
            onPress={() => handleSelectMarker(service, 'service')}
          />
        ))}
      </MapView>

      <View style={styles.legendBox}>
        <Text style={styles.legendTitle}>Map Legend</Text>
        <Text style={styles.legendItem}>🔵 You</Text>
        <Text style={styles.legendItem}>🔴 Emergencies / Other</Text>
        <Text style={styles.legendItem}>🟠 Emergency Pending</Text>
        <Text style={styles.legendItem}>🔵 Emergency In Progress</Text>
        <Text style={styles.legendItem}>🟢 Emergency Resolved</Text>
        <Text style={styles.legendItem}>🟣 Hospital</Text>
        <Text style={styles.legendItem}>🟦 Police</Text>
        <Text style={styles.legendItem}>🟩 Ambulance</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f5f7',
  },
  map: {
    flex: 1,
  },

  filterWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  filterRow: {
    paddingRight: 8,
  },
  filterChip: {
    backgroundColor: '#ffffffee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterChip: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  filterChipText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterChipText: {
    color: '#fff',
  },

  infoCard: {
    position: 'absolute',
    top: 68,
    left: 12,
    right: 12,
    zIndex: 19,
    backgroundColor: '#ffffffee',
    borderRadius: 20,
    padding: 16,
    elevation: 5,
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  infoType: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#0d6efd',
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
    marginLeft: 10,
  },
  infoDescription: {
    marginTop: 10,
    fontSize: 14,
    color: '#111827',
  },
  infoLocation: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
  },
  distanceText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#198754',
  },
  etaText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fd7e14',
  },

  navigateButton: {
    marginTop: 12,
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f3f5f7',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },

  userMarkerOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(13, 110, 253, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerMiddle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0d6efd',
  },

  legendBox: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    backgroundColor: '#ffffffee',
    padding: 12,
    borderRadius: 16,
    elevation: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111827',
  },
  legendItem: {
    fontSize: 12,
    marginBottom: 2,
    color: '#374151
  },
});