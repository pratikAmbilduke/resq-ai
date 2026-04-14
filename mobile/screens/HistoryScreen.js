import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Emergency History</Text>

      <View style={styles.card}>
        <Text style={styles.type}>Medical</Text>
        <Text style={styles.description}>Chest pain and breathing problem</Text>
        <Text style={styles.location}>Near Pune Railway Station</Text>
        <Text style={styles.status}>Status: Pending</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.type}>Accident</Text>
        <Text style={styles.description}>Bike accident near highway</Text>
        <Text style={styles.location}>Nagpur Road</Text>
        <Text style={styles.status}>Status: Active</Text>
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
    padding: 18,
    borderRadius: 14,
    marginBottom: 15,
    elevation: 3,
  },
  type: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
  },
  location: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d32f2f",
    marginTop: 8,
  },
});