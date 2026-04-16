import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function EmergencyDetailsScreen({ route }) {
  const emergency = route?.params?.emergency;

  if (!emergency) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No emergency details found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Emergency Details</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{emergency.type || '-'}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{emergency.description || '-'}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{emergency.location_text || '-'}</Text>

        <Text style={styles.label}>Latitude</Text>
        <Text style={styles.value}>{String(emergency.latitude ?? '-')}</Text>

        <Text style={styles.label}>Longitude</Text>
        <Text style={styles.value}>{String(emergency.longitude ?? '-')}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{emergency.status || '-'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f6f8',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#222',
    marginTop: 4,
  },
});