import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";

export default function EmergencyFormScreen() {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");

  const handleSubmit = () => {
    if (!type || !description || !locationText) {
      Alert.alert("Validation Error", "Please fill all fields.");
      return;
    }

    Alert.alert("Success", "Emergency form submitted successfully.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.heading}>Emergency Details</Text>

        <Text style={styles.label}>Emergency Type</Text>
        <TextInput
          style={styles.input}
          placeholder="Medical / Fire / Accident"
          value={type}
          onChangeText={setType}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the emergency"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter area / landmark / city"
          value={locationText}
          onChangeText={setLocationText}
        />

        <TouchableOpacity style={styles.locationButton}>
          <Text style={styles.locationButtonText}>Use Current Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Emergency</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    padding: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  locationButton: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d32f2f",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  locationButtonText: {
    color: "#d32f2f",
    fontSize: 15,
    fontWeight: "bold",
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: "#d32f2f",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});