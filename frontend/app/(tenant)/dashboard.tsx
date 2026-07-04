import React, { useState, useCallback } from 'react';
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
import { Tenancy, Unit, Due, DueStatus } from '@/src/types/database.types';

interface TenancyWithUnit extends Tenancy {
  units?: Unit & { properties?: { name: string; address: string } };
}

export default function TenantDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenancy, setTenancy] = useState<TenancyWithUnit | null>(null);
  const [currentDues, setCurrentDues] = useState<Due[]>([]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch active tenancy for this tenant
      const { data: tenancyData, error: tenancyError } = await supabase
        .from('tenancies')
        .select(`
          *,
          units(
            *,
            properties(name, address)
          )
        `)
        .eq('tenant_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (tenancyError) throw tenancyError;
      setTenancy(tenancyData as TenancyWithUnit);

      // Fetch current dues for the tenancy
      if (tenancyData) {
        const { data: duesData } = await supabase
          .from('dues')
          .select('*')
          .eq('tenancy_id', tenancyData.id)
          .in('status', ['due', 'overdue'])
          .order('due_date');

        setCurrentDues(duesData || []);
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: DueStatus): string => {
    switch (status) {
      case 'paid': return colors.paidGreen;
      case 'due': return colors.dueAmber;
      case 'overdue': return colors.overdueRed;
      default: return colors.gray400;
    }
  };

  const formatMonth = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const totalDue = currentDues.reduce((sum, d) => sum + Number(d.amount), 0);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="tenant-dashboard-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Your Home</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {!tenancy ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="home-work" size={72} color={colors.gray300} />
            <Text style={styles.emptyStateTitle}>No active tenancy</Text>
            <Text style={styles.emptyStateText}>
              Once your landlord adds you to a unit, your rental details will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Home Card */}
            <View style={styles.homeCard}>
              <View style={styles.homeCardHeader}>
                <MaterialIcons name="apartment" size={32} color={colors.ledgerTeal} />
                <View style={styles.homeCardBadge}>
                  <MaterialIcons name="check-circle" size={12} color={colors.paidGreen} />
                  <Text style={styles.homeCardBadgeText}>Active</Text>
                </View>
              </View>
              <Text style={styles.propertyName}>{tenancy.units?.properties?.name}</Text>
              <Text style={styles.propertyAddress}>{tenancy.units?.properties?.address}</Text>
              <View style={styles.unitRow}>
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>Unit {tenancy.units?.unit_number}</Text>
                </View>
                <Text style={styles.rentAmount}>
                  ৳{Number(tenancy.rent_amount).toLocaleString()}/mo
                </Text>
              </View>
            </View>

            {/* Total Due Card */}
            {totalDue > 0 && (
              <View style={styles.dueCard}>
                <View style={styles.dueCardHeader}>
                  <MaterialIcons name="account-balance-wallet" size={24} color={colors.dueAmber} />
                  <Text style={styles.dueCardTitle}>Amount Due</Text>
                </View>
                <Text style={styles.dueAmount}>৳{totalDue.toLocaleString()}</Text>
                <Text style={styles.dueSubtext}>
                  {currentDues.length} pending {currentDues.length === 1 ? 'payment' : 'payments'}
                </Text>
                <TouchableOpacity
                  testID="pay-now-btn"
                  style={styles.payButton}
                  onPress={() => router.push('/(tenant)/payments')}
                >
                  <MaterialIcons name="payment" size={20} color={colors.white} />
                  <Text style={styles.payButtonText}>View & Pay</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Dues List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {currentDues.length > 0 ? 'Pending Dues' : 'All Clear! 🎉'}
              </Text>
              {currentDues.length === 0 ? (
                <View style={styles.allClearCard}>
                  <MaterialIcons name="verified" size={40} color={colors.paidGreen} />
                  <Text style={styles.allClearText}>No pending dues</Text>
                  <Text style={styles.allClearSubtext}>
                    You&apos;re all caught up on your rent
                  </Text>
                </View>
              ) : (
                currentDues.map((due) => (
                  <TouchableOpacity
                    key={due.id}
                    testID={`due-row-${due.id}`}
                    style={styles.dueRow}
                    onPress={() => router.push('/(tenant)/payments')}
                  >
                    <View
                      style={[styles.statusBar, { backgroundColor: getStatusColor(due.status) }]}
                    />
                    <View style={styles.dueRowContent}>
                      <View style={styles.dueRowLeft}>
                        <Text style={styles.duePeriod}>{formatMonth(due.period_month)}</Text>
                        <Text style={styles.dueDate}>Due by {formatDate(due.due_date)}</Text>
                      </View>
                      <View style={styles.dueRowRight}>
                        <Text style={styles.dueRowAmount}>
                          ৳{Number(due.amount).toLocaleString()}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(due.status) + '20' }]}>
                          <Text style={[styles.statusBadgeText, { color: getStatusColor(due.status) }]}>
                            {due.status === 'overdue' ? 'Overdue' : 'Due'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                testID="report-issue-btn"
                style={styles.actionCard}
                onPress={() => router.push('/(tenant)/issues')}
              >
                <MaterialIcons name="build" size={24} color={colors.dueAmber} />
                <Text style={styles.actionText}>Report Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="payment-history-btn"
                style={styles.actionCard}
                onPress={() => router.push('/(tenant)/payments')}
              >
                <MaterialIcons name="history" size={24} color={colors.ledgerTeal} />
                <Text style={styles.actionText}>Payment History</Text>
              </TouchableOpacity>
            </View>
          </>
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
  greeting: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxxl,
  },
  emptyStateTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  homeCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    ...shadows.small,
  },
  homeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  homeCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    backgroundColor: colors.paidGreen + '15',
    gap: 4,
  },
  homeCardBadgeText: {
    fontSize: typography.xs,
    color: colors.paidGreen,
    fontWeight: typography.semibold,
  },
  propertyName: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  unitBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    backgroundColor: colors.ledgerTeal + '15',
  },
  unitBadgeText: {
    fontSize: typography.sm,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
  rentAmount: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dueCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.dueAmber,
    ...shadows.small,
  },
  dueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dueCardTitle: {
    fontSize: typography.sm,
    color: colors.gray600,
    fontWeight: typography.medium,
  },
  dueAmount: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.dueAmber,
    fontVariant: ['tabular-nums'],
  },
  dueSubtext: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ledgerTeal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  allClearCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    ...shadows.small,
  },
  allClearText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginTop: spacing.md,
  },
  allClearSubtext: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  dueRow: {
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
  dueRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dueRowLeft: {
    flex: 1,
  },
  duePeriod: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: 2,
  },
  dueDate: {
    fontSize: typography.xs,
    color: colors.gray500,
  },
  dueRowRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  dueRowAmount: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: typography.semibold,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.small,
  },
  actionText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.ink,
  },
});
