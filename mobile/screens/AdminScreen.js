import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import API_BASE_URL from '../config';

export default function AdminScreen() {
  const [loading, setLoading] = useState(true);
  const [emergencies, setEmergencies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchAllEmergencies();
  }, []);

  const fetchAllEmergencies = async () => {
    try {
      setLoading(true);

      const userId = await AsyncStorage.getItem('userId');
      const userRole = await AsyncStorage.getItem('userRole');

      if (!userId) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      if (userRole !== 'admin') {
        Alert.alert('Access Denied', 'Only admin can access this panel');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/emergencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId, 10) }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      setEmergencies(data);
    } catch (error) {
      console.log('Admin Fetch Error:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
        return;
      }

      Alert.alert('Success', `Status updated to ${newStatus}`);
      fetchAllEmergencies();
    } catch (error) {
      console.log('Update Status Error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const confirmUpdate = (id, status) => {
    Alert.alert(
      'Confirm Update',
      `Change status to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => updateStatus(id, status),
        },
      ]
    );
  };

  const filteredEmergencies = emergencies.filter((item) => {
    const matchFilter = filter === 'all' || item.status === filter;

    const matchSearch =
      item.type.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.location_text.toLowerCase().includes(searchText.toLowerCase()) ||
      String(item.user_id).includes(searchText);

    return matchFilter && matchSearch;
  });

  const exportToCSV = async () => {
    try {
      if (filteredEmergencies.length === 0) {
        Alert.alert('No Data', 'There is no admin data to export.');
        return;
      }

      const headers = [
        'ID',
        'Type',
        'Description',
        'Latitude',
        'Longitude',
        'Location',
        'Status',
        'User ID',
      ];

      const rows = filteredEmergencies.map((item) => [
        item.id,
        `"${String(item.type).replace(/"/g, '""')}"`,
        `"${String(item.description).replace(/"/g, '""')}"`,
        item.latitude,
        item.longitude,
        `"${String(item.location_text).replace(/"/g, '""')}"`,
        `"${String(item.status).replace(/"/g, '""')}"`,
        item.user_id,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      const fileUri =
        FileSystem.documentDirectory +
        `admin_emergency_history_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert('Exported', `CSV file saved at:\n${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Admin Emergency Data',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.log('Admin CSV Export Error:', error);
      Alert.alert('Error', 'Failed to export CSV file.');
    }
  };

  const exportToPDF = async () => {
    try {
      if (filteredEmergencies.length === 0) {
        Alert.alert('No Data', 'There is no admin data to export.');
        return;
      }

      const rowsHtml = filteredEmergencies
        .map(
          (item) => `
            <tr>
              <td>${item.id}</td>
              <td>${item.type}</td>
              <td>${item.description}</td>
              <td>${item.status}</td>
              <td>${item.location_text}</td>
              <td>${item.user_id}</td>
            </tr>
          `
        )
        .join('');

      const html = `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #222;
              }
              h1 {
                text-align: center;
                margin-bottom: 6px;
              }
              p {
                text-align: center;
                color: #666;
                margin-top: 0;
                margin-bottom: 24px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
                vertical-align: top;
              }
              th {
                background-color: #f3f4f6;
              }
              tr:nth-child(even) {
                background-color: #fafafa;
              }
            </style>
          </head>
          <body>
            <h1>ResQ AI Admin Emergency Report</h1>
            <p>Total Records: ${filteredEmergencies.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>User ID</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert('Exported', `PDF file saved at:\n${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Admin Emergency Report',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.log('Admin PDF Export Error:', error);
      Alert.alert('Error', 'Failed to export PDF file.');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return styles.pending;
      case 'in_progress':
        return styles.progress;
      case 'resolved':
        return styles.resolved;
      default:
        return styles.defaultStatus;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.type}>{item.type.toUpperCase()}</Text>
      <Text style={styles.text}>Description: {item.description}</Text>
      <Text style={styles.text}>Location: {item.location_text}</Text>
      <Text style={styles.text}>User ID: {item.user_id}</Text>

      <Text style={[styles.status, getStatusStyle(item.status)]}>
        Status: {item.status}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.btnPending}
          onPress={() => confirmUpdate(item.id, 'pending')}
        >
          <Text style={styles.btnText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnProgress}
          onPress={() => confirmUpdate(item.id, 'in_progress')}
        >
          <Text style={styles.btnText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnResolved}
          onPress={() => confirmUpdate(item.id, 'resolved')}
        >
          <Text style={styles.btnText}>Resolved</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📂</Text>
      <Text style={styles.emptyTitle}>No Matching Records</Text>
      <Text style={styles.emptySubtitle}>
        Try another search term or filter.
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛠️ Admin Panel</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by type, description, location or user ID"
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
          onPress={() => setFilter('pending')}
        >
          <Text style={styles.filterText}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'in_progress' && styles.activeFilter]}
          onPress={() => setFilter('in_progress')}
        >
          <Text style={styles.filterText}>In Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.activeFilter]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={styles.filterText}>Resolved</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
        <Text style={styles.exportButtonText}>Export CSV</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.exportButton} onPress={exportToPDF}>
        <Text style={styles.exportButtonText}>Export PDF</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchAllEmergencies}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredEmergencies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={renderNoResults}
      />
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
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  filterButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  activeFilter: {
    backgroundColor: '#007bff',
  },
  filterText: {
    color: '#111',
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
  },
  type: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pending: {
    color: '#e0a800',
  },
  progress: {
    color: '#17a2b8',
  },
  resolved: {
    color: '#28a745',
  },
  defaultStatus: {
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  btnPending: {
    backgroundColor: '#f39c12',
    padding: 8,
    borderRadius: 8,
  },
  btnProgress: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 8,
  },
  btnResolved: {
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});