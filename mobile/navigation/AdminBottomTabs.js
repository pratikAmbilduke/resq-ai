import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AdminScreen from '../screens/AdminScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function AdminBottomTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="AdminHomeTab"
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
        name="RequestsTab"
        component={AdminScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="clipboard"
              size={24}
              color={focused ? '#0d6efd' : '#888'}
            />
          ),
        }}
      />

      <Tab.Screen
        name="AdminMapTab"
        component={MapScreen}
        options={{
          tabBarIcon: () => (
            <View style={styles.centerButton}>
              <Ionicons name="map" size={26} color="#fff" />
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
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    elevation: 10,
    backgroundColor: '#fff',
    borderRadius: 28,
    height: 78,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 0,
  },
  centerButton: {
    backgroundColor: '#0d6efd',
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});