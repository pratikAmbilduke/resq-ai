import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Animated,
  Easing,
  Vibration,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import API_BASE_URL from '../config';

const POLLING_INTERVAL = 3000;
const SWIPE_CLOSE_THRESHOLD = 120;
const SWIPE_CLOSE_VELOCITY = 1.1;

export default function AdminScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [adminName, setAdminName] = useState('');
  const [adminUserId, setAdminUserId] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupRequest, setPopupRequest] = useState(null);

  const intervalRef = useRef(null);
  const firstLoadDoneRef = useRef(false);
  const latestKnownRequestIdRef = useRef(0);
  const popupQueueRef = useRef([]);
  const activePopupIdRef = useRef(null);
  const isScreenActiveRef = useRef(false);
  const isFetchingNewRef = useRef(false);
  const popupSoundRef = useRef(null);

  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const parseResponse = async (response) => {
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = { raw: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  };

  const normalizeRequest = useCallback((item) => {
    if (!item) return null;

    return {
      ...item,
      id: Number(item?.id || 0),
      type: item?.type || 'Emergency',
      description: item?.description || '',
      location_text: item?.location_text || '',
      status: item?.status || 'pending',
      priority: item?.priority || 'medium',
      accepted_by: item?.accepted_by || '',
    };
  }, []);

  const sortRequests = useCallback((list) => {
    return [...list].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, []);

  const calculateCounts = useCallback((data) => {
    const pending = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'pending'
    ).length;

    const accepted = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'accepted'
    ).length;

    const progress = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'in progress'
    ).length;

    const resolved = data.filter(
      (item) => String(item?.status || '').toLowerCase() === 'resolved'
    ).length;

    setPendingCount(pending);
    setAcceptedCount(accepted);
    setProgressCount(progress);
    setResolvedCount(resolved);
    setTotalRequests(data.length);
  }, []);

  const setRequestsAndCounts = useCallback(
    (incoming) => {
      const normalized = incoming.map((item) => normalizeRequest(item)).filter(Boolean);
      const sorted = sortRequests(normalized);

      setRequests(sorted);
      calculateCounts(sorted);

      const maxId = sorted.reduce((max, item) => {
        const currentId = Number(item?.id || 0);
        return currentId > max ? currentId : max;
      }, 0);

      if (maxId > Number(latestKnownRequestIdRef.current || 0)) {
        latestKnownRequestIdRef.current = maxId;
      }

      return sorted;
    },
    [calculateCounts, normalizeRequest, sortRequests]
  );

  const cleanupPopupSound = useCallback(async () => {
    try {
      if (popupSoundRef.current) {
        await popupSoundRef.current.unloadAsync();
        popupSoundRef.current = null;
      }
    } catch (error) {
      console.log('Cleanup popup sound error:', error);
    }
  }, []);

  const playPopupAlert = useCallback(async () => {
    try {
      Vibration.vibrate([0, 180, 120, 220]);

      await cleanupPopupSound();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        {
          uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
        },
        {
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        }
      );

      popupSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          cleanupPopupSound();
        }
      });
    } catch (error) {
      console.log('Popup sound play error:', error);
    }
  }, [cleanupPopupSound]);

  const animatePopupIn = useCallback(() => {
    dragY.setValue(0);
    slideAnim.setValue(420);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [dragY, fadeAnim, slideAnim]);

  const resetDragPosition = useCallback(() => {
    Animated.spring(dragY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, [dragY]);

  const showNextPopupFromQueue = useCallback(() => {
    if (popupVisible) return;
    if (popupQueueRef.current.length === 0) return;

    const nextRequest = popupQueueRef.current.shift();
    if (!nextRequest) return;

    activePopupIdRef.current = Number(nextRequest?.id || 0);
    setPopupRequest(nextRequest);
    setPopupVisible(true);
    animatePopupIn();
    playPopupAlert();
  }, [animatePopupIn, playPopupAlert, popupVisible]);

  const enqueuePopupRequest = useCallback(
    (requestItem) => {
      if (!requestItem?.id) return;

      const requestId = Number(requestItem.id);
      const requestStatus = String(requestItem?.status || '').toLowerCase();

      if (requestStatus !== 'pending') return;
      if (activePopupIdRef.current === requestId) return;

      const alreadyQueued = popupQueueRef.current.some(
        (queued) => Number(queued?.id || 0) === requestId
      );

      if (alreadyQueued) return;

      popupQueueRef.current.push(requestItem);
      showNextPopupFromQueue();
    },
    [showNextPopupFromQueue]
  );

  const animatePopupOut = useCallback(
    (onDone) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 420,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(dragY, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onDone) onDone();
      });
    },
    [dragY, fadeAnim, slideAnim]
  );

  const closePopup = useCallback(() => {
    animatePopupOut(() => {
      setPopupVisible(false);
      setPopupRequest(null);
      activePopupIdRef.current = null;

      setTimeout(() => {
        showNextPopupFromQueue();
      }, 120);
    });
  }, [animatePopupOut, showNextPopupFromQueue]);

  const getStoredAdminIdentity = useCallback(async () => {
    const [
      userId,
      adminStoredName,
      userName,
      name,
      fullName,
      username,
    ] = await Promise.all([
      AsyncStorage.getItem('userId'),
      AsyncStorage.getItem('adminName'),
      AsyncStorage.getItem('userName'),
      AsyncStorage.getItem('name'),
      AsyncStorage.getItem('fullName'),
      AsyncStorage.getItem('username'),
    ]);

    const resolvedName =
      adminStoredName ||
      userName ||
      name ||
      fullName ||
      username ||
      'Admin';

    setAdminUserId(userId || '');
    setAdminName(resolvedName);

    return {
      userId: userId || '',
      adminDisplayName: resolvedName,
    };
  }, []);

  const mergeRequests = useCallback(
    (existingList, incomingList) => {
      const map = new Map();

      existingList.forEach((item) => {
        const normalized = normalizeRequest(item);
        if (normalized?.id) {
          map.set(Number(normalized.id), normalized);
        }
      });

      incomingList.forEach((item) => {
        const normalized = normalizeRequest(item);
        if (normalized?.id) {
          map.set(Number(normalized.id), normalized);
        }
      });

      return sortRequests(Array.from(map.values()));
    },
    [normalizeRequest, sortRequests]
  );

  const loadAdminData = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const { userId } = await getStoredAdminIdentity();

        if (!userId) {
          setRequests([]);
          calculateCounts([]);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/admin/emergencies/${userId}`);
        const parsed = await parseResponse(response);

        if (!parsed.ok) {
          console.log('Admin list fetch failed:', parsed.status, parsed.data);
          if (!silent) {
            Alert.alert('Error', 'Failed to load admin requests');
          }
          return;
        }

        const list = Array.isArray(parsed.data) ? parsed.data : [];

        const sorted = setRequestsAndCounts(list);

        if (!firstLoadDoneRef.current) {
          firstLoadDoneRef.current = true;
          if (sorted.length > 0) {
            latestKnownRequestIdRef.current = Number(sorted[0]?.id || 0);
          }
        }
      } catch (error) {
        console.log('Load admin data error:', error);
        if (!silent) {
          Alert.alert('Error', 'Unable to load admin data');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [calculateCounts, getStoredAdminIdentity, setRequestsAndCounts]
  );

  const pollNewEmergencies = useCallback(async () => {
    if (isFetchingNewRef.current) return;
    if (!firstLoadDoneRef.current) return;
    if (!isScreenActiveRef.current) return;

    isFetchingNewRef.current = true;

    try {
      const { userId } = await getStoredAdminIdentity();

      if (!userId) return;

      const lastId = Number(latestKnownRequestIdRef.current || 0);

      const response = await fetch(
        `${API_BASE_URL}/admin/new-emergencies/${lastId}/${userId}`
      );
      const parsed = await parseResponse(response);

      if (!parsed.ok) {
        console.log('Polling failed:', parsed.status, parsed.data);
        return;
      }

      if (!Array.isArray(parsed.data) || parsed.data.length === 0) {
        return;
      }

      const normalizedNewItems = parsed.data
        .map((item) => normalizeRequest(item))
        .filter(Boolean)
        .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));

      const highestNewId = normalizedNewItems.reduce((max, item) => {
        const itemId = Number(item?.id || 0);
        return itemId > max ? itemId : max;
      }, lastId);

      latestKnownRequestIdRef.current = highestNewId;

      setRequests((prev) => {
        const merged = mergeRequests(prev, normalizedNewItems);
        calculateCounts(merged);
        return merged;
      });

      normalizedNewItems.forEach((item) => {
        if (String(item?.status || '').toLowerCase() === 'pending') {
          enqueuePopupRequest(item);
        }
      });
    } catch (error) {
      console.log('Polling new emergencies error:', error);
    } finally {
      isFetchingNewRef.current = false;
    }
  }, [
    calculateCounts,
    enqueuePopupRequest,
    getStoredAdminIdentity,
    mergeRequests,
    normalizeRequest,
  ]);

  useFocusEffect(
    useCallback(() => {
      isScreenActiveRef.current = true;

      loadAdminData();

      clearPolling();
      intervalRef.current = setInterval(() => {
        pollNewEmergencies();
      }, POLLING_INTERVAL);

      return () => {
        isScreenActiveRef.current = false;
        clearPolling();
      };
    }, [clearPolling, loadAdminData, pollNewEmergencies])
  );

  useEffect(() => {
    return () => {
      isScreenActiveRef.current = false;
      clearPolling();
      cleanupPopupSound();
    };
  }, [clearPolling, cleanupPopupSound]);

  useEffect(() => {
    if (popupVisible && popupRequest?.id) {
      activePopupIdRef.current = Number(popupRequest.id);
    }
  }, [popupRequest, popupVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (
          gestureState.dy > SWIPE_CLOSE_THRESHOLD ||
          gestureState.vy > SWIPE_CLOSE_VELOCITY
        ) {
          closePopup();
        } else {
          resetDragPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetDragPosition();
      },
    })
  ).current;

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return '#d97706';
    if (s === 'accepted') return '#7c3aed';
    if (s === 'in progress') return '#2563eb';
    if (s === 'resolved') return '#16a34a';
    if (s === 'cancelled') return '#dc2626';
    return '#6b7280';
  };

  const getStatusBackground = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return '#fff7ed';
    if (s === 'accepted') return '#f5f3ff';
    if (s === 'in progress') return '#eff6ff';
    if (s === 'resolved') return '#f0fdf4';
    if (s === 'cancelled') return '#fef2f2';
    return '#f3f4f6';
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#6b7280';
    if (p === 'medium') return '#2563eb';
    if (p === 'high') return '#ea580c';
    if (p === 'critical') return '#dc2626';
    return '#6b7280';
  };

  const getPriorityBackground = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'low') return '#e5e7eb';
    if (p === 'medium') return '#dbeafe';
    if (p === 'high') return '#ffedd5';
    if (p === 'critical') return '#fee2e2';
    return '#e5e7eb';
  };

  const priorityOrder = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const result = requests.filter((item) => {
      const type = String(item?.type || '').toLowerCase();
      const description = String(item?.description || '').toLowerCase();
      const location = String(item?.location_text || '').toLowerCase();
      const status = String(item?.status || '').toLowerCase();
      const acceptedBy = String(item?.accepted_by || '').toLowerCase();
      const priority = String(item?.priority || '').toLowerCase();

      const matchesSearch =
        !query ||
        type.includes(query) ||
        description.includes(query) ||
        location.includes(query) ||
        acceptedBy.includes(query) ||
        priority.includes(query) ||
        status.includes(query);

      let matchesFilter = true;

      if (selectedFilter === 'pending') {
        matchesFilter = status === 'pending';
      } else if (selectedFilter === 'accepted') {
        matchesFilter = status === 'accepted';
      } else if (selectedFilter === 'in progress') {
        matchesFilter = status === 'in progress';
      } else if (selectedFilter === 'resolved') {
        matchesFilter = status === 'resolved';
      } else if (selectedFilter === 'cancelled') {
        matchesFilter = status === 'cancelled';
      } else if (selectedFilter === 'my-assigned') {
        matchesFilter =
          !!adminName &&
          acceptedBy === String(adminName).trim().toLowerCase();
      }

      return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
      const priorityA =
        priorityOrder[String(a?.priority || 'medium').toLowerCase()] || 0;
      const priorityB =
        priorityOrder[String(b?.priority || 'medium').toLowerCase()] || 0;

      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [requests, searchText, selectedFilter, adminName]);

  // ---------------------------------------------------------
  // DELETE FIX:
  // Show success only after backend confirms actual delete.
  // Then refresh from server.
  // ---------------------------------------------------------
  const handleDeleteRequest = async (emergencyId) => {
    try {
      if (!adminUserId) {
        Alert.alert('Error', 'Admin user not found');
        return;
      }

      Alert.alert(
        'Delete Request',
        'Are you sure you want to permanently delete this request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/admin/emergency/${emergencyId}/${adminUserId}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );

                const parsed = await parseResponse(response);

                if (!parsed.ok || !parsed.data?.success) {
                  const message =
                    parsed?.data?.detail ||
                    parsed?.data?.error ||
                    parsed?.data?.message ||
                    'Failed to delete request';
                  Alert.alert('Error', message);
                  return;
                }

                // Remove from local UI only after backend confirms success
                setRequests((prev) => {
                  const updated = prev.filter(
                    (item) => Number(item?.id) !== Number(emergencyId)
                  );
                  calculateCounts(updated);
                  return updated;
                });

                popupQueueRef.current = popupQueueRef.current.filter(
                  (item) => Number(item?.id || 0) !== Number(emergencyId)
                );

                if (Number(activePopupIdRef.current || 0) === Number(emergencyId)) {
                  closePopup();
                }

                await loadAdminData({ silent: true });
                Alert.alert('Success', parsed.data.message || 'Request deleted successfully');
              } catch (error) {
                console.log('Delete request error:', error);
                Alert.alert('Error', 'Failed to delete request');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.log('Delete alert error:', error);
    }
  };

  // ---------------------------------------------------------
  // PRIORITY FIX:
  // Wait for backend success, then update local state using
  // backend response, then refresh again from server.
  // ---------------------------------------------------------
  const handleSetPriority = async (emergencyId, priority) => {
    try {
      if (!adminUserId) {
        Alert.alert('Error', 'Admin user not found');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/emergency/${emergencyId}/priority/${adminUserId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        }
      );

      const parsed = await parseResponse(response);

      if (!parsed.ok || !parsed.data?.success) {
        const message =
          parsed?.data?.detail ||
          parsed?.data?.error ||
          parsed?.data?.message ||
          'Failed to update priority';
        Alert.alert('Error', message);
        return;
      }

      const updatedEmergency = parsed?.data?.emergency;

      if (updatedEmergency?.id) {
        setRequests((prev) => {
          const updated = prev.map((item) =>
            Number(item?.id) === Number(updatedEmergency.id)
              ? { ...item, ...updatedEmergency }
              : item
          );
          calculateCounts(updated);
          return updated;
        });

        if (popupRequest && Number(popupRequest?.id) === Number(updatedEmergency.id)) {
          setPopupRequest((prev) => (prev ? { ...prev, ...updatedEmergency } : prev));
        }
      } else {
        // fallback local update
        setRequests((prev) => {
          const updated = prev.map((item) =>
            Number(item?.id) === Number(emergencyId)
              ? { ...item, priority }
              : item
          );
          calculateCounts(updated);
          return updated;
        });

        if (popupRequest && Number(popupRequest?.id) === Number(emergencyId)) {
          setPopupRequest((prev) => (prev ? { ...prev, priority } : prev));
        }
      }

      await loadAdminData({ silent: true });
      Alert.alert('Success', parsed.data.message || `Priority updated to ${priority}`);
    } catch (error) {
      console.log('Priority update error:', error);
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const updateRequestStatus = async (requestItem, nextStatus, showSuccess = true) => {
    try {
      if (!requestItem?.id) {
        Alert.alert('Error', 'Invalid request');
        return false;
      }

      const response = await fetch(
        `${API_BASE_URL}/emergency/${requestItem.id}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus,
            accepted_by: nextStatus === 'pending' ? null : adminName || 'Admin',
          }),
        }
      );

      const parsed = await parseResponse(response);

      if (!parsed.ok || !parsed.data?.success) {
        const message =
          parsed?.data?.detail ||
          parsed?.data?.error ||
          parsed?.data?.message ||
          'Failed to update request status';
        Alert.alert('Error', message);
        return false;
      }

      const updatedEmergency = parsed?.data?.emergency;

      if (updatedEmergency?.id) {
        setRequests((prev) => {
          const updated = prev.map((item) =>
            Number(item?.id) === Number(updatedEmergency.id)
              ? { ...item, ...updatedEmergency }
              : item
          );
          calculateCounts(updated);
          return updated;
        });

        if (popupRequest && Number(popupRequest?.id) === Number(updatedEmergency.id)) {
          setPopupRequest((prev) => (prev ? { ...prev, ...updatedEmergency } : prev));
        }
      }

      await loadAdminData({ silent: true });

      if (showSuccess) {
        Alert.alert('Success', parsed.data.message || `Request marked as ${nextStatus}`);
      }

      return true;
    } catch (error) {
      console.log('Update request status error:', error);
      Alert.alert('Error', 'Failed to update request status');
      return false;
    }
  };

  const handleAcceptRequest = async (requestItem) => {
    const success = await updateRequestStatus(requestItem, 'accepted', true);
    if (success) {
      closePopup();
    }
  };

  const handleMarkInProgress = async (requestItem) => {
    await updateRequestStatus(requestItem, 'in progress', true);
  };

  const handleMarkResolved = async (requestItem) => {
    await updateRequestStatus(requestItem, 'resolved', true);
  };

  const handleMarkPending = async (requestItem) => {
    await updateRequestStatus(requestItem, 'pending', true);
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'my-assigned', label: 'My Assigned' },
  ];

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: '#f3f5f7' }}
        size="large"
        color="#0d6efd"
      />
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#111827', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroTitle}>Admin Operations</Text>
          <Text style={styles.heroSubtitle}>
            Monitor new requests, manage priorities, and respond quickly.
          </Text>
        </LinearGradient>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.totalSummary]}>
            <Text style={styles.summaryCount}>{totalRequests}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={[styles.summaryCard, styles.pendingSummary]}>
            <Text style={styles.summaryCount}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={[styles.summaryCard, styles.acceptedSummary]}>
            <Text style={styles.summaryCount}>{acceptedCount}</Text>
            <Text style={styles.summaryLabel}>Accepted</Text>
          </View>

          <View style={[styles.summaryCard, styles.progressSummary]}>
            <Text style={styles.summaryCount}>{progressCount}</Text>
            <Text style={styles.summaryLabel}>Progress</Text>
          </View>

          <View style={[styles.summaryCard, styles.resolvedSummary]}>
            <Text style={styles.summaryCount}>{resolvedCount}</Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigation.navigate('AdminMapTab')}
          activeOpacity={0.9}
        >
          <Text style={styles.mapButtonText}>📍 Open Live Map</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Request Management</Text>
          <Text style={styles.sectionSubtext}>
            Search, filter, prioritize, and manage requests
          </Text>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by type, description, location, provider, priority"
          placeholderTextColor="#9ca3af"
          value={searchText}
          onChangeText={setSearchText}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedFilter === filter.key && styles.activeFilterChip,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.activeFilterChipText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptySubtitle}>
              Try changing filters or search keywords.
            </Text>
          </View>
        ) : (
          filteredRequests.map((item, index) => {
            const status = String(item?.status || '').toLowerCase();

            return (
              <View
                key={String(item?.id ?? index)}
                style={[
                  styles.requestCard,
                  String(item?.priority || '').toLowerCase() === 'critical' &&
                    styles.criticalCard,
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('EmergencyDetails', { emergency: item })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.requestType}>
                      {String(item?.type || 'Emergency').toUpperCase()}
                    </Text>

                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityBackground(item?.priority) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          { color: getPriorityColor(item?.priority) },
                        ]}
                      >
                        {String(item?.priority || 'medium').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.requestDescription}>
                    {item?.description || 'No description'}
                  </Text>

                  <Text style={styles.requestLocation}>
                    📍 {item?.location_text || 'No location available'}
                  </Text>

                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          borderColor: getStatusColor(item?.status),
                          backgroundColor: getStatusBackground(item?.status),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusColor(item?.status) },
                        ]}
                      >
                        {String(item?.status || 'unknown').toUpperCase()}
                      </Text>
                    </View>

                    {item?.accepted_by ? (
                      <Text style={styles.acceptedByText}>
                        Assigned: {item.accepted_by}
                      </Text>
                    ) : (
                      <Text style={styles.notAssignedText}>Not assigned</Text>
                    )}
                  </View>

                  <Text style={styles.viewDetailsText}>Tap to view details</Text>
                </TouchableOpacity>

                <Text style={styles.actionSectionTitle}>Quick Status Actions</Text>

                <View style={styles.statusActionRow}>
                  {status === 'pending' ? (
                    <TouchableOpacity
                      style={[styles.statusActionButton, styles.acceptCardButton]}
                      onPress={() => handleAcceptRequest(item)}
                    >
                      <Text style={styles.acceptCardButtonText}>Accept</Text>
                    </TouchableOpacity>
                  ) : null}

                  {status !== 'in progress' && status !== 'resolved' ? (
                    <TouchableOpacity
                      style={[styles.statusActionButton, styles.progressCardButton]}
                      onPress={() => handleMarkInProgress(item)}
                    >
                      <Text style={styles.progressCardButtonText}>In Progress</Text>
                    </TouchableOpacity>
                  ) : null}

                  {status !== 'resolved' ? (
                    <TouchableOpacity
                      style={[styles.statusActionButton, styles.resolveCardButton]}
                      onPress={() => handleMarkResolved(item)}
                    >
                      <Text style={styles.resolveCardButtonText}>Resolve</Text>
                    </TouchableOpacity>
                  ) : null}

                  {status !== 'pending' ? (
                    <TouchableOpacity
                      style={[styles.statusActionButton, styles.pendingCardButton]}
                      onPress={() => handleMarkPending(item)}
                    >
                      <Text style={styles.pendingCardButtonText}>Set Pending</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.actionSectionTitle}>Set Priority</Text>

                <View style={styles.priorityRow}>
                  <TouchableOpacity
                    style={[styles.priorityButton, styles.lowButton]}
                    onPress={() => handleSetPriority(item.id, 'low')}
                  >
                    <Text style={styles.priorityButtonText}>Low</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.priorityButton, styles.mediumButton]}
                    onPress={() => handleSetPriority(item.id, 'medium')}
                  >
                    <Text style={styles.priorityButtonText}>Medium</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.priorityButton, styles.highButton]}
                    onPress={() => handleSetPriority(item.id, 'high')}
                  >
                    <Text style={styles.priorityButtonText}>High</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.priorityButton, styles.criticalButton]}
                    onPress={() => handleSetPriority(item.id, 'critical')}
                  >
                    <Text style={styles.priorityButtonText}>Critical</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteRequest(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete Request</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={popupVisible}
        transparent
        animationType="none"
        onRequestClose={closePopup}
      >
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        />

        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlayTouch}
          onPress={closePopup}
        />

        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ translateY: Animated.add(slideAnim, dragY) }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          <LinearGradient
            colors={['#fc8019', '#ff5f1f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.popupHeader}
          >
            <View style={styles.popupHeaderRow}>
              <View style={styles.popupHeaderLeft}>
                <Text style={styles.popupHeaderEyebrow}>NEW ORDER ALERT</Text>
                <Text style={styles.popupHeaderTitle}>🚨 New Emergency Request</Text>
                <Text style={styles.popupHeaderSubtitle}>
                  A new request just arrived. Take action quickly.
                </Text>
              </View>

              <View style={styles.popupPingBadge}>
                <Text style={styles.popupPingText}>LIVE</Text>
              </View>
            </View>
          </LinearGradient>

          {popupRequest ? (
            <View style={styles.popupBody}>
              <View style={styles.popupInfoCard}>
                <View style={styles.popupTopRow}>
                  <Text style={styles.popupType}>
                    {String(popupRequest?.type || 'Emergency').toUpperCase()}
                  </Text>

                  <View
                    style={[
                      styles.popupPriorityBadge,
                      {
                        backgroundColor: getPriorityBackground(popupRequest?.priority),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.popupPriorityText,
                        {
                          color: getPriorityColor(popupRequest?.priority),
                        },
                      ]}
                    >
                      {String(popupRequest?.priority || 'medium').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.popupLabel}>Description</Text>
                <Text style={styles.popupDescription}>
                  {popupRequest?.description || 'No description available'}
                </Text>

                <Text style={styles.popupLabel}>Location</Text>
                <Text style={styles.popupLocation}>
                  📍 {popupRequest?.location_text || 'Location not available'}
                </Text>

                <View style={styles.popupMetaRow}>
                  <View
                    style={[
                      styles.popupStatusBadge,
                      {
                        borderColor: getStatusColor(popupRequest?.status),
                        backgroundColor: getStatusBackground(popupRequest?.status),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.popupStatusText,
                        {
                          color: getStatusColor(popupRequest?.status),
                        },
                      ]}
                    >
                      {String(popupRequest?.status || 'pending').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.popupIdText}>
                    Request #{String(popupRequest?.id || '')}
                  </Text>
                </View>
              </View>

              <View style={styles.popupHintRow}>
                <Text style={styles.popupHintText}>Swipe down to dismiss</Text>
              </View>

              <View style={styles.popupButtonRow}>
                <TouchableOpacity
                  style={[styles.popupButton, styles.dismissButton]}
                  onPress={closePopup}
                  activeOpacity={0.9}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupButton, styles.viewButton]}
                  onPress={() => {
                    const selectedRequest = popupRequest;
                    closePopup();
                    setTimeout(() => {
                      navigation.navigate('EmergencyDetails', {
                        emergency: selectedRequest,
                      });
                    }, 300);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupButton, styles.acceptButton]}
                  onPress={() => handleAcceptRequest(popupRequest)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f3f5f7',
    flexGrow: 1,
    paddingBottom: 110,
  },

  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#d1d5db',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalSummary: {
    backgroundColor: '#ede9fe',
  },
  pendingSummary: {
    backgroundColor: '#fef3c7',
  },
  acceptedSummary: {
    backgroundColor: '#fce7f3',
  },
  progressSummary: {
    backgroundColor: '#dbeafe',
  },
  resolvedSummary: {
    backgroundColor: '#dcfce7',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
    marginTop: 6,
  },

  mapButton: {
    backgroundColor: '#0d6efd',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },

  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },

  filterScroll: {
    paddingBottom: 4,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#0d6efd',
  },
  filterChipText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  activeFilterChipText: {
    color: '#fff',
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },

  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  criticalCard: {
    borderWidth: 2,
    borderColor: '#dc2626',
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestType: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d6efd',
    paddingRight: 10,
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  requestDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    lineHeight: 24,
  },
  requestLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    lineHeight: 18,
  },

  metaRow: {
    marginTop: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  acceptedByText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '600',
  },
  notAssignedText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },

  viewDetailsText: {
    marginTop: 12,
    color: '#0d6efd',
    fontWeight: '700',
    fontSize: 13,
  },

  actionSectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },

  statusActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  statusActionButton: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  acceptCardButton: {
    backgroundColor: '#dcfce7',
  },
  progressCardButton: {
    backgroundColor: '#dbeafe',
  },
  resolveCardButton: {
    backgroundColor: '#ede9fe',
  },
  pendingCardButton: {
    backgroundColor: '#fef3c7',
  },
  acceptCardButtonText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },
  progressCardButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  resolveCardButtonText: {
    color: '#6d28d9',
    fontWeight: '700',
    fontSize: 13,
  },
  pendingCardButtonText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 13,
  },

  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  priorityButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  lowButton: {
    backgroundColor: '#e5e7eb',
  },
  mediumButton: {
    backgroundColor: '#dbeafe',
  },
  highButton: {
    backgroundColor: '#ffedd5',
  },
  criticalButton: {
    backgroundColor: '#fee2e2',
  },
  priorityButtonText: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 13,
  },

  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },

  popupContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
  },
  dragHandle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
  },

  popupHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  popupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  popupHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  popupHeaderEyebrow: {
    color: '#fff7ed',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  popupHeaderTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: 'bold',
  },
  popupHeaderSubtitle: {
    color: '#fff7ed',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  popupPingBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  popupPingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },

  popupBody: {
    padding: 18,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  popupInfoCard: {
    backgroundColor: '#fffaf5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  popupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupType: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    paddingRight: 10,
  },
  popupPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  popupPriorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  popupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  popupDescription: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    lineHeight: 24,
  },
  popupLocation: {
    fontSize: 14,
    color: '#374151',
    marginTop: 6,
    lineHeight: 20,
  },
  popupMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  popupStatusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  popupStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  popupIdText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },

  popupHintRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  popupHintText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },

  popupButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  popupButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dismissButton: {
    backgroundColor: '#e5e7eb',
  },
  viewButton: {
    backgroundColor: '#dbeafe',
  },
  acceptButton: {
    backgroundColor: '#22c55e',
  },
  dismissButtonText: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewButtonText: {
    color: '#1d4ed8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});