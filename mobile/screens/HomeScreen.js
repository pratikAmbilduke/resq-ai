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
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import AppChip from '../components/AppChip';
import SectionHeader from '../components/SectionHeader';

export default function HomeScreen({ navigation, onLogout }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [profileImage, setProfileImage] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const intervalRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.82)).current;

  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startSosAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.78,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const sendLocation = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        return;
      }

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

  useEffect(() => {
    startSosAnimation();

    return () => {
      clearPolling();
    };
  }, []);

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
  const totalRequests = pendingCount + progressCount + resolvedCount;

  const renderProfileImage = () => {
    if (profileImage) {
      return <Image source={{ uri: profileImage }} style={styles.profileImage} />;
    }

    return (
      <LinearGradient colors={GRADIENTS.primary} style={styles.profilePlaceholder}>
        <Text style={styles.profilePlaceholderText}>
          {firstName ? firstName.charAt(0).toUpperCase() : 'U'}
        </Text>
      </LinearGradient>
    );
  };

  if (userRole === 'admin') {
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={GRADIENTS.dark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.adminHeroCard}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.profileHeaderLeft}
              onPress={() => navigation.navigate('ProfileTab')}
              activeOpacity={0.9}
            >
              {renderProfileImage()}
              <View>
                <Text style={styles.headerGreetingLight}>Welcome back</Text>
                <Text style={styles.headerNameLight}>{firstName}</Text>
                <Text style={styles.headerRoleLight}>Admin</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutChipDark} onPress={handleLogout}>
              <Text style={styles.logoutChipText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroSubtitleAdmin}>
            Manage requests, priorities, and live operations from one place.
          </Text>
        </LinearGradient>

        <SectionHeader
          title="Admin Tools"
          subtitle="Everything important in one place"
        />

        <TouchableOpacity
          style={styles.primaryAdminCard}
          onPress={() => navigation.navigate('RequestsTab')}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adminPrimaryGradient}
          >
            <View style={styles.adminCardText}>
              <Text style={styles.primaryAdminTitle}>Request Management</Text>
              <Text style={styles.primaryAdminSubtitle}>
                Open dashboard, priorities, and request actions
              </Text>
            </View>
            <Text style={styles.arrowWhite}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAdminCard}
          onPress={() => navigation.navigate('AdminMapTab')}
          activeOpacity={0.92}
        >
          <View style={styles.adminCardText}>
            <Text style={styles.secondaryAdminTitle}>Live Map</Text>
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
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCardUser}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.profileHeaderLeft}
            onPress={() => navigation.navigate('ProfileTab')}
            activeOpacity={0.9}
          >
            {renderProfileImage()}
            <View>
              <Text style={styles.headerGreetingLight}>Hello</Text>
              <Text style={styles.headerNameLight}>{firstName}</Text>
              <Text style={styles.headerRoleLight}>Stay safe today</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutChipDark} onPress={handleLogout}>
            <Text style={styles.logoutChipText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroBottomRow}>
          <View>
            <Text style={styles.heroTitle}>Emergency Support</Text>
            <Text style={styles.heroSubtitle}>
              Need urgent help? Send a request instantly and track updates live.
            </Text>
          </View>
        </View>

        <View style={styles.heroStatsCard}>
          <View>
            <Text style={styles.heroStatsNumber}>{totalRequests}
            </Text>
            <Text style={styles.heroStatsLabel}>Total Requests</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroChipArea}>
            <AppChip label="Live Tracking" type="info" />
            <View style={styles.heroChipSpacer} />
            <AppChip label="Fast Response" type="purple" />
          </View>
        </View>
      </LinearGradient>

      <SectionHeader
        title="Emergency Action"
        subtitle="Fastest way to request immediate help"
      />

      <View style={styles.sosSection}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Animated.View
            style={[
              styles.sosOuter,
              {
                opacity: glowAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#ff5a5f', '#ff2d2d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sosInner}
            >
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSubText}>Tap for instant help</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.quickActionWrap}
          onPress={handleCall112}
          activeOpacity={0.92}
        >
          <AppCard variant="pink" style={styles.quickActionCard}>
            <View style={styles.quickActionIconWrap}>
              <Text style={styles.quickActionEmoji}>📞</Text>
            </View>
            <Text style={styles.quickActionTitle}>Call 112</Text>
            <Text style={styles.quickActionSubtitle}>National emergency</Text>
          </AppCard>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionWrap}
          onPress={handleCallEmergencyContact}
          activeOpacity={0.92}
        >
          <AppCard variant="green" style={styles.quickActionCard}>
            <View style={styles.quickActionIconWrap}>
              <Text style={styles.quickActionEmoji}>👤</Text>
            </View>
            <Text style={styles.quickActionTitle}>Contact</Text>
            <Text style={styles.quickActionSubtitle}>Emergency person</Text>
          </AppCard>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.emergencyOptionsCard}
        onPress={() => navigation.navigate('EmergencyCall')}
        activeOpacity={0.92}
      >
        <LinearGradient
          colors={GRADIENTS.pinkPurple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emergencyGradient}
        >
          <View style={styles.emergencyOptionsIconWrap}>
            <Text style={styles.emergencyOptionsIcon}>☎️</Text>
          </View>

          <View style={styles.emergencyOptionsTextWrap}>
            <Text style={styles.emergencyOptionsTitle}>Emergency Call Options</Text>
            <Text style={styles.emergencyOptionsSubtitle}>
              Ambulance, police, fire and 112 quick access
            </Text>
          </View>
          <Text style={styles.arrowWhite}>›</Text>
        </LinearGradient>
      </TouchableOpacity>

      <SectionHeader
        title="Request Overview"
        subtitle="Your current emergency activity"
      />

      <View style={styles.statusRow}>
        <AppCard variant="purple" style={styles.totalStatusCard}>
          <Text style={styles.statusCount}>{totalRequests}</Text>
          <Text style={styles.statusLabel}>Total</Text>
        </AppCard>

        <AppCard variant="orange" style={styles.statusCard}>
          <Text style={styles.statusCount}>{pendingCount}</Text>
          <Text style={styles.statusLabel}>Pending</Text>
        </AppCard>

        <AppCard variant="blue" style={styles.statusCard}>
          <Text style={styles.statusCount}>{progressCount}</Text>
          <Text style={styles.statusLabel}>In Progress</Text>
        </AppCard>

        <AppCard variant="green" style={styles.statusCard}>
          <Text style={styles.statusCount}>{resolvedCount}</Text>
          <Text style={styles.statusLabel}>Resolved</Text>
        </AppCard>
      </View>

      <SectionHeader
        title="Services"
        subtitle="Quick links to important sections"
      />

      <TouchableOpacity
        style={styles.serviceWrap}
        onPress={() => navigation.navigate('HistoryTab')}
        activeOpacity={0.92}
      >
        <AppCard style={styles.serviceCard}>
          <View style={[styles.serviceAccent, { backgroundColor: '#8B5CF6' }]} />
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceTitle}>History</Text>
            <Text style={styles.serviceSubtitle}>
              See all previous emergency requests
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </AppCard>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.serviceWrap}
        onPress={() => navigation.navigate('DashboardTab')}
        activeOpacity={0.92}
      >
        <AppCard style={styles.serviceCard}>
          <View style={[styles.serviceAccent, { backgroundColor: '#3B82F6' }]} />
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceTitle}>Dashboard</Text>
            <Text style={styles.serviceSubtitle}>
              Track request updates and progress
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </AppCard>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.serviceWrap}
        onPress={() => navigation.navigate('ProfileTab')}
        activeOpacity={0.92}
      >
        <AppCard style={styles.serviceCard}>
          <View style={[styles.serviceAccent, { backgroundColor: '#22C55E' }]} />
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceTitle}>Profile</Text>
            <Text style={styles.serviceSubtitle}>
              Manage medical and contact details
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </AppCard>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 140,
    backgroundColor: COLORS.background,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  profileImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  profilePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: 'bold',
  },

  headerGreeting: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  headerName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerRole: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
  },

  headerGreetingLight: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  headerNameLight: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerRoleLight: {
    color: '#E9D5FF',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '600',
  },

  logoutChip: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
    alignSelf: 'flex-start',
    ...SHADOW.soft,
  },
  logoutChipDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logoutChipText: {
    color: COLORS.textLight,
    fontWeight: 'bold',
    fontSize: 13,
  },

  heroCardUser: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 28,
    ...SHADOW.card,
  },
  adminHeroCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 28,
    ...SHADOW.card,
  },
  heroBottomRow: {
    marginTop: 18,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#EEF2FF',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroSubtitleAdmin: {
    color: '#D1D5DB',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroStatsCard: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatsNumber: {
    color: COLORS.textLight,
    fontSize: 28,
    fontWeight: 'bold',
  },
  heroStatsLabel: {
    color: '#E5E7EB',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  heroDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 14,
  },
  heroChipArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroChipsRow: {
    flexDirection: 'row',
    marginTop: 14,
    alignItems: 'center',
  },
  heroChipSpacer: {
    width: 8,
  },

  sosSection: {
    marginBottom: 28,
    alignItems: 'center',
  },
  sosOuter: {
    marginTop: 20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  sosInner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  sosSubText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
    opacity: 0.9,
  },

  quickActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  quickActionWrap: {
    flex: 1,
  },
  quickActionCard: {
    minHeight: 144,
    justifyContent: 'center',
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionEmoji: {
    fontSize: 22,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  emergencyOptionsCard: {
    marginBottom: 28,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  emergencyGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  emergencyOptionsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  emergencyOptionsIcon: {
    fontSize: 22,
  },
  emergencyOptionsTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  emergencyOptionsTitle: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: 'bold',
  },
  emergencyOptionsSubtitle: {
    color: '#F5EFFF',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 28,
  },
  totalStatusCard: {
    width: '100%',
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  statusCard: {
    width: '31%',
    alignItems: 'center',
    minHeight: 106,
    justifyContent: 'center',
  },
  statusCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusLabel: {
    fontSize: 13,
    marginTop: 5,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },

  serviceWrap: {
    marginBottom: 14,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceAccent: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 999,
    marginRight: 14,
  },
  serviceTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  primaryAdminCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW.card,
  },
  adminPrimaryGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryAdminTitle: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryAdminSubtitle: {
    color: '#E7F0FF',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 250,
    lineHeight: 18,
  },
  secondaryAdminCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOW.card,
  },
  secondaryAdminTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryAdminSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
    maxWidth: 250,
    lineHeight: 18,
  },
  adminCardText: {
    flex: 1,
    paddingRight: 10,
  },

  arrowWhite: {
    color: COLORS.textLight,
    fontSize: 30,
    fontWeight: '300',
  },
  arrow: {
    fontSize: 30,
    color: '#9CA3AF',
    fontWeight: '300',
  },
});