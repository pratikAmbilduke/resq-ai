import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function EmergencyCallScreen() {
  const makeCall = async (number, label) => {
    try {
      const phoneUrl = `tel:${number}`;
      const supported = await Linking.canOpenURL(phoneUrl);

      if (!supported) {
        Alert.alert('Error', 'Calling is not supported on this device');
        return;
      }

      await Linking.openURL(phoneUrl);
    } catch (error) {
      console.log('Call error:', error);
      Alert.alert('Error', `Unable to call ${label}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#ff416c', '#ff4b2b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Emergency Call</Text>
        <Text style={styles.heroSubtitle}>
          Fast access to important emergency helpline numbers
        </Text>
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.cardWrap}
        onPress={() => makeCall('112', 'National Emergency')}
      >
        <LinearGradient
          colors={['#ef4444', '#dc2626']}
          style={styles.primaryCard}
        >
          <Text style={styles.cardEmoji}>🚨</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>National Emergency</Text>
            <Text style={styles.cardSubtitle}>Call 112 immediately</Text>
          </View>
          <Text style={styles.cardNumber}>112</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.gridRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.gridCardWrap}
          onPress={() => makeCall('100', 'Police')}
        >
          <View style={[styles.gridCard, styles.policeCard]}>
            <Text style={styles.gridEmoji}>👮</Text>
            <Text style={styles.gridTitle}>Police</Text>
            <Text style={styles.gridNumber}>100</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.gridCardWrap}
          onPress={() => makeCall('101', 'Fire')}
        >
          <View style={[styles.gridCard, styles.fireCard]}>
            <Text style={styles.gridEmoji}>🔥</Text>
            <Text style={styles.gridTitle}>Fire</Text>
            <Text style={styles.gridNumber}>101</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.gridCardWrap}
          onPress={() => makeCall('102', 'Ambulance')}
        >
          <View style={[styles.gridCard, styles.ambulanceCard]}>
            <Text style={styles.gridEmoji}>🚑</Text>
            <Text style={styles.gridTitle}>Ambulance</Text>
            <Text style={styles.gridNumber}>102</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.gridCardWrap}
          onPress={() => makeCall('108', 'Medical Emergency')}
        >
          <View style={[styles.gridCard, styles.medicalCard]}>
            <Text style={styles.gridEmoji}>🏥</Text>
            <Text style={styles.gridTitle}>Medical</Text>
            <Text style={styles.gridNumber}>108</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Important Note</Text>
        <Text style={styles.infoText}>
          Use these numbers only in real emergencies. For in-app SOS support,
          use the main emergency button from the home screen.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 120,
    backgroundColor: '#f3f5f7',
  },

  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 25,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#ffe4e6',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  cardWrap: {
    marginBottom: 16,
  },
  primaryCard: {
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 30,
    marginRight: 14,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#ffe4e6',
    fontSize: 13,
    marginTop: 4,
  },
  cardNumber: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },

  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  gridCardWrap: {
    width: '48%',
  },
  gridCard: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  policeCard: {
    backgroundColor: '#dbeafe',
  },
  fireCard: {
    backgroundColor: '#fee2e2',
  },
  ambulanceCard: {
    backgroundColor: '#dcfce7',
  },
  medicalCard: {
    backgroundColor: '#ede9fe',
  },
  gridEmoji: {
    fontSize: 28,
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  gridNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
});