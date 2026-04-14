import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚑 ResQ AI</Text>

      <TouchableOpacity style={styles.sosButton}>
        <Text style={styles.sosText}>🚨 SOS</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Report Emergency</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>View History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  sosButton: {
    backgroundColor: 'red',
    padding: 30,
    borderRadius: 100,
    marginBottom: 30,
  },
  sosText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    marginVertical: 10,
    width: 200,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});