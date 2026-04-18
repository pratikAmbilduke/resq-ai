import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';

export default function EmergencyCallScreen() {

  const makeCall = async (number) => {
    try {
      const phoneNumber = `tel:${number}`;

      const supported = await Linking.canOpenURL(phoneNumber);

      if (!supported) {
        Alert.alert('Error', 'Calling not supported on this device');
        return;
      }

      await Linking.openURL(phoneNumber);
    } catch (error) {
      console.log('Call error:', error);
      Alert.alert('Error', 'Failed to make call');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Emergency Call</Text>

      <TouchableOpacity
        style={[styles.button, styles.ambulance]}
        onPress={() => makeCall('108')}
      >
        <Text style={styles.buttonText}>🚑 Call Ambulance (108)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.police]}
        onPress={() => makeCall('100')}
      >
        <Text style={styles.buttonText}>🚓 Call Police (100)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.fire]}
        onPress={() => makeCall('101')}
      >
        <Text style={styles.buttonText}>🚒 Call Fire (101)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.allEmergency]}
        onPress={() => makeCall('112')}
      >
        <Text style={styles.buttonText}>📞 All-in-One Emergency (112)</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ambulance: {
    backgroundColor: '#dc3545',
  },
  police: {
    backgroundColor: '#0d6efd',
  },
  fire: {
    backgroundColor: '#fd7e14',
  },
  allEmergency: {
    backgroundColor: '#6f42c1',
  },
});