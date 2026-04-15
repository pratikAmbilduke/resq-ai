import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';

export default function EmergencyScreen() {
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [type, setType] = useState('medical');
  const [description, setDescription] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  const sendLocalNotification = async (emergencyType) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Emergency Alert Sent 🚨',
          body: `Your ${emergencyType} emergency has been submitted successfully.`,
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Notification Error:', error);
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      setFetchingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
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

      const newLocationInfo = {
        latitude,
        longitude,
        locationText,
      };

      setLocationInfo(newLocationInfo);

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.log('Location Fetch Error:', error);
      Alert.alert('Error', 'Failed to fetch current location.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const sendEmergency = async () => {
    try {
      if (!description.trim()) {
        Alert.alert('Validation Error', 'Please enter emergency description.');
        return;
      }

      if (!locationInfo) {
        Alert.alert('Validation Error', 'Please fetch your current location first.');
        return;
      }

      setLoading(true);

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User not logged in.');
        return;
      }

      const response = await fetch('http://localhost:8000/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          description,
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
          location_text: locationInfo.locationText,
          user_id: parseInt(userId, 10),
        }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      await sendLocalNotification(type);

      Alert.alert('Success', 'Emergency sent successfully 🚨');
      setDescription('');
    } catch (error) {
      console.log('Emergency Error:', error);
      Alert.alert('Error', 'Something went wrong while sending emergency.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🚨 Report Emergency</Text>

      <Text style={styles.label}>Select Emergency Type</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'medical' && styles.activeType]}
          onPress={() => setType('medical')}
        >
          <Text style={[styles.typeText, type === 'medical' && styles.activeTypeText]}>
            Medical
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeButton, type === 'accident' && styles.activeType]}
          onPress={() => setType('accident')}
        >
          <Text style={[styles.typeText, type === 'accident' && styles.activeTypeText]}>
            Accident
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeButton, type === 'fire' && styles.activeType]}
          onPress={() => setType('fire')}
        >
          <Text style={[styles.typeText, type === 'fire' && styles.activeTypeText]}>
            Fire
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Emergency Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the emergency clearly"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={styles.locationButton}
        onPress={fetchCurrentLocation}
        disabled={fetchingLocation}
      >
        <Text style={styles.locationButtonText}>
          {fetchingLocation ? 'Fetching Location...' : 'Get Current Location'}
        </Text>
      </TouchableOpacity>

      {mapRegion && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
          >
            <Marker
              coordinate={{
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
              }}
              title="Your Current Location"
              description={locationInfo.locationText}
            />
          </MapView>
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={sendEmergency}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'SEND SOS'}
        </Text>
      </TouchableOpacity>

      {(loading || fetchingLocation) && (
        <ActivityIndicator size="large" color="red" style={{ marginTop: 20 }} />
      )}

      {locationInfo && (
        <View style={styles.card}>
          <Text style={styles.infoTitle}>Captured Location</Text>
          <Text style={styles.infoText}>Latitude: {locationInfo.latitude}</Text>
          <Text style={styles.infoText}>Longitude: {locationInfo.longitude}</Text>
          <Text style={styles.infoText}>Address: {locationInfo.locationText}</Text>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  activeType: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeText: {
    color: '#333',
    fontWeight: '600',
  },
  activeTypeText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    textAlignVertical: 'top',
    minHeight: 120,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    height: 250,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  button: {
    backgroundColor: 'red',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 25,
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