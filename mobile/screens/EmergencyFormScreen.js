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

  // 📍 LOCATION
  const fetchCurrentLocation = async () => {
    try {
      setFetchingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = current.coords;

      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });

      let locationText = 'Auto captured location';

      if (geo.length > 0) {
        const p = geo[0];
        locationText = [p.name, p.street, p.city, p.region, p.country]
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
    } catch {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setFetchingLocation(false);
    }
  };

  // 🚨 SEND
  const sendEmergency = async () => {
    if (!description.trim()) return Alert.alert('Enter description');
    if (!locationInfo) return Alert.alert('Get location first');

    try {
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

      if (data.error) return Alert.alert(data.error);

      Alert.alert('🚨 Emergency Sent Successfully');
      navigation.navigate('HistoryTab');
      setDescription('');
    } catch {
      Alert.alert('Error sending emergency');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* HEADER */}
      <LinearGradient colors={['#ff3b30', '#ff6b6b']} style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Request</Text>
        <Text style={styles.headerSub}>Quick help is just one tap away</Text>
      </LinearGradient>

      {/* TYPE */}
      <Text style={styles.label}>Emergency Type</Text>
      <View style={styles.typeRow}>
        {[
          { key: 'medical', icon: '🏥', label: 'Medical' },
          { key: 'accident', icon: '🚗', label: 'Accident' },
          { key: 'fire', icon: '🔥', label: 'Fire' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.typeCard,
              type === item.key && styles.activeType,
            ]}
            onPress={() => setType(item.key)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text
              style={[
                styles.typeText,
                type === item.key && { color: '#fff' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DESCRIPTION */}
      <Text style={styles.label}>Describe Situation</Text>
      <TextInput
        style={styles.input}
        placeholder="Explain what happened..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* LOCATION BUTTON */}
      <TouchableOpacity style={styles.locationBtn} onPress={fetchCurrentLocation}>
        <Text style={styles.locationText}>
          {fetchingLocation ? 'Fetching location...' : '📍 Detect My Location'}
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

      {/* LOCATION TEXT */}
      {locationInfo && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Detected Location</Text>
          <Text style={styles.locationValue}>{locationInfo.locationText}</Text>
        </View>
      )}

      {/* SOS BUTTON */}
      <TouchableOpacity style={styles.sosBtn} onPress={sendEmergency}>
        <Text style={styles.sosText}>
          {loading ? 'Sending...' : '🚨 SEND EMERGENCY'}
        </Text>
      </TouchableOpacity>

      {(loading || fetchingLocation) && (
        <ActivityIndicator size="large" color="#ff3b30" style={{ marginTop: 15 }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f8fafc',
    flexGrow: 1,
  },

  header: {
    padding: 22,
    borderRadius: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#fff',
    marginTop: 5,
    opacity: 0.9,
  },

  label: {
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#333',
  },

  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },

  typeCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },

  activeType: {
    backgroundColor: '#ff3b30',
  },

  icon: {
    fontSize: 26,
  },

  typeText: {
    marginTop: 6,
    fontWeight: 'bold',
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    minHeight: 100,
    elevation: 2,
  },

  locationBtn: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 14,
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
    borderRadius: 16,
    overflow: 'hidden',
  },

  map: {
    flex: 1,
  },

  locationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
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
    borderRadius: 16,
    marginTop: 25,
    alignItems: 'center',
    elevation: 4,
  },

  sosText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});