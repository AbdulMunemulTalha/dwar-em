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
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Property } from '@/src/types/database.types';

export default function PropertiesListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<(Property & { unit_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_owners!inner(user_id),
          units(count)
        `)
        .eq('property_owners.user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const propsWithCount = (data || []).map((p: any) => ({
        ...p,
        unit_count: p.units?.[0]?.count || 0,
      }));

      setProperties(propsWithCount);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProperties();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="properties-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
        <TouchableOpacity
          testID="add-property-btn"
          style={styles.addButton}
          onPress={() => router.push('/(owner)/properties/add')}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {properties.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="apartment" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No properties yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first property to get started</Text>
            <TouchableOpacity
              testID="add-first-property-btn"
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
              testID={`property-card-${property.id}`}
              style={styles.propertyCard}
              onPress={() => router.push(`/(owner)/properties/${property.id}`)}
            >
              <View style={styles.propertyIcon}>
                <MaterialIcons name="apartment" size={28} color={colors.ledgerTeal} />
              </View>
              <View style={styles.propertyInfo}>
                <Text style={styles.propertyName}>{property.name}</Text>
                <Text style={styles.propertyAddress} numberOfLines={1}>{property.address}</Text>
                <View style={styles.propertyMeta}>
                  <View style={styles.propertyBadge}>
                    <Text style={styles.propertyBadgeText}>
                      {property.type === 'single_owner' ? 'Single Owner' : 'Multi-Owner'}
                    </Text>
                  </View>
                  <Text style={styles.unitCount}>
                    {property.unit_count} {property.unit_count === 1 ? 'unit' : 'units'}
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.gray400} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  loader: {
    flex: 1,
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
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.ink,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ledgerTeal,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
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
    marginBottom: spacing.sm,
  },
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  propertyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
    backgroundColor: colors.gray100,
  },
  propertyBadgeText: {
    fontSize: typography.xs,
    color: colors.gray600,
    fontWeight: typography.medium,
  },
  unitCount: {
    fontSize: typography.xs,
    color: colors.gray500,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
