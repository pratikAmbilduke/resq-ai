import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HistoryScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchEmergencies = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setEmergencies([]);
        return;
      }

      const response = await fetch(`http://localhost:8000/emergencies/${userId}`);
      const data = await response.json();

      if (data.error) {
        setEmergencies([]);
        return;
      }

      setEmergencies(data);
    } catch (error) {
      console.log('History Error:', error);
      setEmergencies([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchEmergencies();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmergencies();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdatedEmergency = (updatedEmergency) => {
    setEmergencies((prev) =>
      prev.map((item) =>
        item.id === updatedEmergency.id ? updatedEmergency : item
      )
    );
  };

  const openEmergencyLocation = (item) => {
    navigation.navigate('EmergencyLocation', {
      emergency: item,
      onGoBack: handleUpdatedEmergency,
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.pendingStatus;
      case 'in_progress':
        return styles.inProgressStatus;
      case 'resolved':
        return styles.resolvedStatus;
      default:
        return styles.defaultStatus;
    }
  };

  const filteredEmergencies = emergencies.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.type.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location_text.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const renderEmergencyCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openEmergencyLocation(item)}
    >
      <Text style={styles.type}>{item.type.toUpperCase()}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.location}>{item.location_text}</Text>
      <Text style={[styles.status, getStatusStyle(item.status)]}>
        {item.status.replace('_', ' ').toUpperCase()}
      </Text>
      <Text style={styles.tapHint}>Tap to view details and map</Text>
    </TouchableOpacity>
  );

  const renderSkeleton = () => {
    return (
      <View>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonCard}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineMedium} />
          </View>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyTitle}>No Emergency History</Text>
        <Text style={styles.emptySubtitle}>
          Your emergency reports will appear here once you submit them.
        </Text>
      </View>
    );
  };

  const renderNoResultsState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🔎</Text>
        <Text style={styles.emptyTitle}>No Matching Results</Text>
        <Text style={styles.emptySubtitle}>
          Try changing your search text or filter selection.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 My Emergency History</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description or location"
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'all' && styles.activeFilter]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'pending' && styles.activeFilter]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text style={styles.filterText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'in_progress' && styles.activeFilter]}
          onPress={() => setSelectedStatus('in_progress')}
        >
          <Text style={styles.filterText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus === 'resolved' && styles.activeFilter]}
          onPress={() => setSelectedStatus('resolved')}
        >
          <Text style={styles.filterText}>Resolved</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        renderSkeleton()
      ) : emergencies.length === 0 ? (
        renderEmptyState()
      ) : filteredEmergencies.length === 0 ? (
        renderNoResultsState()
      ) : (
        <FlatList
          data={filteredEmergencies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEmergencyCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
    color: '#111',
  },

  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    elevation: 2,
    fontSize: 14,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  filterButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  activeFilter: {
    backgroundColor: '#007bff',
  },
  filterText: {
    color: '#111',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  status: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pendingStatus: {
    color: '#e0a800',
  },
  inProgressStatus: {
    color: '#17a2b8',
  },
  resolvedStatus: {
    color: '#28a745',
  },
  defaultStatus: {
    color: '#555',
  },
  tapHint: {
    color: '#dc3545',
    fontWeight: '600',
    fontSize: 13,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  skeletonCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 2,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonLineShort: {
    width: '35%',
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonLineMedium: {
    width: '50%',
    height: 14,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
});