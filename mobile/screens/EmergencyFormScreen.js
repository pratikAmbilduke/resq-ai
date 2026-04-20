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
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

export default function EmergencyScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [type, setType] = useState('medical');
  const [description, setDescription] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  // 📍 Get Location
  const fetchCurrentLocation = async () => {
    try {
      setFetchingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;

      const geo = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let locationText = 'Auto captured location';

      if (geo.length > 0) {
        const place = geo[0];
        locationText = [
          place.name,
          place.street,
          place.city,
          place.region,
          place.country,
        ]
          .filter(Boolean)
          .join(', ');
      }

      setLocationInfo({ latitude, longitude, locationText });

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setFetchingLocation(false);
    }
  };

  // 🚨 Send Emergency
  const sendEmergency = async () => {
    try {
      if (!description.trim()) {
        Alert.alert('Please enter description');
        return;
      }

      if (!locationInfo) {
        Alert.alert('Please get location first');
        return;
      }

      setLoading(true);

      const userId = await AsyncStorage.getItem('userId');

      const res = await fetch(`${API_BASE_URL}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
          location_text: locationInfo.locationText,
          user_id: parseInt(userId, 10),
        }),
      });

      const data = await res.json();

      if (data.error) {
        Alert.alert(data.error);
        return;
      }

      Alert.alert('Success 🚨', 'Emergency Sent');

      // ⚠️ IMPORTANT: match your navigation name
      navigation.navigate('HistoryTab');

      setDescription('');
    } catch (err) {
      Alert.alert('Error sending emergency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* HEADER */}
      <LinearGradient
        colors={['#ff416c', '#ff4b2b']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🚨 Emergency</Text>
        <Text style={styles.headerSub}>
          Send help request instantly
        </Text>
      </LinearGradient>

      {/* TYPE */}
      <Text style={styles.label}>Select Type</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeCard,
            type === 'medical' && styles.activeType,
          ]}
          onPress={() => setType('medical')}
        >
          <Text style={styles.icon}>🏥</Text>
          <Text style={styles.typeText}>Medical</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeCard,
            type === 'accident' && styles.activeType,
          ]}
          onPress={() => setType('accident')}
        >
          <Text style={styles.icon}>🚗</Text>
          <Text style={styles.typeText}>Accident</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeCard,
            type === 'fire' && styles.activeType,
          ]}
          onPress={() => setType('fire')}
        >
          <Text style={styles.icon}>🔥</Text>
          <Text style={styles.typeText}>Fire</Text>
        </TouchableOpacity>
      </View>

      {/* DESCRIPTION */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe emergency..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* LOCATION BUTTON */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={fetchCurrentLocation}
      >
        <Text style={styles.locationText}>
          {fetchingLocation ? 'Fetching...' : '📍 Get Location'}
        </Text>
      </TouchableOpacity>

      {/* MAP */}
      {mapRegion && (
        <View style={styles.mapWrap}>
          <MapView style={styles.map} region={mapRegion}>
            <Marker coordinate={mapRegion} />
          </MapView>
        </View>
      )}

      {/* LOCATION TEXT ONLY */}
      {locationInfo && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Location</Text>
          <Text style={styles.locationValue}>
            {locationInfo.locationText}
          </Text>
        </View>
      )}

      {/* SEND BUTTON */}
      <TouchableOpacity style={styles.sosBtn} onPress={sendEmergency}>
        <Text style={styles.sosText}>
          {loading ? 'Sending...' : 'SEND SOS'}
        </Text>
      </TouchableOpacity>

      {(loading || fetchingLocation) && (
        <ActivityIndicator size="large" color="red" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
  },

  header: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#fff',
    marginTop: 5,
  },

  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },

  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  typeCard: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },

  activeType: {
    backgroundColor: '#0d6efd',
  },

  typeText: {
    marginTop: 5,
    fontWeight: 'bold',
    color: '#111',
  },

  icon: {
    fontSize: 24,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
  },

  locationBtn: {
    backgroundColor: '#22c55e',
    padding: 14,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
  },

  locationText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  mapWrap: {
    marginTop: 15,
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
  },

  map: {
    flex: 1,
  },

  locationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
  },

  locationTitle: {
    fontWeight: 'bold',
  },

  locationValue: {
    marginTop: 5,
    color: '#555',
  },

  sosBtn: {
    backgroundColor: '#ff3b30',
    padding: 18,
    borderRadius: 15,
    marginTop: 20,
    alignItems: 'center',
  },

  sosText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});