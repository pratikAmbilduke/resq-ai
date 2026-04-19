import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '../config';

// ✅ Design system
import { COLORS, SPACING, RADIUS } from '../theme';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';

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
        Alert.alert(
          'Permission Required',
          'Please allow gallery access to upload profile image.'
        );
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
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1 }}
        size="large"
        color={COLORS.primary}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>
          Manage your personal and emergency information
        </Text>
      </View>

      <AppCard style={styles.profileTopCard}>
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
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Safety Information</Text>

        <Text style={styles.label}>Name</Text>
        <AppInput value={name} editable={false} />

        <Text style={styles.label}>Email</Text>
        <AppInput value={email} editable={false} />

        <Text style={styles.label}>Blood Group</Text>
        <AppInput
          placeholder="e.g. O+"
          value={bloodGroup}
          onChangeText={setBloodGroup}
        />

        <Text style={styles.label}>Emergency Contact</Text>
        <AppInput
          placeholder="Phone number"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Medical Notes</Text>
        <AppInput
          placeholder="Allergies, conditions..."
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          multiline
          style={styles.multiline}
        />

        <Text style={styles.label}>Address</Text>
        <AppInput
          placeholder="Your address"
          value={address}
          onChangeText={setAddress}
        />

        <View style={{ marginTop: 18 }}>
          <AppButton
            title="Save Profile"
            onPress={handleSave}
            color={COLORS.success}
          />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    flexGrow: 1,
    paddingBottom: 100,
  },

  headerCard: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  profileTopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.primary,
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
    color: COLORS.textPrimary,
  },
  emailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  changePhotoText: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 8,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: COLORS.textSecondary,
  },

  multiline: {
    height: 80,
    borderRadius: RADIUS.md,
  },
});