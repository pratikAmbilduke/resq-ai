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

  const [aiType, setAiType] = useState('');
  const [aiPriority, setAiPriority] = useState('');
  const [aiSummary, setAiSummary] = useState('');

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
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setFetchingLocation(false);
    }
  };

  const analyzeEmergencyWithAI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze-emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          selected_type: type,
        }),
      });

      const data = await response.json();

      return {
        predicted_type: data?.predicted_type || type,
        predicted_priority: data?.predicted_priority || 'medium',
        ai_summary: data?.ai_summary || description,
      };
    } catch (error) {
      console.log('AI analyze error:', error);
      return {
        predicted_type: type,
        predicted_priority: 'medium',
        ai_summary: description,
      };
    }
  };

  const sendEmergency = async () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Enter description');
      return;
    }

    if (!locationInfo) {
      Alert.alert('Validation', 'Get location first');
      return;
    }

    try {
      setLoading(true);

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const aiResult = await analyzeEmergencyWithAI();

      setAiType(aiResult.predicted_type);
      setAiPriority(aiResult.predicted_priority);
      setAiSummary(aiResult.ai_summary);

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

      if (data?.error) {
        Alert.alert('Error', data.error);
        return;
      }

      const savedType = data?.data?.type || aiResult.predicted_type || type;
      const savedPriority =
        data?.data?.priority || aiResult.predicted_priority || 'medium';
      const savedSummary =
        data?.data?.ai_summary || aiResult.ai_summary || description;

      setAiType(savedType);
      setAiPriority(savedPriority);
      setAiSummary(savedSummary);

      Alert.alert(
        '🚨 Emergency Sent',
        `Type: ${savedType}\nPriority: ${savedPriority}\nAI: ${savedSummary}`
      );

      setDescription('');
      navigation.navigate('HistoryTab');
    } catch (error) {
      console.log('Send emergency error:', error);
      Alert.alert('Error', 'Error sending emergency');
    } finally {
      setLoading(false);
    }
  };

  const renderPriorityColor = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'critical') return '#dc2626';
    if (value === 'high') return '#ea580c';
    if (value === 'medium') return '#2563eb';
    if (value === 'low') return '#16a34a';

    return '#6b7280';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={['#ff3b30', '#ff6b6b']} style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Request</Text>
        <Text style={styles.headerSub}>Quick help is just one tap away</Text>
      </LinearGradient>

      <Text style={styles.label}>Emergency Type</Text>
      <View style={styles.typeRow}>
        {[
          { key: 'medical', icon: '🏥', label: 'Medical' },
          { key: 'accident', icon: '🚗', label: 'Accident' },
          { key: 'fire', icon: '🔥', label: 'Fire' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.typeCard, type === item.key && styles.activeType]}
            onPress={() => setType(item.key)}
            activeOpacity={0.9}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.typeText, type === item.key && styles.activeTypeText]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Describe Situation</Text>
      <TextInput
        style={styles.input}
        placeholder="Explain what happened..."
        placeholderTextColor="#94a3b8"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={styles.locationBtn}
        onPress={fetchCurrentLocation}
        activeOpacity={0.9}
      >
        <Text style={styles.locationText}>
          {fetchingLocation ? 'Fetching location...' : '📍 Detect My Location'}
        </Text>
      </TouchableOpacity>

      {mapRegion && (
        <View style={styles.mapWrap}>
          <MapView style={styles.map} region={mapRegion}>
            <Marker coordinate={mapRegion} />
          </MapView>
        </View>
      )}

      {locationInfo && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>Detected Location</Text>
          <Text style={styles.locationValue}>{locationInfo.locationText}</Text>
        </View>
      )}

      {(aiType || aiPriority || aiSummary) && (
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>AI Emergency Analysis</Text>

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Predicted Type:</Text>
            <Text style={styles.aiValue}>{aiType || '-'}</Text>
          </View>

          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Predicted Priority:</Text>
            <Text style={[styles.aiPriority, { color: renderPriorityColor(aiPriority) }]}>
              {aiPriority || '-'}
            </Text>
          </View>

          <View style={styles.aiSummaryWrap}>
            <Text style={styles.aiLabel}>AI Summary:</Text>
            <Text style={styles.aiSummaryText}>{aiSummary || '-'}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.sosBtn}
        onPress={sendEmergency}
        activeOpacity={0.9}
      >
        <Text style={styles.sosText}>
          {loading ? 'Sending...' : '🚨 SEND EMERGENCY'}
        </Text>
      </TouchableOpacity>

      {(loading || fetchingLocation) && (
        <ActivityIndicator
          size="large"
          color="#ff3b30"
          style={styles.loader}
        />
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
  activeTypeText: {
    color: '#fff',
  },

  icon: {
    fontSize: 26,
  },

  typeText: {
    marginTop: 6,
    fontWeight: 'bold',
    color: '#111827',
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    minHeight: 100,
    elevation: 2,
    textAlignVertical: 'top',
    color: '#111827',
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
    color: '#111827',
  },

  locationValue: {
    marginTop: 5,
    color: '#555',
    lineHeight: 20,
  },

  aiCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 12,
  },

  aiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },

  aiLabel: {
    fontWeight: '600',
    color: '#334155',
  },

  aiValue: {
    color: '#111827',
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  aiPriority: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },

  aiSummaryWrap: {
    marginTop: 4,
  },

  aiSummaryText: {
    marginTop: 6,
    color: '#475569',
    lineHeight: 20,
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

  loader: {
    marginTop: 15,
  },
});