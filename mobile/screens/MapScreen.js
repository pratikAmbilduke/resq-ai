import React, { useEffect, useMemo, useState } from 'react';
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
import MapView, { Marker, Callout } from 'react-native-maps';
import API_BASE_URL from '../config';

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');

  // ✅ Sample nearby services (can upgrade later to real API)
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

  useEffect(() => {
    fetchLocations();

    const interval = setInterval(fetchLocations, 5000);
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
    if (selectedType === 'all') return nearbyServices;
    return nearbyServices.filter((item) => item.type === selectedType);
  }, [selectedType]);

  const firstLatitude =
    Number(locations[0]?.latitude) || Number(filteredServices[0]?.latitude) || 18.5204;
  const firstLongitude =
    Number(locations[0]?.longitude) || Number(filteredServices[0]?.longitude) || 73.8567;

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
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
              styles.filterButton,
              selectedType === 'all' && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedType('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedType === 'all' && styles.activeFilterButtonText,
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
            onPress={() => setSelectedType('hospital')}
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
            onPress={() => setSelectedType('police')}
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
            onPress={() => setSelectedType('ambulance')}
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
        style={styles.map}
        initialRegion={{
          latitude: firstLatitude,
          longitude: firstLongitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {/* Emergency markers */}
        {locations.map((loc, index) => (
          <Marker
            key={loc.id ? `emergency-${loc.id}` : `emergency-${index}`}
            coordinate={{
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
            }}
            title={loc.name || 'Emergency'}
            description={loc.location_text || 'Location'}
            pinColor={getEmergencyPinColor(loc.name)}
          >
            <Callout tooltip>
              <View style={styles.calloutCard}>
                <Text style={styles.calloutTitle}>{loc.name || 'Emergency'}</Text>
                <Text style={styles.calloutText}>
                  {loc.description || 'No description'}
                </Text>
                <Text style={styles.calloutText}>
                  {loc.location_text || 'No address'}
                </Text>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => openNavigation(loc.latitude, loc.longitude)}
                >
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Nearby service markers */}
        {filteredServices.map((service) => (
          <Marker
            key={service.id}
            coordinate={{
              latitude: Number(service.latitude),
              longitude: Number(service.longitude),
            }}
            title={service.name}
            description={service.location_text}
            pinColor={getServicePinColor(service.type)}
          >
            <Callout tooltip>
              <View style={styles.calloutCard}>
                <Text style={styles.calloutTitle}>{service.name}</Text>
                <Text style={styles.calloutText}>{service.description}</Text>
                <Text style={styles.calloutText}>{service.location_text}</Text>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() => openNavigation(service.latitude, service.longitude)}
                >
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.legendBox}>
        <Text style={styles.legendTitle}>Map Legend</Text>
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

  calloutCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  calloutText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  navigateButton: {
    marginTop: 8,
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