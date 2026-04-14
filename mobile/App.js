import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSOS = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for SOS.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

      setLocation({ latitude, longitude });

      // Reverse geocoding
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let locationText = 'Auto captured from device';

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        locationText = [
          place.name,
          place.street,
          place.subregion,
          place.city,
          place.region,
          place.postalCode,
          place.country,
        ]
          .filter(Boolean)
          .join(', ');
      }

      setAddress(locationText);

      const response = await fetch('http://localhost:8000/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'emergency',
          description: 'SOS triggered from mobile app',
          latitude: latitude,
          longitude: longitude,
          location_text: locationText,
        }),
      });

      const responseText = await response.text();
      console.log('Status:', response.status);
      console.log('Response Text:', responseText);

      if (!response.ok) {
        Alert.alert('Backend Error', `Status: ${response.status}\n${responseText}`);
        return;
      }

      Alert.alert('Success', 'Emergency sent successfully.');
    } catch (error) {
      console.log('SOS Error:', error);
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚑 ResQ AI</Text>

      <TouchableOpacity
        style={styles.sosButton}
        onPress={handleSOS}
        disabled={loading}
      >
        <Text style={styles.sosText}>
          {loading ? 'Sending...' : '🚨 SOS'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Report Emergency</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>View History</Text>
      </TouchableOpacity>

      {location && (
        <View style={styles.locationBox}>
          <Text style={styles.locationTitle}>Current Location</Text>
          <Text style={styles.locationText}>Latitude: {location.latitude}</Text>
          <Text style={styles.locationText}>Longitude: {location.longitude}</Text>
          <Text style={styles.locationText}>Address: {address}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  sosButton: {
    backgroundColor: 'red',
    paddingVertical: 30,
    paddingHorizontal: 40,
    borderRadius: 100,
    marginBottom: 30,
  },
  sosText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    marginVertical: 10,
    width: 220,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  locationBox: {
    marginTop: 30,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    elevation: 3,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 15,
    marginBottom: 5,
  },
});