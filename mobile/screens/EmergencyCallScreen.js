import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Emergency Call</Text>
        <Text style={styles.heroSubtitle}>
          Quickly connect to essential emergency services with one tap.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.callCard, styles.ambulanceCard]}
        activeOpacity={0.9}
        onPress={() => makeCall('108')}
      >
        <View>
          <Text style={styles.callTitle}>🚑 Ambulance</Text>
          <Text style={styles.callSubtitle}>Medical emergency response</Text>
        </View>
        <Text style={styles.callNumber}>108</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callCard, styles.policeCard]}
        activeOpacity={0.9}
        onPress={() => makeCall('100')}
      >
        <View>
          <Text style={styles.callTitle}>🚓 Police</Text>
          <Text style={styles.callSubtitle}>Law and safety support</Text>
        </View>
        <Text style={styles.callNumber}>100</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callCard, styles.fireCard]}
        activeOpacity={0.9}
        onPress={() => makeCall('101')}
      >
        <View>
          <Text style={styles.callTitle}>🚒 Fire</Text>
          <Text style={styles.callSubtitle}>Fire brigade assistance</Text>
        </View>
        <Text style={styles.callNumber}>101</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callCard, styles.universalCard]}
        activeOpacity={0.9}
        onPress={() => makeCall('112')}
      >
        <View>
          <Text style={styles.callTitle}>📞 Universal Emergency</Text>
          <Text style={styles.callSubtitle}>Single emergency helpline</Text>
        </View>
        <Text style={styles.callNumber}>112</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Before you call</Text>
        <Text style={styles.infoText}>
          Be ready to share your exact location, the type of emergency, and whether anyone is injured.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
    paddingBottom: 100,
  },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  callCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ambulanceCard: {
    backgroundColor: '#ffe3e3',
  },
  policeCard: {
    backgroundColor: '#e7f0ff',
  },
  fireCard: {
    backgroundColor: '#fff1e6',
  },
  universalCard: {
    backgroundColor: '#efe7ff',
  },

  callTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  callSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  callNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
  },
});