import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOW } from '../theme';
import AppCard from '../components/AppCard';
import AppChip from '../components/AppChip';
import SectionHeader from '../components/SectionHeader';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [total, setTotal] = useState(0);

  const loadDashboard = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        setPending(0);
        setProgress(0);
        setResolved(0);
        setTotal(0);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/emergencies/${userId}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setPending(0);
        setProgress(0);
        setResolved(0);
        setTotal(0);
        setLoading(false);
        return;
      }

      const pendingCount = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'pending'
      ).length;

      const progressCount = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'in progress'
      ).length;

      const resolvedCount = data.filter(
        (item) => String(item?.status || '').toLowerCase() === 'resolved'
      ).length;

      setPending(pendingCount);
      setProgress(progressCount);
      setResolved(resolvedCount);
      setTotal(data.length);
    } catch (error) {
      console.log('Dashboard error:', error);
      setPending(0);
      setProgress(0);
      setResolved(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const resolutionRate = useMemo(() => {
    if (!total) return 0;
    return Math.round((resolved / total) * 100);
  }, [resolved, total]);

  const activeRate = useMemo(() => {
    if (!total) return 0;
    return Math.round(((pending + progress) / total) * 100);
  }, [pending, progress, total]);

  const dominantStatus = useMemo(() => {
    const maxValue = Math.max(pending, progress, resolved);

    if (maxValue === 0) return 'No activity';
    if (maxValue === pending) return 'Pending';
    if (maxValue === progress) return 'In Progress';
    return 'Resolved';
  }, [pending, progress, resolved]);

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, backgroundColor: COLORS.background }}
        size="large"
        color={COLORS.primary}
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.blueCyan}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>Dashboard Overview</Text>
        <Text style={styles.heroSubtitle}>
          Track your requests, current progress, and safety activity in one place.
        </Text>

        <View style={styles.heroChipsRow}>
          <AppChip label={`${total} Total`} type="info" />
          <View style={{ width: 8 }} />
          <AppChip label={`${resolutionRate}% Resolved`} type="success" />
        </View>
      </LinearGradient>

      <SectionHeader
        title="Summary"
        subtitle="Quick glance at all request activity"
      />

      <AppCard variant="purple" style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Requests</Text>
        <Text style={styles.totalValue}>{total}</Text>
        <Text style={styles.totalSubtext}>All emergencies created so far</Text>
      </AppCard>

      <View style={styles.statsRow}>
        <AppCard variant="orange" style={styles.smallStatCard}>
          <Text style={styles.smallStatCount}>{pending}</Text>
          <Text style={styles.smallStatLabel}>Pending</Text>
        </AppCard>

        <AppCard variant="blue" style={styles.smallStatCard}>
          <Text style={styles.smallStatCount}>{progress}</Text>
          <Text style={styles.smallStatLabel}>In Progress</Text>
        </AppCard>

        <AppCard variant="green" style={styles.smallStatCard}>
          <Text style={styles.smallStatCount}>{resolved}</Text>
          <Text style={styles.smallStatLabel}>Resolved</Text>
        </AppCard>
      </View>

      <SectionHeader
        title="Insights"
        subtitle="Useful information from your current numbers"
      />

      <AppCard style={styles.insightsCard}>
        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Most Common Status</Text>
          <View style={styles.insightChipWrap}>
            <AppChip
              label={dominantStatus}
              type={
                dominantStatus === 'Pending'
                  ? 'warning'
                  : dominantStatus === 'In Progress'
                  ? 'info'
                  : dominantStatus === 'Resolved'
                  ? 'success'
                  : 'default'
              }
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Resolution Rate</Text>
          <Text style={styles.insightValue}>{resolutionRate}%</Text>
          <Text style={styles.insightSubtext}>
            Percentage of total requests already resolved
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.insightItem}>
          <Text style={styles.insightTitle}>Active Request Rate</Text>
          <Text style={styles.insightValue}>{activeRate}%</Text>
          <Text style={styles.insightSubtext}>
            Requests that are still pending or in progress
          </Text>
        </View>
      </AppCard>

      <SectionHeader
        title="Progress Cards"
        subtitle="Visual cards for your app activity"
      />

      <View style={styles.progressCardsWrap}>
        <LinearGradient
          colors={GRADIENTS.sunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressGradientCard}
        >
          <Text style={styles.gradientCardTitle}>Pending Work</Text>
          <Text style={styles.gradientCardCount}>{pending}</Text>
          <Text style={styles.gradientCardSubtext}>
            Requests waiting for action
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={GRADIENTS.greenBlue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressGradientCard}
        >
          <Text style={styles.gradientCardTitle}>Resolved Work</Text>
          <Text style={styles.gradientCardCount}>{resolved}</Text>
          <Text style={styles.gradientCardSubtext}>
            Successfully completed requests
          </Text>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 140,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },

  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 24,
    ...SHADOW.card,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#E0F2FE',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 21,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  totalCard: {
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 22,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  totalSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  smallStatCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  smallStatCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  smallStatLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },

  insightsCard: {
    marginBottom: 24,
  },
  insightItem: {
    paddingVertical: 4,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  insightChipWrap: {
    marginTop: 2,
  },
  insightValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  insightSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  progressCardsWrap: {
    gap: 14,
  },
  progressGradientCard: {
    borderRadius: RADIUS.xl,
    padding: 22,
    ...SHADOW.card,
  },
  gradientCardTitle: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradientCardCount: {
    color: COLORS.textLight,
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 8,
  },
  gradientCardSubtext: {
    color: '#FFF7ED',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
});