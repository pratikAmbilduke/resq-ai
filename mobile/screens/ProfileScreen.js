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
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import SectionHeader from '../components/SectionHeader';
import AppChip from '../components/AppChip';

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

  const getInitial = () => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: COLORS.background }}
        size="large"
        color={COLORS.primary}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.pinkPurple}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>My Profile</Text>
        <Text style={styles.heroSubtitle}>
          Keep your identity, health info, and emergency contact ready.
        </Text>

        <View style={styles.heroChipRow}>
          <AppChip label="Safe Profile" type="purple" />
          <View style={{ width: 8 }} />
          <AppChip label="Quick Access" type="info" />
        </View>
      </LinearGradient>

      <AppCard style={styles.topProfileCard} variant="blue">
        <TouchableOpacity
          style={styles.imageWrapper}
          onPress={pickImage}
          activeOpacity={0.9}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.placeholderImage}
            >
              <Text style={styles.placeholderText}>{getInitial()}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.nameText}>{name || 'User'}</Text>
          <Text style={styles.emailText}>{email || 'No email available'}</Text>
          <Text style={styles.changePhotoText}>Tap image to change photo</Text>
        </View>
      </AppCard>

      <SectionHeader
        title="Personal Information"
        subtitle="Basic account details"
      />

      <AppCard variant="purple" style={styles.infoCard}>
        <Text style={styles.label}>Name</Text>
        <AppInput value={name} editable={false} />

        <Text style={styles.label}>Email</Text>
        <AppInput value={email} editable={false} />
      </AppCard>

      <SectionHeader
        title="Emergency Details"
        subtitle="Important health and contact information"
      />

      <AppCard style={styles.formCard}>
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
          placeholder="Allergies, conditions, medicines..."
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          multiline
          style={styles.multilineInput}
        />

        <Text style={styles.label}>Address</Text>
        <AppInput
          placeholder="Your address"
          value={address}
          onChangeText={setAddress}
          multiline
          style={styles.addressInput}
        />

        <View style={styles.buttonWrap}>
          <AppButton
            title="Save Profile"
            onPress={handleSave}
            variant="success"
          />
        </View>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 140,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 22,
    ...SHADOW.card,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#FCE7F3',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  topProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageWrapper: {
    marginRight: 16,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  placeholderImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: 30,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 23,
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
    color: COLORS.secondary,
    marginTop: 8,
    fontWeight: '700',
  },

  infoCard: {
    marginBottom: 22,
  },
  formCard: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: COLORS.textSecondary,
  },

  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  addressInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },

  buttonWrap: {
    marginTop: 20,
  },
});