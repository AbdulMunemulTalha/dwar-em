import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Listing, Unit } from '@/src/types/database.types';

interface ListingWithUnit extends Listing {
  units?: Unit & { 
    properties?: { name: string; address: string; created_by: string };
  };
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<ListingWithUnit | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [moveInDate, setMoveInDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Inquiry modal
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryLoading, setInquiryLoading] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          units(
            *,
            properties(name, address, created_by)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setListing(data as ListingWithUnit);
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleInquire = async () => {
    if (!user) {
      Alert.alert(
        'Login required',
        'Please login or sign up to send an inquiry',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    if (!inquiryMessage.trim()) {
      Alert.alert('Message required', 'Please enter a message');
      return;
    }

    if (!listing?.units?.properties?.created_by) {
      Alert.alert('Error', 'Cannot find owner information');
      return;
    }

    try {
      setInquiryLoading(true);
      const { error } = await supabase.from('inquiries').insert([{
        listing_id: listing.id,
        sender_id: user.id,
        recipient_id: listing.units.properties.created_by,
        body: inquiryMessage.trim(),
      }]);

      if (error) throw error;

      setInquiryMessage('');
      setShowInquireModal(false);
      Alert.alert('Message sent!', 'The owner will get back to you soon.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setInquiryLoading(false);
    }
  };

  const handleBookRequest = async () => {
    if (!user) {
      Alert.alert(
        'Login required',
        'Please login or sign up to request a booking',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    if (!moveInDate.trim()) {
      Alert.alert('Date required', 'Please enter proposed move-in date');
      return;
    }

    // Basic date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(moveInDate)) {
      Alert.alert('Invalid format', 'Please use YYYY-MM-DD format');
      return;
    }

    try {
      setBookingLoading(true);
      const { error } = await supabase.from('bookings').insert([{
        listing_id: listing?.id,
        prospective_tenant_id: user.id,
        proposed_move_in_date: moveInDate,
        status: 'requested',
      }]);

      if (error) throw error;

      setMoveInDate('');
      setShowBookModal(false);
      Alert.alert(
        'Booking Requested! 🎉',
        'The owner has been notified. You will hear back within 24-48 hours.',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Listing not found</Text>
      </SafeAreaView>
    );
  }

  const unit = listing.units;
  const property = unit?.properties;

  return (
    <SafeAreaView style={styles.container} testID="listing-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {property?.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Photo Gallery / Hero */}
        <View style={styles.hero}>
          {listing.photos && listing.photos.length > 0 ? (
            <Image
              source={{ uri: listing.photos[0] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <MaterialIcons name="apartment" size={80} color={colors.gray300} />
              <Text style={styles.heroPlaceholderText}>No photos yet</Text>
            </View>
          )}
        </View>

        {/* Price + Title */}
        <View style={styles.mainInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ৳{Number(listing.price).toLocaleString()}
            </Text>
            <Text style={styles.priceUnit}>/ month</Text>
          </View>
          <Text style={styles.propertyName}>{property?.name}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={16} color={colors.gray500} />
            <Text style={styles.address}>{property?.address}</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <MaterialIcons name="hotel" size={24} color={colors.ledgerTeal} />
            <Text style={styles.detailValue}>{unit?.bedrooms}</Text>
            <Text style={styles.detailLabel}>
              {unit?.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
            </Text>
          </View>
          <View style={styles.detailCard}>
            <MaterialIcons name="home" size={24} color={colors.ledgerTeal} />
            <Text style={styles.detailValue}>{unit?.unit_number}</Text>
            <Text style={styles.detailLabel}>Unit</Text>
          </View>
          <View style={styles.detailCard}>
            <MaterialIcons name="verified" size={24} color={colors.paidGreen} />
            <Text style={styles.detailValueSmall}>Verified</Text>
            <Text style={styles.detailLabel}>Listing</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this home</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Additional Costs */}
        {unit && Number(unit.service_charge_amount) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly costs</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Rent</Text>
              <Text style={styles.costValue}>
                ৳{Number(listing.price).toLocaleString()}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Service Charge</Text>
              <Text style={styles.costValue}>
                ৳{Number(unit.service_charge_amount).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.costRow, styles.costRowTotal]}>
              <Text style={styles.costLabelTotal}>Total</Text>
              <Text style={styles.costValueTotal}>
                ৳{(Number(listing.price) + Number(unit.service_charge_amount)).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Trust Elements */}
        <View style={styles.trustCard}>
          <MaterialIcons name="verified-user" size={24} color={colors.ledgerTeal} />
          <View style={styles.trustText}>
            <Text style={styles.trustTitle}>Verified by Dwar</Text>
            <Text style={styles.trustSubtitle}>
              Digital ledger — no paper receipts, transparent payment history
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          testID="inquire-btn"
          style={styles.inquireButton}
          onPress={() => setShowInquireModal(true)}
        >
          <MaterialIcons name="chat" size={20} color={colors.ledgerTeal} />
          <Text style={styles.inquireButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="book-btn"
          style={styles.bookButton}
          onPress={() => setShowBookModal(true)}
        >
          <MaterialIcons name="event-available" size={20} color={colors.white} />
          <Text style={styles.bookButtonText}>Request to Book</Text>
        </TouchableOpacity>
      </View>

      {/* Book Request Modal */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity testID="close-book-modal" onPress={() => setShowBookModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Request to Book</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.bookSummary}>
                <Text style={styles.bookSummaryLabel}>Monthly Rent</Text>
                <Text style={styles.bookSummaryAmount}>
                  ৳{Number(listing.price).toLocaleString()}
                </Text>
                <Text style={styles.bookSummaryProperty}>
                  {property?.name} — Unit {unit?.unit_number}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Proposed Move-in Date</Text>
              <TextInput
                testID="movein-date-input"
                style={styles.dateInput}
                placeholder="YYYY-MM-DD (e.g., 2026-03-01)"
                placeholderTextColor={colors.gray400}
                value={moveInDate}
                onChangeText={setMoveInDate}
                keyboardType="numbers-and-punctuation"
              />

              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color={colors.dueAmber} />
                <Text style={styles.infoBoxText}>
                  Owner will review and respond within 24-48 hours. If accepted, you&apos;ll be prompted for the deposit and lease agreement.
                </Text>
              </View>

              <Button
                title="Submit Booking Request"
                onPress={handleBookRequest}
                loading={bookingLoading}
                style={styles.modalSubmitButton}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Inquire Modal */}
      <Modal
        visible={showInquireModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInquireModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity testID="close-inquire-modal" onPress={() => setShowInquireModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Message Owner</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Your message</Text>
              <TextInput
                testID="inquiry-message-input"
                style={styles.messageInput}
                placeholder="Hi, I'm interested in this unit. Is it still available? Can we discuss viewing times?"
                placeholderTextColor={colors.gray400}
                value={inquiryMessage}
                onChangeText={setInquiryMessage}
                multiline
                numberOfLines={6}
              />

              <Button
                title="Send Message"
                onPress={handleInquire}
                loading={inquiryLoading}
                style={styles.modalSubmitButton}
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
  headerTitle: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
  },
  hero: {
    height: 260,
    backgroundColor: colors.gray100,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  heroPlaceholderText: {
    color: colors.gray500,
    fontSize: typography.sm,
  },
  mainInfo: {
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  priceUnit: {
    fontSize: typography.base,
    color: colors.gray500,
  },
  propertyName: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: typography.sm,
    color: colors.gray500,
    flex: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    ...shadows.small,
  },
  detailValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  detailValueSmall: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.paidGreen,
    marginTop: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.base,
    color: colors.gray700,
    lineHeight: 24,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  costLabel: {
    fontSize: typography.base,
    color: colors.gray600,
  },
  costValue: {
    fontSize: typography.base,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  costRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  costLabelTotal: {
    fontSize: typography.base,
    color: colors.ink,
    fontWeight: typography.semibold,
  },
  costValueTotal: {
    fontSize: typography.lg,
    color: colors.ledgerTeal,
    fontWeight: typography.bold,
    fontVariant: ['tabular-nums'],
  },
  trustCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.card,
    borderLeftWidth: 4,
    borderLeftColor: colors.ledgerTeal,
    gap: spacing.md,
    ...shadows.small,
  },
  trustText: {
    flex: 1,
  },
  trustTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: 2,
  },
  trustSubtitle: {
    fontSize: typography.xs,
    color: colors.gray500,
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.md,
  },
  inquireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.ledgerTeal,
    gap: spacing.xs,
  },
  inquireButtonText: {
    color: colors.ledgerTeal,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ledgerTeal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: typography.base,
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
  bookSummary: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.small,
  },
  bookSummaryLabel: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  bookSummaryAmount: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.ledgerTeal,
    fontVariant: ['tabular-nums'],
  },
  bookSummaryProperty: {
    fontSize: typography.sm,
    color: colors.gray600,
    marginTop: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  dateInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.ink,
    minHeight: 48,
  },
  messageInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.input,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.ink,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.dueAmber + '15',
    padding: spacing.md,
    borderRadius: borderRadius.card,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.gray700,
    lineHeight: 20,
  },
  modalSubmitButton: {
    marginTop: spacing.xl,
  },
});
