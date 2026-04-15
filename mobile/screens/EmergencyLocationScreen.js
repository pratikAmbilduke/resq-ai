import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import API_BASE_URL from '../config';

export default function EmergencyLocationScreen({ route }) {
  const [emergencyData, setEmergencyData] = useState(route.params.emergency);

  const region = {
    latitude: emergencyData.latitude,
    longitude: emergencyData.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const updateStatus = async (newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency/${emergencyData.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      const updatedEmergency = {
        ...emergencyData,
        status: newStatus,
      };

      setEmergencyData(updatedEmergency);

      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      console.log('Status Update Error:', error);
      Alert.alert('Error', 'Failed to update emergency status');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📍 Emergency Location</Text>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={region}>
          <Marker
            coordinate={{
              latitude: emergencyData.latitude,
              longitude: emergencyData.longitude,
            }}
            title={`Emergency: ${emergencyData.type}`}
            description={emergencyData.location_text}
          />
        </MapView>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Type:</Text>
        <Text style={styles.value}>{emergencyData.type}</Text>

        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{emergencyData.description}</Text>

        <Text style={styles.label}>Latitude:</Text>
        <Text style={styles.value}>{emergencyData.latitude}</Text>

        <Text style={styles.label}>Longitude:</Text>
        <Text style={styles.value}>{emergencyData.longitude}</Text>

        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{emergencyData.location_text}</Text>

        <Text style={styles.label}>Current Status:</Text>
        <Text style={styles.statusValue}>{emergencyData.status}</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.statusButton, styles.pendingButton]}
          onPress={() => updateStatus('pending')}
        >
          <Text style={styles.buttonText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusButton, styles.progressButton]}
          onPress={() => updateStatus('in_progress')}
        >
          <Text style={styles.buttonText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusButton, styles.resolvedButton]}
          onPress={() => updateStatus('resolved')}
        >
          <Text style={styles.buttonText}>Resolved</Text>
        </TouchableOpacity>
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
  statusValue: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonGroup: {
    marginTop: 25,
    gap: 12,
  },
  statusButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  pendingButton: {
    backgroundColor: '#ffc107',
  },
  progressButton: {
    backgroundColor: '#17a2b8',
  },
  resolvedButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});