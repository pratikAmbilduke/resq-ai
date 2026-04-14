import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';

export default function HistoryScreen() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmergencies = async () => {
    try {
      setLoading(true);

      const response = await fetch('http://localhost:8000/emergencies');
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', 'Failed to fetch emergency history.');
        return;
      }

      setEmergencies(data);
    } catch (error) {
      console.log('History Error:', error);
      Alert.alert('Error', 'Something went wrong while fetching history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.type}>Type: {item.type}</Text>
      <Text style={styles.text}>Description: {item.description}</Text>
      <Text style={styles.text}>Latitude: {item.latitude}</Text>
      <Text style={styles.text}>Longitude: {item.longitude}</Text>
      <Text style={styles.text}>Location: {item.location_text}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Emergency History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : emergencies.length === 0 ? (
        <Text style={styles.empty}>No emergency history found.</Text>
      ) : (
        <FlatList
          data={emergencies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
  },
  type: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007bff',
  },
  text: {
    fontSize: 14,
    marginBottom: 5,
  },
  status: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    color: 'green',
  },
  empty: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
    color: 'gray',
  },
});