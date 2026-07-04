import React, { useState, useCallback } from 'react';
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Due, Payment, DueStatus } from '@/src/types/database.types';

interface DueWithPayments extends Due {
  payments?: Payment[];
}

export default function TenantPaymentsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dues, setDues] = useState<DueWithPayments[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState<Due | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDues = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Get active tenancy
      const { data: tenancy } = await supabase
        .from('tenancies')
        .select('id')
        .eq('tenant_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!tenancy) {
        setDues([]);
        return;
      }

      // Get all dues with payments
      const { data: duesData, error } = await supabase
        .from('dues')
        .select(`*, payments(*)`)
        .eq('tenancy_id', tenancy.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setDues(duesData || []);
    } catch (error) {
      console.error('Error fetching dues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchDues();
    }, [fetchDues])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDues();
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant photo library access to upload payment screenshot',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Store as base64 data URI for now (can upload to Supabase Storage later)
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        setScreenshot(base64Uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Error', 'Could not select image');
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedDue) return;
    if (!screenshot) {
      Alert.alert('Screenshot required', 'Please upload payment screenshot to proceed');
      return;
    }

    try {
      setSubmitting(true);

      // Insert payment record with base64 screenshot
      const { error } = await supabase.from('payments').insert([{
        due_id: selectedDue.id,
        amount: selectedDue.amount,
        method: 'manual_screenshot',
        screenshot_url: screenshot,
        status: 'pending_approval',
      }]);

      if (error) throw error;

      Alert.alert(
        'Payment Submitted',
        'Your payment is pending owner approval. You will be notified once approved.',
        [{ text: 'OK', onPress: () => {
          setShowPayModal(false);
          setSelectedDue(null);
          setScreenshot(null);
          fetchDues();
        }}]
      );
    } catch (error: any) {
      console.error('Payment submission error:', error);
      Alert.alert('Error', error.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (due: Due) => {
    setSelectedDue(due);
    setScreenshot(null);
    setShowPayModal(true);
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

  return (
    <SafeAreaView style={styles.container} testID="tenant-payments-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {dues.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No payment history</Text>
            <Text style={styles.emptyStateSubtext}>
              Your payment history will appear here once your landlord adds dues
            </Text>
          </View>
        ) : (
          dues.map((due) => {
            const hasPendingPayment = due.payments?.some(p => p.status === 'pending_approval');
            return (
              <View
                key={due.id}
                testID={`payment-due-${due.id}`}
                style={styles.dueRow}
              >
                <View
                  style={[styles.statusBar, { backgroundColor: getStatusColor(due.status) }]}
                />
                <View style={styles.dueContent}>
                  <View style={styles.dueHeader}>
                    <View>
                      <Text style={styles.duePeriod}>{formatMonth(due.period_month)}</Text>
                      <Text style={styles.dueDate}>Due: {formatDate(due.due_date)}</Text>
                    </View>
                    <View style={styles.dueRight}>
                      <Text style={styles.dueAmount}>
                        ৳{Number(due.amount).toLocaleString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(due.status) + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(due.status) }]}>
                          {getStatusLabel(due.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Existing payments */}
                  {due.payments && due.payments.length > 0 && (
                    <View style={styles.paymentsSection}>
                      {due.payments.map((payment) => (
                        <View
                          key={payment.id}
                          testID={`payment-${payment.id}`}
                          style={styles.paymentRow}
                        >
                          <MaterialIcons
                            name={
                              payment.status === 'approved' ? 'check-circle' :
                              payment.status === 'pending_approval' ? 'schedule' : 'error'
                            }
                            size={16}
                            color={
                              payment.status === 'approved' ? colors.paidGreen :
                              payment.status === 'pending_approval' ? colors.dueAmber : colors.overdueRed
                            }
                          />
                          <Text style={styles.paymentText}>
                            ৳{Number(payment.amount).toLocaleString()}
                          </Text>
                          <Text style={styles.paymentStatus}>
                            {payment.status === 'approved' ? 'Approved' :
                             payment.status === 'pending_approval' ? 'Awaiting approval' : 'Failed'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Pay button if not paid and no pending payment */}
                  {due.status !== 'paid' && !hasPendingPayment && (
                    <TouchableOpacity
                      testID={`pay-btn-${due.id}`}
                      style={styles.payButton}
                      onPress={() => openPayModal(due)}
                    >
                      <MaterialIcons name="upload-file" size={16} color={colors.white} />
                      <Text style={styles.payButtonText}>Upload Payment Screenshot</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Payment Submission Modal */}
      <Modal
        visible={showPayModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPayModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                testID="modal-close-btn"
                onPress={() => {
                  setShowPayModal(false);
                  setScreenshot(null);
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Submit Payment</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedDue && (
                <View style={styles.dueInfoCard}>
                  <Text style={styles.dueInfoLabel}>Amount</Text>
                  <Text style={styles.dueInfoAmount}>
                    ৳{Number(selectedDue.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.dueInfoPeriod}>
                    For {formatMonth(selectedDue.period_month)}
                  </Text>
                </View>
              )}

              <Text style={styles.instructionTitle}>How to pay:</Text>
              <View style={styles.instructionList}>
                <Text style={styles.instructionText}>
                  1. Send the amount via bKash / Nagad / bank transfer to your landlord
                </Text>
                <Text style={styles.instructionText}>
                  2. Take a screenshot of the confirmation
                </Text>
                <Text style={styles.instructionText}>
                  3. Upload the screenshot below
                </Text>
                <Text style={styles.instructionText}>
                  4. Owner will approve once verified
                </Text>
              </View>

              {/* Screenshot Upload */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Payment Screenshot</Text>
                {screenshot ? (
                  <View style={styles.screenshotPreview}>
                    <Image source={{ uri: screenshot }} style={styles.screenshotImage} resizeMode="contain" />
                    <TouchableOpacity
                      testID="remove-screenshot-btn"
                      style={styles.removeButton}
                      onPress={() => setScreenshot(null)}
                    >
                      <MaterialIcons name="close" size={20} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID="upload-screenshot-btn"
                    style={styles.uploadButton}
                    onPress={pickImage}
                  >
                    <MaterialIcons name="add-photo-alternate" size={32} color={colors.ledgerTeal} />
                    <Text style={styles.uploadButtonText}>Tap to upload screenshot</Text>
                    <Text style={styles.uploadButtonSubtext}>JPG, PNG</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Button
                title="Submit for Approval"
                onPress={handleSubmitPayment}
                loading={submitting}
                disabled={!screenshot}
                style={styles.submitButton}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  dueContent: {
    flex: 1,
    padding: spacing.lg,
  },
  dueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  dueRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  dueAmount: {
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
    fontVariant: ['tabular-nums'],
    fontWeight: typography.medium,
  },
  paymentStatus: {
    fontSize: typography.xs,
    color: colors.gray500,
    flex: 1,
    textAlign: 'right',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ledgerTeal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  payButtonText: {
    color: colors.white,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  dueInfoCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  dueInfoLabel: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.sm,
  },
  dueInfoAmount: {
    fontSize: 36,
    fontWeight: typography.bold,
    color: colors.ledgerTeal,
    fontVariant: ['tabular-nums'],
  },
  dueInfoPeriod: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  instructionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  instructionList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  instructionText: {
    fontSize: typography.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: spacing.xl,
  },
  uploadLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    borderRadius: borderRadius.card,
    padding: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  uploadButtonText: {
    fontSize: typography.base,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
    marginTop: spacing.sm,
  },
  uploadButtonSubtext: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: 4,
  },
  screenshotPreview: {
    position: 'relative',
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadows.small,
  },
  screenshotImage: {
    width: '100%',
    height: 300,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
