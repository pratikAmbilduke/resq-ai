import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
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
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{
              latitude: Number(loc.latitude),
              longitude: Number(loc.longitude),
            }}
            title={loc.name || 'Emergency'}
            description={loc.location_text || 'Location'}
          >
            <Callout>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutTitle}>{loc.name || 'Emergency'}</Text>
                <Text style={styles.calloutText}>{loc.description || 'No description'}</Text>
                <Text style={styles.calloutText}>{loc.location_text || 'No address'}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
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
  calloutBox: {
    width: 220,
    padding: 6,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
  },
});