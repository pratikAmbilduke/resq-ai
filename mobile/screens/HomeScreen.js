import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedName = await AsyncStorage.getItem('userName');
      const storedRole = await AsyncStorage.getItem('userRole');

      if (storedName) setUserName(storedName);
      if (storedRole) setUserRole(storedRole);
    } catch (error) {
      console.log('Load User Data Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appName}>🚑 ResQ AI</Text>
      <Text style={styles.subtitle}>Fast emergency help when every second matters</Text>

      {userName ? (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRole}>Role: {userRole}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => navigation.navigate('Emergency')}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Emergency')}
        >
          <Text style={styles.cardTitle}>🚨 Report Emergency</Text>
          <Text style={styles.cardDescription}>
            Send an emergency alert with your real location
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.cardTitle}>📜 Emergency History</Text>
          <Text style={styles.cardDescription}>
            View all your previously reported emergencies
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.cardTitle}>📊 Dashboard</Text>
          <Text style={styles.cardDescription}>
            View emergency counts by status
          </Text>
        </TouchableOpacity>

        {userRole === 'admin' && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Admin')}
          >
            <Text style={styles.cardTitle}>🛠️ Admin Panel</Text>
            <Text style={styles.cardDescription}>
              View and manage all emergency reports
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.cardTitle}>👤 Profile</Text>
          <Text style={styles.cardDescription}>
            Manage your personal details and emergency contacts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  appName: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#007bff',
    marginTop: 4,
    fontWeight: '600',
  },
  sosButton: {
    backgroundColor: '#e53935',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 8,
  },
  sosText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  cardContainer: {
    gap: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});