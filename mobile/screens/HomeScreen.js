import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import API_BASE_URL from '../config';

export default function HomeScreen({ navigation, onLogout }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const intervalRef = useRef(null);

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const sendLocation = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      await fetch(`${API_BASE_URL}/update-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: parseInt(userId, 10),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });

      console.log('Location sent');
    } catch (error) {
      console.log('Location Error:', error);
    }
  };

  const loadProfileData = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/${userId}`);
      const data = await response.json();

      if (data && !data.error) {
        setEmergencyContactPhone(data.emergency_contact_phone || '');
      } else {
        setEmergencyContactPhone('');
      }
    } catch (error) {
      console.log('Profile load error:', error);
      setEmergencyContactPhone('');
    }
  };

  const loadHomeData = async () => {
    try {
      const storedName = await AsyncStorage.getItem('userName');
      const storedRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      const storedProfileImage = await AsyncStorage.getItem('userProfileImage');

      console.log('HomeScreen stored role:', storedRole);

      setUserName(storedName || 'User');
      setUserRole(storedRole || 'user');
      setProfileImage(storedProfileImage || '');

      if (!userId) {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        setEmergencyContactPhone('');
        return;
      }

      await loadProfileData(userId);

      if ((storedRole || 'user') === 'admin') {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        setPendingCount(0);
        setProgressCount(0);
        setResolvedCount(0);
        return;
      }

      const pending = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'pending'
      ).length;

      const progress = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'in progress'
      ).length;

      const resolved = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'resolved'
      ).length;

      setPendingCount(pending);
      setProgressCount(progress);
      setResolvedCount(resolved);
    } catch (error) {
      console.log('Home load error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
      sendLocation();

      clearPolling();
      intervalRef.current = setInterval(() => {
        loadHomeData();
        sendLocation();
      }, 5000);

      return () => {
        clearPolling();
      };
    }, [])
  );

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  const handleLogout = async () => {
    try {
      clearPolling();

      await AsyncStorage.multiRemove([
        'userId',
        'userName',
        'userEmail',
        'userRole',
        'userProfileImage',
      ]);

      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log('Logout Error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const callPhoneNumber = async (phoneNumber) => {
    try {
      if (!phoneNumber) {
        Alert.alert('Error', 'Phone number not available');
        return;
      }

      const url = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('Error', 'Calling is not supported on this device');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log('Call Error:', error);
      Alert.alert('Error', 'Unable to make call');
    }
  };

  const handleCall112 = () => {
    callPhoneNumber('112');
  };

  const handleCallEmergencyContact = () => {
    if (!emergencyContactPhone) {
      Alert.alert(
        'No Emergency Contact',
        'Please save an emergency contact in your Profile first.'
      );
      return;
    }

    callPhoneNumber(emergencyContactPhone);
  };

  const firstName = userName ? userName.split(' ')[0] : 'User';

  const renderProfileImage = () => {
    if (profileImage) {
      return <Image source={{ uri: profileImage }} style={styles.profileImage} />;
    }

    return (
      <View style={styles.profilePlaceholder}>
        <Text style={styles.profilePlaceholderText}>
          {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
    );
  };

  if (userRole === 'admin') {
    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.profileHeaderLeft}
            onPress={() => navigation.navigate('ProfileTab')}
            activeOpacity={0.9}
          >
            {renderProfileImage()}
            <View>
              <Text style={styles.headerGreeting}>Welcome back</Text>
              <Text style={styles.headerName}>{firstName}</Text>
              <Text style={styles.headerRole}>Admin</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutChip} onPress={handleLogout}>
            <Text style={styles.logoutChipText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCardAdmin}>
          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroSubtitle}>
            Manage requests, track live movement, and monitor emergency operations.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionSubtext}>Important admin tools</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryAdminCard}
          onPress={() => navigation.navigate('RequestsTab')}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.primaryAdminTitle}>🛠 Request Management</Text>
            <Text style={styles.primaryAdminSubtitle}>
              Open dashboard, priorities, and request actions
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAdminCard}
          onPress={() => navigation.navigate('AdminMapTab')}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.secondaryAdminTitle}>📍 Live Map</Text>
            <Text style={styles.secondaryAdminSubtitle}>
              View emergency locations and providers
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.profileHeaderLeft}
          onPress={() => navigation.navigate('ProfileTab')}
          activeOpacity={0.9}
        >
          {renderProfileImage()}
          <View>
            <Text style={styles.headerGreeting}>Hello</Text>
            <Text style={styles.headerName}>{firstName}</Text>
            <Text style={styles.headerRole}>Stay safe today</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutChip} onPress={handleLogout}>
          <Text style={styles.logoutChipText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroCardUser}>
        <Text style={styles.heroTitle}>Emergency Support</Text>
        <Text style={styles.heroSubtitle}>
          Need urgent help? Send a request instantly and track updates live.
        </Text>
      </View>

      <View style={styles.sosSection}>
        <Text style={styles.sectionTitle}>Emergency Action</Text>
        <Text style={styles.sectionSubtext}>Fastest way to request immediate help</Text>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => navigation.navigate('Emergency')}
          activeOpacity={0.9}
        >
          <View style={styles.sosInnerRing}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionRow}>
        <TouchableOpacity style={styles.quickActionRed} onPress={handleCall112} activeOpacity={0.9}>
          <Text style={styles.quickActionEmoji}>📞</Text>
          <Text style={styles.quickActionTitle}>Call 112</Text>
          <Text style={styles.quickActionSubtitle}>National emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionGreen}
          onPress={handleCallEmergencyContact}
          activeOpacity={0.9}
        >
          <Text style={styles.quickActionEmoji}>👤</Text>
          <Text style={styles.quickActionTitle}>Contact</Text>
          <Text style={styles.quickActionSubtitle}>Emergency person</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.emergencyOptionsCard}
        onPress={() => navigation.navigate('EmergencyCall')}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.emergencyOptionsTitle}>🚨 Emergency Call Options</Text>
          <Text style={styles.emergencyOptionsSubtitle}>
            Ambulance, police, fire and 112 quick access
          </Text>
        </View>
        <Text style={styles.arrowWhite}>›</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Request Overview</Text>
        <Text style={styles.sectionSubtext}>Your current emergency activity</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusCard, styles.pendingCard]}>
          <Text style={styles.statusCount}>{pendingCount}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </View>

        <View style={[styles.statusCard, styles.progressCard]}>
          <Text style={styles.statusCount}>{progressCount}</Text>
          <Text style={styles.statusLabel}>In Progress</Text>
        </View>

        <View style={[styles.statusCard, styles.resolvedCard]}>
          <Text style={styles.statusCount}>{resolvedCount}</Text>
          <Text style={styles.statusLabel}>Resolved</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Services</Text>
        <Text style={styles.sectionSubtext}>Quick links to important sections</Text>
      </View>

      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigation.navigate('HistoryTab')}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.serviceTitle}>📜 History</Text>
          <Text style={styles.serviceSubtitle}>See all previous emergency requests</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigation.navigate('DashboardTab')}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.serviceTitle}>📊 Dashboard</Text>
          <Text style={styles.serviceSubtitle}>Track request updates and progress</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => navigation.navigate('ProfileTab')}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.serviceTitle}>👤 Profile</Text>
          <Text style={styles.serviceSubtitle}>Manage medical and contact details</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerGreeting: {
    color: '#6b7280',
    fontSize: 13,
  },
  headerName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerRole: {
    color: '#0d6efd',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
  },
  logoutChip: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  logoutChipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  heroCardUser: {
    backgroundColor: '#0d6efd',
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
  },
  heroCardAdmin: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#e7f0ff',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
  },

  sosSection: {
    marginBottom: 22,
    alignItems: 'center',
  },
  sosButton: {
    marginTop: 16,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  sosInnerRing: {
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: '#ff5d55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  quickActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  quickActionRed: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1d2d0',
  },
  quickActionGreen: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d4ead9',
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },

  emergencyOptionsCard: {
    backgroundColor: '#6f42c1',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emergencyOptionsTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  emergencyOptionsSubtitle: {
    color: '#efe7ff',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 240,
  },
  arrowWhite: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statusCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#fff3cd',
  },
  progressCard: {
    backgroundColor: '#d9ecff',
  },
  resolvedCard: {
    backgroundColor: '#dff5e3',
  },
  statusCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusLabel: {
    fontSize: 13,
    marginTop: 5,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },

  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },

  primaryAdminCard: {
    backgroundColor: '#0d6efd',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryAdminTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryAdminSubtitle: {
    color: '#e7f0ff',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 250,
  },
  secondaryAdminCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryAdminTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryAdminSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 250,
  },

  arrow: {
    fontSize: 30,
    color: '#9ca3af',
    fontWeight: '300',
  },
});