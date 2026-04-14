import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

export default function EmergencyScreen() {
  const [loading, setLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);

  const sendEmergency = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;

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

      setLocationInfo({
        latitude,
        longitude,
        locationText,
      });

      const response = await fetch('http://localhost:8000/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'medical',
          description: 'Emergency reported from mobile app',
          latitude: latitude,
          longitude: longitude,
          location_text: locationText,
        }),
      });

      const data = await response.json();
      console.log('Backend Response:', data);

      if (!response.ok) {
        Alert.alert('Error', 'Failed to send emergency.');
        return;
      }

      Alert.alert('Success', 'Emergency Sent Successfully 🚨');
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Something went wrong while sending emergency.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Emergency</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={sendEmergency}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'SEND SOS'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="red" style={{ marginTop: 20 }} />}

      {locationInfo && (
        <View style={styles.card}>
          <Text style={styles.infoTitle}>Captured Location</Text>
          <Text style={styles.infoText}>Latitude: {locationInfo.latitude}</Text>
          <Text style={styles.infoText}>Longitude: {locationInfo.longitude}</Text>
          <Text style={styles.infoText}>Address: {locationInfo.locationText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: 'red',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    marginTop: 30,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
  },
});