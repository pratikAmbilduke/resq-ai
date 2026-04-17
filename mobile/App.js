import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import EmergencyFormScreen from './screens/EmergencyFormScreen';
import HistoryScreen from './screens/HistoryScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmergencyDetailsScreen from './screens/EmergencyDetailsScreen';
import AdminScreen from './screens/AdminScreen';
import MapScreen from './screens/MapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setIsLoggedIn(!!userId);
    } catch (error) {
      console.log('Check Login Error:', error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userId',
        'userName',
        'userEmail',
        'userRole',
      ]);
      setIsLoggedIn(false);
    } catch (error) {
      console.log('Logout Error:', error);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Register' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={handleLogout} />}
            </Stack.Screen>

            <Stack.Screen
              name="Emergency"
              component={EmergencyFormScreen}
              options={{ title: 'Emergency' }}
            />

            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: 'History' }}
            />

            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />

            <Stack.Screen
              name="EmergencyDetails"
              component={EmergencyDetailsScreen}
              options={{ title: 'Emergency Details' }}
            />

            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ title: 'Admin Panel' }}
            />

            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{ title: 'Live Map' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}