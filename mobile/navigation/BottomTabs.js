import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs({ userRole, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        children={(props) => <HomeScreen {...props} onLogout={onLogout} />}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="home"
              size={24}
              color={focused ? '#0d6efd' : '#888'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="time"
              size={24}
              color={focused ? '#0d6efd' : '#888'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarIcon: () => (
            <View style={styles.centerButton}>
              <Ionicons name="grid" size={26} color="#fff" />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="person"
              size={24}
              color={focused ? '#0d6efd' : '#888'}
            />
          ),
        }}
      />

      {userRole === 'admin' && (
        <Tab.Screen
          name="RequestsTab"
          component={AdminScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="settings"
                size={24}
                color={focused ? '#0d6efd' : '#888'}
              />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    elevation: 10,
    backgroundColor: '#fff',
    borderRadius: 25,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  centerButton: {
    backgroundColor: '#0d6efd',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});