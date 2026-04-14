import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>Pratik Ambilduke</Text>

        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>+91 XXXXX XXXXX</Text>

        <Text style={styles.label}>Emergency Contact</Text>
        <Text style={styles.value}>Add later</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },
  value: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
    marginTop: 4,
  },
});