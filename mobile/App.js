import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import EmergencyScreen from './screens/EmergencyFormScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmergencyLocationScreen from './screens/EmergencyLocationScreen';
import DashboardScreen from './screens/DashboardScreen';
import AdminScreen from './screens/AdminScreen';

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AuthStack({ onLoginSuccess }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack({ onLogout }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" options={{ title: 'ResQ AI' }}>
        {(props) => <HomeScreen {...props} />}
      </Stack.Screen>

      <Stack.Screen name="Emergency">
        {(props) => <EmergencyScreen {...props} />}
      </Stack.Screen>

      <Stack.Screen name="History">
        {(props) => <HistoryScreen {...props} />}
      </Stack.Screen>

      <Stack.Screen name="Profile">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>

      <Stack.Screen
        name="EmergencyLocation"
        component={EmergencyLocationScreen}
        options={{ title: 'Emergency Map View' }}
      />

      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />

      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ title: 'Admin Panel' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    setupLocalNotificationsOnly();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setIsLoggedIn(!!userId);
    } catch (error) {
      console.log('Session Check Error:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setupLocalNotificationsOnly = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergency-alerts', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.log('Notification Setup Error:', error);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userRole');
      setIsLoggedIn(false);
    } catch (error) {
      console.log('Logout Error:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loaderText}>Checking session...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <MainStack onLogout={handleLogout} />
      ) : (
        <AuthStack onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
});