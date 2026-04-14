import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚑 ResQ AI</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Emergency')}
      >
        <Text style={styles.buttonText}>Report Emergency</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.buttonText}>View History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.buttonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 40 
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    marginVertical: 10,
    width: 220,
    alignItems: 'center',
    borderRadius: 10,
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16 
  },
});