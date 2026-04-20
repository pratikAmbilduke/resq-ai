import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  View,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '../config';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [address, setAddress] = useState('');

  const loadProfile = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedProfileImage = await AsyncStorage.getItem('userProfileImage');

      setName(storedName || '');
      setEmail(storedEmail || '');
      setProfileImage(storedProfileImage || '');

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

  const handlePickImage = async () => {
    try {
      setUploadingImage(true);

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery permission is needed to upload profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const imageUri = result.assets?.[0]?.uri || '';

      if (!imageUri) {
        Alert.alert('Error', 'Image not selected');
        return;
      }

      setProfileImage(imageUri);
      await AsyncStorage.setItem('userProfileImage', imageUri);

      Alert.alert('Success', 'Profile image updated');
    } catch (error) {
      console.log('Pick image error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setProfileImage('');
      await AsyncStorage.removeItem('userProfileImage');
      Alert.alert('Success', 'Profile image removed');
    } catch (error) {
      console.log('Remove image error:', error);
      Alert.alert('Error', 'Failed to remove image');
    }
  };

  const handleSave = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      setSaving(true);

      const res = await fetch(`${API_BASE_URL}/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    } finally {
      setSaving(false);
    }
  };

  const getInitial = () => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: '#f3f5f7' }}
        size="large"
        color="#0d6efd"
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>My Profile</Text>
        <Text style={styles.heroSubtitle}>
          Manage your personal, medical, and emergency information
        </Text>
      </View>

      <View style={styles.avatarSection}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>{getInitial()}</Text>
          </View>
        )}

        <Text style={styles.profileName}>{name || 'User'}</Text>
        <Text style={styles.profileEmail}>{email || 'No email available'}</Text>

        <View style={styles.imageButtonRow}>
          <TouchableOpacity
            style={[styles.imageButton, styles.uploadButton]}
            onPress={handlePickImage}
            disabled={uploadingImage}
            activeOpacity={0.9}
          >
            <Text style={styles.imageButtonText}>
              {uploadingImage ? 'Uploading...' : 'Upload Image'}
            </Text>
          </TouchableOpacity>

          {profileImage ? (
            <TouchableOpacity
              style={[styles.imageButton, styles.removeButton]}
              onPress={handleRemoveImage}
              activeOpacity={0.9}
            >
              <Text style={styles.imageButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Info</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={name}
          editable={false}
          placeholder="Name"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={email}
          editable={false}
          placeholder="Email"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your address"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medical Info</Text>

        <Text style={styles.label}>Blood Group</Text>
        <TextInput
          style={styles.input}
          value={bloodGroup}
          onChangeText={setBloodGroup}
          placeholder="e.g. O+"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Medical Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          placeholder="Allergies, conditions, important notes..."
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emergency Contact</Text>

        <Text style={styles.label}>Emergency Contact Number</Text>
        <TextInput
          style={styles.input}
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          placeholder="Enter phone number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.9}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 120,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
  },

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
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

  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  imageButtonRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  imageButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  uploadButton: {
    backgroundColor: '#0d6efd',
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#111827',
    fontSize: 15,
  },
  disabledInput: {
    backgroundColor: '#eef2f7',
    color: '#6b7280',
  },
  textArea: {
    minHeight: 100,
  },

  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});