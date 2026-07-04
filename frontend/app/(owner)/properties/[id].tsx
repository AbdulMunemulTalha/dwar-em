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
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Property, Unit } from '@/src/types/database.types';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addUnitLoading, setAddUnitLoading] = useState(false);

  // Add unit form state
  const [unitNumber, setUnitNumber] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});

  const fetchPropertyData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (propertyError) throw propertyError;
      setProperty(propertyData);

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', id)
        .order('unit_number');

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchPropertyData();
    }, [fetchPropertyData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPropertyData();
  };

  const resetUnitForm = () => {
    setUnitNumber('');
    setBedrooms('');
    setRentAmount('');
    setServiceCharge('');
    setUnitErrors({});
  };

  const validateUnitForm = () => {
    const errors: Record<string, string> = {};
    if (!unitNumber.trim()) errors.unitNumber = 'Unit number is required';
    if (!bedrooms.trim() || isNaN(Number(bedrooms))) errors.bedrooms = 'Valid bedroom count required';
    if (!rentAmount.trim() || isNaN(Number(rentAmount))) errors.rentAmount = 'Valid rent amount required';
    if (serviceCharge && isNaN(Number(serviceCharge))) errors.serviceCharge = 'Invalid service charge';
    setUnitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUnit = async () => {
    if (!validateUnitForm()) return;

    try {
      setAddUnitLoading(true);
      const { error } = await supabase
        .from('units')
        .insert([{
          property_id: id,
          unit_number: unitNumber.trim(),
          bedrooms: Number(bedrooms),
          rent_amount: Number(rentAmount),
          service_charge_amount: serviceCharge ? Number(serviceCharge) : 0,
          status: 'vacant',
        }]);

      if (error) throw error;

      resetUnitForm();
      setShowAddUnit(false);
      await fetchPropertyData();
      Alert.alert('Success', 'Unit added successfully!');
    } catch (error: any) {
      console.error('Error adding unit:', error);
      Alert.alert('Error', error.message || 'Failed to add unit');
    } finally {
      setAddUnitLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return colors.paidGreen;
      case 'vacant': return colors.gray400;
      case 'available_for_rent': return colors.ledgerTeal;
      default: return colors.gray400;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'occupied': return 'Occupied';
      case 'vacant': return 'Vacant';
      case 'available_for_rent': return 'Available';
      default: return status;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Property not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="property-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.propertyName} numberOfLines={1}>{property.name}</Text>
        </View>
        <TouchableOpacity
          testID="add-unit-btn"
          style={styles.addButton}
          onPress={() => setShowAddUnit(true)}
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
        {/* Property Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color={colors.gray500} />
            <Text style={styles.infoText}>{property.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={20} color={colors.gray500} />
            <Text style={styles.infoText}>
              {property.type === 'single_owner' ? 'Single Owner Property' : 'Multi-Owner Property'}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{units.length}</Text>
              <Text style={styles.statLabel}>Total Units</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {units.filter(u => u.status === 'occupied').length}
              </Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {units.filter(u => u.status === 'vacant').length}
              </Text>
              <Text style={styles.statLabel}>Vacant</Text>
            </View>
          </View>
        </View>

        {/* Units Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          {units.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="meeting-room" size={48} color={colors.gray300} />
              <Text style={styles.emptyStateText}>No units yet</Text>
              <Text style={styles.emptyStateSubtext}>Add units to start tracking rent</Text>
              <TouchableOpacity
                testID="empty-add-unit-btn"
                style={styles.emptyStateButton}
                onPress={() => setShowAddUnit(true)}
              >
                <Text style={styles.emptyStateButtonText}>Add First Unit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            units.map((unit) => (
              <TouchableOpacity
                key={unit.id}
                testID={`unit-card-${unit.id}`}
                style={styles.unitCard}
                onPress={() => router.push(`/(owner)/units/${unit.id}`)}
              >
                <View
                  style={[styles.unitStatusBar, { backgroundColor: getStatusColor(unit.status) }]}
                />
                <View style={styles.unitContent}>
                  <View style={styles.unitHeader}>
                    <Text style={styles.unitNumber}>Unit {unit.unit_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(unit.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(unit.status) }]}>
                        {getStatusLabel(unit.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.unitDetails}>
                    <Text style={styles.unitDetailText}>
                      {unit.bedrooms} {unit.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
                    </Text>
                    <Text style={styles.unitRent}>
                      ৳{Number(unit.rent_amount).toLocaleString()}/mo
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.gray400} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Unit Modal */}
      <Modal
        visible={showAddUnit}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddUnit(false)}
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
                  resetUnitForm();
                  setShowAddUnit(false);
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Unit</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Input
                label="Unit Number"
                placeholder="e.g., A-101, 1B, 3rd Floor"
                value={unitNumber}
                onChangeText={setUnitNumber}
                error={unitErrors.unitNumber}
              />

              <Input
                label="Bedrooms"
                placeholder="e.g., 2"
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="number-pad"
                error={unitErrors.bedrooms}
              />

              <Input
                label="Monthly Rent (৳)"
                placeholder="25000"
                value={rentAmount}
                onChangeText={setRentAmount}
                keyboardType="number-pad"
                error={unitErrors.rentAmount}
              />

              <Input
                label="Service Charge (৳) - Optional"
                placeholder="2000"
                value={serviceCharge}
                onChangeText={setServiceCharge}
                keyboardType="number-pad"
                error={unitErrors.serviceCharge}
              />

              <Button
                title="Add Unit"
                onPress={handleAddUnit}
                loading={addUnitLoading}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  propertyName: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ledgerTeal,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.sm,
    color: colors.gray600,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
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
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  unitStatusBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  unitContent: {
    flex: 1,
    padding: spacing.lg,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unitNumber: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  statusBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  unitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitDetailText: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  unitRent: {
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
  modalButton: {
    marginTop: spacing.lg,
  },
});
