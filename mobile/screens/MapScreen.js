import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import API_BASE_URL from '../config';

const GOOGLE_MAPS_API_KEY = "YOUR_API_KEY_HERE";

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || locations.length < 2) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

  const origin = {
    latitude: locations[0].latitude,
    longitude: locations[0].longitude,
  };

  const destination = {
    latitude: locations[1].latitude,
    longitude: locations[1].longitude,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
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
          />
        ))}

        <MapViewDirections
          origin={origin}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={4}
          strokeColor="blue"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});