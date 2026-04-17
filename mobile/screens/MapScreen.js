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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  if (!allVisibleMarkers.length && !userLocation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No locations available for this filter</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {selectedMarker && (
        <View style={styles.topInfoCard}>
          <View style={styles.topInfoHeader}>
            <Text style={styles.topInfoTitle}>
              {selectedMarker.name || 'Selected Location'}
            </Text>
            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.topInfoType}>
            {selectedMarker.markerCategory === 'emergency'
              ? 'Emergency'
              : String(selectedMarker.type || 'Service').toUpperCase()}
          </Text>

          <Text style={styles.topInfoText}>
            {selectedMarker.description || 'No description'}
          </Text>

          <Text style={styles.topInfoText}>
            {selectedMarker.location_text || 'No address'}
          </Text>

          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              openNavigation(selectedMarker.latitude, selectedMarker.longitude)
            }
          >
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedType === 'emergency' && styles.activeFilterButton,
            ]}
            onPress={() => {
              setSelectedType('emergency');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'emergency' && styles.activeFilterButtonText,
              ]}
            >
              Emergencies
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedType === 'all-services' && styles.activeFilterButton,
            ]}
            onPress={() => {
              setSelectedType('all-services');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'all-services' && styles.activeFilterButtonText,
              ]}
            >
              All Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedType === 'hospital' && styles.activeFilterButton,
            ]}
            onPress={() => {
              setSelectedType('hospital');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'hospital' && styles.activeFilterButtonText,
              ]}
            >
              Hospitals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedType === 'police' && styles.activeFilterButton,
            ]}
            onPress={() => {
              setSelectedType('police');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'police' && styles.activeFilterButtonText,
              ]}
            >
              Police
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedType === 'ambulance' && styles.activeFilterButton,
            ]}
            onPress={() => {
              setSelectedType('ambulance');
              setSelectedMarker(null);
            }}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'ambulance' && styles.activeFilterButtonText,
              ]}
            >
              Ambulance
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

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
        {userLocation && (
          <Marker
            coordinate={{
              latitude: Number(userLocation.latitude),
              longitude: Number(userLocation.longitude),
            }}
            title="You"
            description="Your Current Location"
            pinColor="black"
          />
        )}

        {routeCoordinates.length === 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007bff"
            strokeWidth={4}
          />
        )}

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
        <Text style={styles.legendItem}>⚫ You</Text>
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
  container: { flex: 1 },
  map: { flex: 1 },

  topInfoCard: {
    position: 'absolute',
    top: 62,
    left: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: '#ffffffee',
    borderRadius: 14,
    padding: 14,
    elevation: 5,
  },
  topInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  topInfoType: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#007bff',
  },
  topInfoText: {
    marginTop: 6,
    fontSize: 13,
    color: '#333',
  },

  filterWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  filterRow: {
    paddingRight: 8,
  },
  filterButton: {
    backgroundColor: '#ffffffee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterButtonText: {
    color: '#fff',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f4f5f7',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },

  navigateButton: {
    marginTop: 10,
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  legendBox: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    backgroundColor: '#ffffffee',
    padding: 10,
    borderRadius: 12,
    elevation: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  legendItem: {
    fontSize: 12,
    marginBottom: 2,
  },
});