import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import EmergencyFormScreen from './screens/EmergencyFormScreen';
import EmergencyDetailsScreen from './screens/EmergencyDetailsScreen';
import MapScreen from './screens/MapScreen';
import EmergencyCallScreen from './screens/EmergencyCallScreen';

// Tabs
import UserBottomTabs from './navigation/UserBottomTabs';
import AdminBottomTabs from './navigation/AdminBottomTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');

  // 🔹 Check login on app start
  useEffect(() => {
    checkLogin();
  }, []);

  // 🔹 Splash timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const checkLogin = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('userRole');

      setIsLoggedIn(!!userId);
      setUserRole(role || 'user');
    } catch (error) {
      console.log('Check Login Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 After login success
  const handleLoginSuccess = async () => {
    const role = await AsyncStorage.getItem('userRole');
    setUserRole(role || 'user');
    setIsLoggedIn(true);
  };

  // 🔹 Logout
  const handleLogout = async () => {
    await AsyncStorage.multiRemove([
      'userId',
      'userName',
      'userEmail',
      'userRole',
      'userProfileImage',
    ]);

    setIsLoggedIn(false);
    setUserRole('user');
  };

  // 🔹 Loading state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0d6efd" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {showSplash ? (
        <SplashScreen />
      ) : !isLoggedIn ? (
        // 🔹 AUTH FLOW
        <Stack.Navigator>
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Register"
            component={RegisterScreen}
          />
        </Stack.Navigator>
      ) : (
        // 🔹 MAIN APP
        <Stack.Navigator>

          {/* USER OR ADMIN TABS */}
          {userRole === 'admin' ? (
            <Stack.Screen name="AdminTabs" options={{ headerShown: false }}>
              {(props) => (
                <AdminBottomTabs {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="UserTabs" options={{ headerShown: false }}>
              {(props) => (
                <UserBottomTabs {...props} onLogout={handleLogout} />
              )}
            </Stack.Screen>
          )}

          {/* COMMON SCREENS */}
          <Stack.Screen
            name="Emergency"
            component={EmergencyFormScreen}
          />

          <Stack.Screen
            name="EmergencyDetails"
            component={EmergencyDetailsScreen}
          />

          <Stack.Screen
            name="Map"
            component={MapScreen}
          />

          <Stack.Screen
            name="EmergencyCall"
            component={EmergencyCallScreen}
          />

        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}