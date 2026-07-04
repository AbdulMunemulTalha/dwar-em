import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Property } from '@/src/types/database.types';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState({
    totalUnits: 0,
    occupiedUnits: 0,
    totalDue: 0,
    paidThisMonth: 0,
    overdueAmount: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch properties owned by user
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          property_owners!inner(user_id)
        `)
        .eq('property_owners.user_id', user?.id);

      if (propertiesError) throw propertiesError;

      setProperties(propertiesData || []);

      // Fetch units statistics
      const propertyIds = propertiesData?.map(p => p.id) || [];
      
      if (propertyIds.length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .in('property_id', propertyIds);

        if (unitsError) throw unitsError;

        const totalUnits = unitsData?.length || 0;
        const occupiedUnits = unitsData?.filter(u => u.status === 'occupied').length || 0;

        // Fetch dues statistics
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { data: duesData, error: duesError } = await supabase
          .from('dues')
          .select('*')
          .in('unit_id', unitsData?.map(u => u.id) || []);

        if (duesError) throw duesError;

        const totalDue = duesData?.filter(d => d.status === 'due').reduce((sum, d) => sum + d.amount, 0) || 0;
        const paidThisMonth = duesData?.filter(d => d.status === 'paid' && d.period_month === currentMonth).reduce((sum, d) => sum + d.amount, 0) || 0;
        const overdueAmount = duesData?.filter(d => d.status === 'overdue').reduce((sum, d) => sum + d.amount, 0) || 0;

        setStats({
          totalUnits,
          occupiedUnits,
          totalDue,
          paidThisMonth,
          overdueAmount,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day</Text>
          <Text style={styles.title}>Property Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(owner)/properties/add')}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <MaterialIcons name="home" size={32} color={colors.ledgerTeal} />
            <Text style={styles.statValue}>{stats.totalUnits}</Text>
            <Text style={styles.statLabel}>Total Units</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <MaterialIcons name="check-circle" size={32} color={colors.paidGreen} />
            <Text style={styles.statValue}>{stats.occupiedUnits}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <MaterialIcons name="schedule" size={32} color={colors.dueAmber} />
            <Text style={styles.statValue}>৳{stats.totalDue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Due</Text>
          </View>

          <View style={[styles.statCard, styles.statCardDanger]}>
            <MaterialIcons name="warning" size={32} color={colors.overdueRed} />
            <Text style={styles.statValue}>৳{stats.overdueAmount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>

        {/* Properties List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Properties</Text>
          
          {properties.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="apartment" size={64} color={colors.gray300} />
              <Text style={styles.emptyStateText}>No properties yet</Text>
              <Text style={styles.emptyStateSubtext}>Add your first property to get started</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => router.push('/(owner)/properties/add')}
              >
                <Text style={styles.emptyStateButtonText}>Add Property</Text>
              </TouchableOpacity>
            </View>
          ) : (
            properties.map((property) => (
              <TouchableOpacity
                key={property.id}
                style={styles.propertyCard}
                onPress={() => router.push(`/(owner)/properties/${property.id}`)}
              >
                <View style={styles.propertyHeader}>
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>{property.name}</Text>
                    <Text style={styles.propertyAddress}>{property.address}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.gray400} />
                </View>
                <View style={styles.propertyBadge}>
                  <Text style={styles.propertyBadgeText}>
                    {property.type === 'single_owner' ? 'Single Owner' : 'Multi-Owner'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  greeting: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.ink,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ledgerTeal,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    backgroundColor: colors.white,
    ...shadows.small,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: colors.ledgerTeal,
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: colors.paidGreen,
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: colors.dueAmber,
  },
  statCardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: colors.overdueRed,
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  propertyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  propertyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    backgroundColor: colors.gray100,
  },
  propertyBadgeText: {
    fontSize: typography.xs,
    color: colors.gray600,
    fontWeight: typography.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  emptyStateSubtext: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.ledgerTeal,
    borderRadius: borderRadius.button,
  },
  emptyStateButtonText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.white,
  },
});