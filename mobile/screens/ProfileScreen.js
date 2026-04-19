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
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '../config';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [address, setAddress] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const loadProfile = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedImage = await AsyncStorage.getItem('userProfileImage');

      setName(storedName || '');
      setEmail(storedEmail || '');
      setProfileImage(storedImage || '');

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

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow gallery access to upload profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await AsyncStorage.setItem('userProfileImage', imageUri);
        Alert.alert('Success', 'Profile photo updated');
      }
    } catch (error) {
      console.log('Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

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
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0d6efd" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>My Profile</Text>
        <Text style={styles.heroSubtitle}>
          Manage your safety information, emergency contact, and medical details.
        </Text>
      </View>

      <View style={styles.profileCard}>
        <TouchableOpacity style={styles.imageWrapper} onPress={pickImage} activeOpacity={0.9}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                {name ? name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.nameText}>{name || 'User'}</Text>
          <Text style={styles.emailText}>{email || 'No email available'}</Text>
          <Text style={styles.changePhotoText}>Tap image to change photo</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Safety Information</Text>

        <Text style={styles.label}>Blood Group</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. O+"
          placeholderTextColor="#9ca3af"
          value={bloodGroup}
          onChangeText={setBloodGroup}
        />

        <Text style={styles.label}>Emergency Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
        />

        <Text style={styles.label}>Medical Notes</Text>
        <TextInput
          style={[styles.input, styles.multiInput]}
          placeholder="Allergies, medical conditions, important notes"
          placeholderTextColor="#9ca3af"
          multiline
          value={medicalNotes}
          onChangeText={setMedicalNotes}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.multiInput]}
          placeholder="Your address"
          placeholderTextColor="#9ca3af"
          multiline
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
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

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: {
    marginRight: 16,
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  placeholderImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  emailText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  changePhotoText: {
    fontSize: 13,
    color: '#0d6efd',
    marginTop: 8,
    fontWeight: '600',
  },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
    color: '#4b5563',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#f9fafb',
    color: '#111827',
    fontSize: 15,
  },
  multiInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 22,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});