import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import AdminScreen from '../screens/AdminScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ focused, name }) {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? '#ffffff' : '#6b7280'}
      />
    </View>
  );
}

function CenterTabIcon({ focused }) {
  return (
    <View style={[styles.centerButton, focused && styles.centerButtonActive]}>
      <Ionicons name="map" size={26} color="#ffffff" />
    </View>
  );
}

export default function AdminBottomTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="AdminHomeTab"
        children={(props) => <HomeScreen {...props} onLogout={onLogout} />}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" />
          ),
        }}
      />

      <Tab.Screen
        name="RequestsTab"
        component={AdminScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="clipboard" />
          ),
        }}
      />

      <Tab.Screen
        name="AdminMapTab"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CenterTabIcon focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="person" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    height: 78,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  activeIconContainer: {
    backgroundColor: '#0d6efd',
  },

  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    marginTop: -18,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },

  centerButtonActive: {
    backgroundColor: '#0d6efd',
    shadowColor: '#0d6efd',
  },
});