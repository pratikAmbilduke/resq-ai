import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function EmergencyScreen() {

  const sendEmergency = async () => {
    try {
      const response = await fetch("http://localhost:8000/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "medical",
          description: "Test emergency from mobile",
          latitude: 18.5204,
          longitude: 73.8567,
          location_text: "Pune",
        }),
      });

      const data = await response.json();

      Alert.alert("Success", "Emergency Sent Successfully 🚨");

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to send emergency ❌");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 Emergency</Text>

      <TouchableOpacity style={styles.button} onPress={sendEmergency}>
        <Text style={styles.buttonText}>SEND SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 26, 
    marginBottom: 30 
  },
  button: {
    backgroundColor: 'red',
    padding: 20,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  }
});