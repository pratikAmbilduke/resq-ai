import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function EmergencyLocationScreen({ route }) {
  const { emergency } = route.params;

  const region = {
    latitude: emergency.latitude,
    longitude: emergency.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📍 Emergency Location</Text>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={region}>
          <Marker
            coordinate={{
              latitude: emergency.latitude,
              longitude: emergency.longitude,
            }}
            title={`Emergency: ${emergency.type}`}
            description={emergency.location_text}
          />
        </MapView>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{emergency.type}</Text>

        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{emergency.description}</Text>

        <Text style={styles.label}>Latitude:</Text>
        <Text style={styles.value}>{emergency.latitude}</Text>

        <Text style={styles.label}>Longitude:</Text>
        <Text style={styles.value}>{emergency.longitude}</Text>

        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{emergency.location_text}</Text>

        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{emergency.status}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#222',
  },
  value: {
    fontSize: 15,
    color: '#555',
    marginTop: 4,
  },
});