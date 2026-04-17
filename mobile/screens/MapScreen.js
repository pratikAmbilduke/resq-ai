import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import API_BASE_URL from '../config';

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getPinColor = (name = '') => {
    const lower = String(name).toLowerCase();

    if (lower.includes('pending')) return 'orange';
    if (lower.includes('in progress')) return 'blue';
    if (lower.includes('resolved')) return 'green';

    return 'red';
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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  if (!locations.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No live locations available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: Number(locations[0].latitude),
          longitude: Number(locations[0].longitude),
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {locations.map((loc, index) => (
          <Marker
            key={loc.id ? String(loc.id) : String(index)}
            coordinate={{
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
            }}
            title={loc.name || 'Emergency'}
            description={loc.location_text || 'Location'}
            pinColor={getPinColor(loc.name)}
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
      </MapView>

      <View style={styles.legendBox}>
        <Text style={styles.legendTitle}>Status Colors</Text>
        <Text style={styles.legendItem}>🟠 Pending</Text>
        <Text style={styles.legendItem}>🔵 In Progress</Text>
        <Text style={styles.legendItem}>🟢 Resolved</Text>
        <Text style={styles.legendItem}>🔴 Other</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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