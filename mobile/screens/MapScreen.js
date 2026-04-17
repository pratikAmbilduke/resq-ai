import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import API_BASE_URL from '../config';

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef(null);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/all-locations`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setLocations(data);
      }
    } catch (error) {
      console.log('Map error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();

    const interval = setInterval(fetchLocations, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: locations[0]?.latitude || 21.1458,
          longitude: locations[0]?.longitude || 79.0882,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{
              latitude: loc.latitude,
              longitude: loc.longitude,
            }}
            title={loc.name}
            description="Live Location"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});