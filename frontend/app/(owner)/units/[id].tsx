import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { StampAnimation } from '@/src/components/common/StampAnimation';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Unit, Due, Payment, DueStatus } from '@/src/types/database.types';

interface DueWithPayments extends Due {
  payments?: Payment[];
}

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [dues, setDues] = useState<DueWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [stampAmount, setStampAmount] = useState<number>(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchUnitData = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch unit
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', id)
        .single();

      if (unitError) throw unitError;
      setUnit(unitData);

      // Fetch dues with payments
      const { data: duesData, error: duesError } = await supabase
        .from('dues')
        .select(`
          *,
          payments(*)
        `)
        .eq('unit_id', id)
        .order('due_date', { ascending: false });

      if (duesError) throw duesError;
      setDues(duesData || []);
    } catch (error) {
      console.error('Error fetching unit:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchUnitData();
    }, [fetchUnitData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUnitData();
  };

  // Generate a due for current month manually (for testing)
  const handleGenerateDue = async () => {
    if (!unit) return;
    try {
      setGenerateLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      // Check if there's an active tenancy or generate without one for testing
      const { data: tenancy } = await supabase
        .from('tenancies')
        .select('*')
        .eq('unit_id', id)
        .eq('status', 'active')
        .maybeSingle();

      const totalAmount = Number(unit.rent_amount) + Number(unit.service_charge_amount || 0);

      const { error } = await supabase
        .from('dues')
        .insert([{
          unit_id: unit.id,
          tenancy_id: tenancy?.id || null,
          period_month: currentMonth,
          amount: totalAmount,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'due',
        }]);

      if (error) throw error;

      await fetchUnitData();
      Alert.alert('Success', 'Due generated for ' + currentMonth);
    } catch (error: any) {
      console.error('Error generating due:', error);
      Alert.alert('Error', error.message || 'Failed to generate due');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Approve payment with stamp animation
  const handleApprovePayment = async (payment: Payment, due: Due) => {
    try {
      // Update payment status to approved
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (paymentError) throw paymentError;

      // Update due status to paid
      const { error: dueError } = await supabase
        .from('dues')
        .update({ status: 'paid' })
        .eq('id', due.id);

      if (dueError) throw dueError;

      // Trigger stamp animation
      setStampAmount(Number(due.amount));
      setShowStamp(true);
      setShowPaymentModal(false);

      // Refresh data
      await fetchUnitData();
    } catch (error: any) {
      console.error('Error approving payment:', error);
      Alert.alert('Error', error.message || 'Failed to approve payment');
    }
  };

  // Log manual payment (owner records payment received)
  const handleLogManualPayment = async (due: Due) => {
    Alert.alert(
      'Log Manual Payment',
      `Mark this due of ৳${Number(due.amount).toLocaleString()} as paid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // Create a payment record
              const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert([{
                  due_id: due.id,
                  amount: due.amount,
                  method: 'manual_screenshot',
                  status: 'approved',
                  approved_by: user?.id,
                  approved_at: new Date().toISOString(),
                }])
                .select()
                .single();

              if (paymentError) throw paymentError;

              // Update due status
              const { error: dueError } = await supabase
                .from('dues')
                .update({ status: 'paid' })
                .eq('id', due.id);

              if (dueError) throw dueError;

              // Trigger stamp animation
              setStampAmount(Number(due.amount));
              setShowStamp(true);

              await fetchUnitData();
            } catch (error: any) {
              console.error('Error:', error);
              Alert.alert('Error', error.message || 'Failed to log payment');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: DueStatus): string => {
    switch (status) {
      case 'paid': return colors.paidGreen;
      case 'due': return colors.dueAmber;
      case 'overdue': return colors.overdueRed;
      default: return colors.gray400;
    }
  };

  const getStatusLabel = (status: DueStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatMonth = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!unit) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Unit not found</Text>
      </SafeAreaView>
    );
  }

  const totalDue = dues.filter(d => d.status === 'due').reduce((sum, d) => sum + Number(d.amount), 0);
  const totalOverdue = dues.filter(d => d.status === 'overdue').reduce((sum, d) => sum + Number(d.amount), 0);
  const totalPaid = dues.filter(d => d.status === 'paid').reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <SafeAreaView style={styles.container} testID="unit-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unit {unit.unit_number}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {/* Unit Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <View style={styles.unitBadge}>
              <Text style={styles.unitBadgeText}>#{unit.unit_number}</Text>
            </View>
            <View style={styles.unitDetails}>
              <Text style={styles.detailText}>{unit.bedrooms} Bedroom{unit.bedrooms > 1 ? 's' : ''}</Text>
              <Text style={styles.detailAmount}>৳{Number(unit.rent_amount).toLocaleString()}/mo</Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, { color: colors.paidGreen }]}>
                ৳{totalPaid.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Due</Text>
              <Text style={[styles.summaryValue, { color: colors.dueAmber }]}>
                ৳{totalDue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <Text style={[styles.summaryValue, { color: colors.overdueRed }]}>
                ৳{totalOverdue.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Ledger Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ledger</Text>
            <TouchableOpacity
              testID="generate-due-btn"
              style={styles.generateButton}
              onPress={handleGenerateDue}
              disabled={generateLoading}
            >
              <MaterialIcons name="add" size={16} color={colors.ledgerTeal} />
              <Text style={styles.generateButtonText}>Generate Due</Text>
            </TouchableOpacity>
          </View>

          {dues.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={48} color={colors.gray300} />
              <Text style={styles.emptyStateText}>No dues yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Generate a due for this month to start tracking
              </Text>
            </View>
          ) : (
            dues.map((due) => (
              <View
                key={due.id}
                testID={`due-row-${due.id}`}
                style={styles.ledgerRow}
              >
                <View
                  style={[styles.statusBar, { backgroundColor: getStatusColor(due.status) }]}
                />
                <View style={styles.ledgerContent}>
                  <View style={styles.ledgerTop}>
                    <View>
                      <Text style={styles.ledgerMonth}>{formatMonth(due.period_month)}</Text>
                      <Text style={styles.ledgerDate}>Due: {formatDate(due.due_date)}</Text>
                    </View>
                    <View style={styles.ledgerRight}>
                      <Text style={styles.ledgerAmount}>
                        ৳{Number(due.amount).toLocaleString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(due.status) + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(due.status) }]}>
                          {getStatusLabel(due.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Payments for this due */}
                  {due.payments && due.payments.length > 0 && (
                    <View style={styles.paymentsSection}>
                      {due.payments.map((payment) => (
                        <TouchableOpacity
                          key={payment.id}
                          testID={`payment-row-${payment.id}`}
                          style={styles.paymentRow}
                          onPress={() => {
                            if (payment.status === 'pending_approval') {
                              setSelectedPayment(payment);
                              setShowPaymentModal(true);
                            }
                          }}
                        >
                          <MaterialIcons
                            name={payment.status === 'approved' ? 'check-circle' : 'schedule'}
                            size={16}
                            color={payment.status === 'approved' ? colors.paidGreen : colors.dueAmber}
                          />
                          <Text style={styles.paymentText}>
                            {payment.method === 'gateway' ? 'Gateway' : 'Manual'} — 
                            ৳{Number(payment.amount).toLocaleString()}
                          </Text>
                          <Text style={styles.paymentStatus}>
                            {payment.status === 'pending_approval' ? 'Tap to approve' : 'Approved'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Log payment button for due/overdue */}
                  {(due.status === 'due' || due.status === 'overdue') &&
                    (!due.payments || due.payments.every(p => p.status !== 'approved')) && (
                    <TouchableOpacity
                      testID={`log-payment-${due.id}`}
                      style={styles.logPaymentBtn}
                      onPress={() => handleLogManualPayment(due)}
                    >
                      <MaterialIcons name="edit-note" size={16} color={colors.ledgerTeal} />
                      <Text style={styles.logPaymentText}>Log Payment Received</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Payment Approval Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.approvalModal}>
            <Text style={styles.approvalTitle}>Approve Payment?</Text>
            {selectedPayment && (
              <>
                <Text style={styles.approvalAmount}>
                  ৳{Number(selectedPayment.amount).toLocaleString()}
                </Text>
                <Text style={styles.approvalMethod}>
                  Method: {selectedPayment.method === 'gateway' ? 'Payment Gateway' : 'Manual (Screenshot)'}
                </Text>
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    testID="cancel-approval-btn"
                    style={[styles.approvalBtn, styles.cancelBtn]}
                    onPress={() => setShowPaymentModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="confirm-approval-btn"
                    style={[styles.approvalBtn, styles.approveBtn]}
                    onPress={() => {
                      const due = dues.find(d => d.id === selectedPayment.due_id);
                      if (due) handleApprovePayment(selectedPayment, due);
                    }}
                  >
                    <MaterialIcons name="check" size={20} color={colors.white} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Stamp Animation */}
      <StampAnimation
        visible={showStamp}
        onComplete={() => setShowStamp(false)}
        amount={stampAmount}
      />
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
  errorText: {
    textAlign: 'center',
    marginTop: spacing.xxxl,
    color: colors.gray500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    ...shadows.small,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  unitBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.ledgerTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  unitBadgeText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.white,
  },
  unitDetails: {
    flex: 1,
  },
  detailText: {
    fontSize: typography.sm,
    color: colors.gray600,
    marginBottom: 2,
  },
  detailAmount: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    fontVariant: ['tabular-nums'],
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ledgerTeal + '15',
    borderRadius: borderRadius.button,
    gap: 4,
  },
  generateButtonText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.ledgerTeal,
  },
  ledgerRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  statusBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  ledgerContent: {
    flex: 1,
    padding: spacing.lg,
  },
  ledgerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ledgerMonth: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: 2,
  },
  ledgerDate: {
    fontSize: typography.xs,
    color: colors.gray500,
  },
  ledgerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  ledgerAmount: {
    fontSize: typography.lg,
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
  paymentsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentText: {
    fontSize: typography.sm,
    color: colors.gray700,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  paymentStatus: {
    fontSize: typography.xs,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  logPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: spacing.xs,
  },
  logPaymentText: {
    fontSize: typography.sm,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
  },
  emptyStateText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  approvalModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  approvalTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  approvalAmount: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.ledgerTeal,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  approvalMethod: {
    fontSize: typography.sm,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  approvalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
  },
  cancelBtn: {
    backgroundColor: colors.gray100,
  },
  cancelBtnText: {
    color: colors.gray700,
    fontWeight: typography.semibold,
    fontSize: typography.base,
  },
  approveBtn: {
    backgroundColor: colors.paidGreen,
  },
  approveBtnText: {
    color: colors.white,
    fontWeight: typography.semibold,
    fontSize: typography.base,
  },
});
