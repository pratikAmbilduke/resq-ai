import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
import EmergencyCallScreen from './screens/EmergencyCallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PremiumTabIcon({ focused, emoji, label }) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 64,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: focused ? '#eaf2ff' : 'transparent',
      }}
    >
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 11,
          marginTop: 3,
          fontWeight: focused ? '700' : '500',
          color: focused ? '#0d6efd' : '#6b7280',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function UserTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          borderRadius: 24,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="🏠" label="Home" />
          ),
        }}
      >
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="📜" label="History" />
          ),
        }}
      />

      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="📊" label="Dashboard" />
          ),
        }}
      />

      <Tab.Screen
        name="EmergencyCallTab"
        component={EmergencyCallScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="🚨" label="Help" />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          borderRadius: 24,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="AdminHomeTab"
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="🏠" label="Home" />
          ),
        }}
      >
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="RequestsTab"
        component={AdminScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="🛠" label="Requests" />
          ),
        }}
      />

      <Tab.Screen
        name="AdminMapTab"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="📍" label="Map" />
          ),
        }}
      />

      <Tab.Screen
        name="AdminProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon focused={focused} emoji="👤" label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function UserMainStack({ onLogout }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="UserTabs" options={{ headerShown: false }}>
        {(props) => <UserTabs {...props} onLogout={onLogout} />}
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
        name="EmergencyCall"
        component={EmergencyCallScreen}
        options={{ title: 'Emergency Call' }}
      />
    </Stack.Navigator>
  );
}

function AdminMainStack({ onLogout }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" options={{ headerShown: false }}>
        {(props) => <AdminTabs {...props} onLogout={onLogout} />}
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
        name="EmergencyCall"
        component={EmergencyCallScreen}
        options={{ title: 'Emergency Call' }}
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
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const storedRole = await AsyncStorage.getItem('userRole');

      setIsLoggedIn(!!userId);
      setUserRole(storedRole || 'user');
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
      const storedRole = await AsyncStorage.getItem('userRole');
      setUserRole(storedRole || 'user');
      setIsLoggedIn(true);
    } catch (error) {
      console.log('Handle Login Success Error:', error);
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
        ) : userRole === 'admin' ? (
          <Stack.Screen name="AdminMain" options={{ headerShown: false }}>
            {(props) => <AdminMainStack {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="UserMain" options={{ headerShown: false }}>
            {(props) => <UserMainStack {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}