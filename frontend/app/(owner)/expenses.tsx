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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Expense, Property } from '@/src/types/database.types';

interface ExpenseWithProperty extends Expense {
  properties?: { name: string };
}

export default function ExpensesScreen() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Add expense form
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch properties user owns
      const { data: propsData } = await supabase
        .from('properties')
        .select(`*, property_owners!inner(user_id)`)
        .eq('property_owners.user_id', user.id);

      setProperties(propsData || []);

      // Fetch expenses for those properties
      const propIds = (propsData || []).map(p => p.id);
      if (propIds.length > 0) {
        const { data: expData } = await supabase
          .from('expenses')
          .select(`*, properties(name)`)
          .in('property_id', propIds)
          .order('date', { ascending: false });

        setExpenses((expData as ExpenseWithProperty[]) || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
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

  const resetForm = () => {
    setSelectedPropertyId('');
    setDescription('');
    setAmount('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedPropertyId) newErrors.property = 'Select a property';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!amount.trim() || isNaN(Number(amount))) newErrors.amount = 'Valid amount required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddExpense = async () => {
    if (!validateForm()) return;
    try {
      setAddLoading(true);
      const { error } = await supabase.from('expenses').insert([{
        property_id: selectedPropertyId,
        description: description.trim(),
        amount: Number(amount),
        added_by: user?.id,
        date: new Date().toISOString().split('T')[0],
      }]);

      if (error) throw error;
      resetForm();
      setShowAddModal(false);
      await fetchData();
      Alert.alert('Success', 'Expense logged successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add expense');
    } finally {
      setAddLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="expenses-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Shared Expenses</Text>
        <TouchableOpacity
          testID="add-expense-btn"
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          disabled={properties.length === 0}
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
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="account-balance-wallet" size={24} color={colors.ledgerTeal} />
            <Text style={styles.summaryValue}>৳{totalExpenses.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons name="today" size={24} color={colors.dueAmber} />
            <Text style={styles.summaryValue}>৳{monthExpenses.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>
        </View>

        {/* Expenses List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expense History</Text>
          {properties.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="apartment" size={48} color={colors.gray300} />
              <Text style={styles.emptyStateText}>No properties yet</Text>
              <Text style={styles.emptyStateSubtext}>Add a property first to log expenses</Text>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={48} color={colors.gray300} />
              <Text style={styles.emptyStateText}>No expenses yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Track utility bills, repairs, and shared costs
              </Text>
              <TouchableOpacity
                testID="empty-add-expense-btn"
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add First Expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            expenses.map((expense) => (
              <View
                key={expense.id}
                testID={`expense-row-${expense.id}`}
                style={styles.expenseCard}
              >
                <View style={styles.expenseIcon}>
                  <MaterialIcons name="receipt" size={20} color={colors.dueAmber} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseMeta}>
                    {expense.properties?.name} • {new Date(expense.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  ৳{Number(expense.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                testID="modal-close-btn"
                onPress={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Property Selector */}
              <Text style={styles.selectorLabel}>Property</Text>
              <View style={styles.propertyList}>
                {properties.map(prop => (
                  <TouchableOpacity
                    key={prop.id}
                    testID={`select-property-${prop.id}`}
                    style={[
                      styles.propertyOption,
                      selectedPropertyId === prop.id && styles.propertyOptionActive,
                    ]}
                    onPress={() => setSelectedPropertyId(prop.id)}
                  >
                    <MaterialIcons
                      name="apartment"
                      size={20}
                      color={selectedPropertyId === prop.id ? colors.white : colors.gray600}
                    />
                    <Text style={[
                      styles.propertyOptionText,
                      selectedPropertyId === prop.id && styles.propertyOptionTextActive,
                    ]}>
                      {prop.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.property && <Text style={styles.errorText}>{errors.property}</Text>}

              <View style={{ height: spacing.md }} />

              <Input
                label="Description"
                placeholder="e.g., Electric bill, Water repair, Cleaning"
                value={description}
                onChangeText={setDescription}
                error={errors.description}
              />

              <Input
                label="Amount (৳)"
                placeholder="5000"
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                error={errors.amount}
              />

              <Button
                title="Log Expense"
                onPress={handleAddExpense}
                loading={addLoading}
                style={styles.modalButton}
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
  summaryRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    ...shadows.small,
  },
  summaryValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ink,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dueAmber + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.ink,
    marginBottom: 2,
  },
  expenseMeta: {
    fontSize: typography.xs,
    color: colors.gray500,
  },
  expenseAmount: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
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
  emptyStateButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.ledgerTeal,
    borderRadius: borderRadius.button,
  },
  emptyStateButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.white,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  keyboardView: {
    flex: 1,
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
  selectorLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  propertyList: {
    gap: spacing.sm,
  },
  propertyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  propertyOptionActive: {
    borderColor: colors.ledgerTeal,
    backgroundColor: colors.ledgerTeal,
  },
  propertyOptionText: {
    fontSize: typography.sm,
    color: colors.gray700,
    fontWeight: typography.medium,
  },
  propertyOptionTextActive: {
    color: colors.white,
  },
  errorText: {
    fontSize: typography.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalButton: {
    marginTop: spacing.lg,
  },
});
