import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Booking, Listing, Unit } from '@/src/types/database.types';

interface BookingWithDetails extends Booking {
  listings?: Listing & {
    units?: Unit & { properties?: { name: string } };
  };
  users?: { name: string; phone: string; email: string };
}

export default function OwnerBookingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Get properties owned by user
      const { data: properties } = await supabase
        .from('properties')
        .select('id, property_owners!inner(user_id)')
        .eq('property_owners.user_id', user.id);

      if (!properties || properties.length === 0) {
        setBookings([]);
        return;
      }

      const propertyIds = properties.map(p => p.id);

      // Get units in those properties
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds);

      const unitIds = (units || []).map(u => u.id);

      // Get listings for those units
      const { data: listings } = await supabase
        .from('listings')
        .select('id')
        .in('unit_id', unitIds);

      const listingIds = (listings || []).map(l => l.id);
      if (listingIds.length === 0) {
        setBookings([]);
        return;
      }

      // Get bookings for those listings
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings(*, units(*, properties(name))),
          users:prospective_tenant_id(name, phone, email)
        `)
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings((data as BookingWithDetails[]) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleUpdateStatus = async (bookingId: string, status: 'accepted' | 'declined') => {
    Alert.alert(
      status === 'accepted' ? 'Accept Booking' : 'Decline Booking',
      status === 'accepted' 
        ? 'Confirm accepting this booking request?'
        : 'Confirm declining this booking request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'accepted' ? 'Accept' : 'Decline',
          style: status === 'accepted' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setActionLoading(bookingId);
              const { error } = await supabase
                .from('bookings')
                .update({ status })
                .eq('id', bookingId);
              if (error) throw error;
              await fetchBookings();
              Alert.alert(
                'Done', 
                status === 'accepted' 
                  ? 'Booking accepted! The tenant will be notified.'
                  : 'Booking declined.'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update booking');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'requested': return colors.dueAmber;
      case 'accepted': return colors.paidGreen;
      case 'declined': return colors.overdueRed;
      case 'cancelled': return colors.gray500;
      default: return colors.gray400;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="owner-bookings-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Booking Requests</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No booking requests</Text>
            <Text style={styles.emptyStateSubtext}>
              Once tenants request to book your listed units, they will appear here
            </Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View
              key={booking.id}
              testID={`booking-card-${booking.id}`}
              style={styles.bookingCard}
            >
              <View
                style={[styles.statusBar, { backgroundColor: getStatusColor(booking.status) }]}
              />
              <View style={styles.bookingContent}>
                {/* Header */}
                <View style={styles.bookingHeader}>
                  <View style={styles.tenantInfo}>
                    <View style={styles.tenantAvatar}>
                      <MaterialIcons name="person" size={20} color={colors.white} />
                    </View>
                    <View style={styles.tenantDetails}>
                      <Text style={styles.tenantName}>
                        {booking.users?.name || 'Prospective Tenant'}
                      </Text>
                      <Text style={styles.tenantContact}>
                        {booking.users?.phone || booking.users?.email}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(booking.status) }]}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Property Info */}
                <View style={styles.propertyRow}>
                  <MaterialIcons name="apartment" size={16} color={colors.gray500} />
                  <Text style={styles.propertyText}>
                    {booking.listings?.units?.properties?.name} — 
                    Unit {booking.listings?.units?.unit_number}
                  </Text>
                </View>

                <View style={styles.propertyRow}>
                  <MaterialIcons name="event" size={16} color={colors.gray500} />
                  <Text style={styles.propertyText}>
                    Move-in: {formatDate(booking.proposed_move_in_date)}
                  </Text>
                </View>

                <View style={styles.propertyRow}>
                  <MaterialIcons name="payments" size={16} color={colors.gray500} />
                  <Text style={styles.propertyText}>
                    ৳{Number(booking.listings?.price || 0).toLocaleString()}/mo
                  </Text>
                </View>

                {/* Actions */}
                {booking.status === 'requested' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      testID={`decline-${booking.id}`}
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleUpdateStatus(booking.id, 'declined')}
                      disabled={actionLoading === booking.id}
                    >
                      {actionLoading === booking.id ? (
                        <ActivityIndicator size="small" color={colors.overdueRed} />
                      ) : (
                        <>
                          <MaterialIcons name="close" size={16} color={colors.overdueRed} />
                          <Text style={styles.declineText}>Decline</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`accept-${booking.id}`}
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleUpdateStatus(booking.id, 'accepted')}
                      disabled={actionLoading === booking.id}
                    >
                      {actionLoading === booking.id ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <MaterialIcons name="check" size={16} color={colors.white} />
                          <Text style={styles.acceptText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    flexGrow: 1,
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
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  statusBar: {
    width: 4,
  },
  bookingContent: {
    flex: 1,
    padding: spacing.lg,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ledgerTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tenantDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  tenantContact: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: typography.semibold,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  propertyText: {
    fontSize: typography.sm,
    color: colors.gray700,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    gap: spacing.xs,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: colors.overdueRed,
  },
  declineText: {
    color: colors.overdueRed,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  acceptButton: {
    backgroundColor: colors.paidGreen,
  },
  acceptText: {
    color: colors.white,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});
