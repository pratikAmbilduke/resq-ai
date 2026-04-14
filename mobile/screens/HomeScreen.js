import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ResQ AI</Text>
      <Text style={styles.subtitle}>
        Fast emergency help when every second matters
      </Text>

      <TouchableOpacity style={styles.sosButton}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("EmergencyForm")}
      >
        <Text style={styles.cardTitle}>Report Emergency</Text>
        <Text style={styles.cardSubtitle}>Send emergency details quickly</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={styles.cardTitle}>Emergency History</Text>
        <Text style={styles.cardSubtitle}>View your previous emergency requests</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Profile")}
      >
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.cardSubtitle}>Manage your details and emergency contacts</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#d32f2f",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    marginTop: 8,
    marginBottom: 30,
    lineHeight: 22,
  },
  sosButton: {
    backgroundColor: "#d32f2f",
    width: 180,
    height: 180,
    borderRadius: 90,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  sosText: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
    lineHeight: 20,
  },
});