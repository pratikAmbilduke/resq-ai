import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

function AuthStack({ onLoginSuccess }) {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack({ onLogout }) {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" options={{ title: 'ResQ AI' }}>
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
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
  const [navResetKey, setNavResetKey] = useState('');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setIsLoggedIn(!!userId);
      setNavResetKey(`app-start-${Date.now()}`);
    } catch (error) {
      console.log('App Init Error:', error);
      setIsLoggedIn(false);
      setNavResetKey(`app-start-${Date.now()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setNavResetKey(`login-${Date.now()}`);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userRole');
      setIsLoggedIn(false);
      setNavResetKey(`logout-${Date.now()}`);
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
    <NavigationContainer key={`${navResetKey}-${isLoggedIn ? 'logged-in' : 'logged-out'}`}>
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