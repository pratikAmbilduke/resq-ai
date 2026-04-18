import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [address, setAddress] = useState('');

  const loadProfile = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      const storedEmail = await AsyncStorage.getItem('userEmail');

      setName(storedName || '');
      setEmail(storedEmail || '');

      if (!userId) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
      const data = await res.json();

      if (data && !data.error) {
        setBloodGroup(data.blood_group || '');
        setEmergencyContactPhone(data.emergency_contact_phone || '');
        setMedicalNotes(data.medical_notes || '');
        setAddress(data.address || '');
      }
    } catch (error) {
      console.log('Profile load error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blood_group: bloodGroup,
          emergency_contact_phone: emergencyContactPhone,
          medical_notes: medicalNotes,
          address: address,
        }),
      });

      const data = await res.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.log('Save profile error:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>

        <Text style={styles.label}>Blood Group</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. O+"
          value={bloodGroup}
          onChangeText={setBloodGroup}
        />

        <Text style={styles.label}>Emergency Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          keyboardType="phone-pad"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
        />

        <Text style={styles.label}>Medical Notes</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Allergies, conditions..."
          multiline
          value={medicalNotes}
          onChangeText={setMedicalNotes}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Your address"
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f6f8',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#555',
  },
  value: {
    fontSize: 16,
    marginTop: 4,
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});