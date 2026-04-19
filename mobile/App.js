import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import EmergencyFormScreen from './screens/EmergencyFormScreen';
import EmergencyDetailsScreen from './screens/EmergencyDetailsScreen';
import MapScreen from './screens/MapScreen';
import EmergencyCallScreen from './screens/EmergencyCallScreen';

import BottomTabs from './navigation/BottomTabs';

const Stack = createNativeStackNavigator();

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('userRole');

      setIsLoggedIn(!!userId);
      setUserRole(role || 'user');
    } catch (error) {
      console.log('Check Login Error:', error);
      setIsLoggedIn(false);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || 'user');
      setIsLoggedIn(true);
    } catch (error) {
      console.log('Login success role load error:', error);
      setUserRole('user');
      setIsLoggedIn(true);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userId',
        'userName',
        'userEmail',
        'userRole',
      ]);
      setUserRole('user');
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
            <Stack.Screen
              name="MainTabs"
              options={{ headerShown: false }}
            >
              {(props) => (
                <BottomTabs
                  {...props}
                  userRole={userRole}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Emergency"
              component={EmergencyFormScreen}
              options={{ title: 'Emergency' }}
            />

            <Stack.Screen
              name="EmergencyDetails"
              component={EmergencyDetailsScreen}
              options={{ title: 'Emergency Details' }}
            />

            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{ title: 'Live Map' }}
            />

            <Stack.Screen
              name="AdminMapTab"
              component={MapScreen}
              options={{ title: 'Admin Live Map' }}
            />

            <Stack.Screen
              name="EmergencyCall"
              component={EmergencyCallScreen}
              options={{ title: 'Emergency Call' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}