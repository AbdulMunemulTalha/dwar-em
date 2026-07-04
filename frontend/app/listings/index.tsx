import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Listing, Unit } from '@/src/types/database.types';

interface ListingWithUnit extends Listing {
  units?: Unit & { properties?: { name: string; address: string } };
}

const BEDROOM_FILTERS = [
  { label: 'Any', value: null },
  { label: '1 BR', value: 1 },
  { label: '2 BR', value: 2 },
  { label: '3 BR', value: 3 },
  { label: '4+ BR', value: 4 },
];

export default function BrowseListingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listings, setListings] = useState<ListingWithUnit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<'all' | 'under_20k' | '20k_40k' | 'over_40k'>('all');

  const fetchListings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          units(
            *,
            properties(name, address)
          )
        `)
        .eq('is_published', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data as ListingWithUnit[]) || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const filteredListings = listings.filter((listing) => {
    const unit = listing.units;
    if (!unit) return false;

    // Search filter (property name, address)
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const propertyName = (unit.properties?.name || '').toLowerCase();
      const address = (unit.properties?.address || '').toLowerCase();
      const description = (listing.description || '').toLowerCase();
      if (!propertyName.includes(search) && !address.includes(search) && !description.includes(search)) {
        return false;
      }
    }

    // Bedroom filter
    if (selectedBedrooms !== null) {
      if (selectedBedrooms >= 4 && unit.bedrooms < 4) return false;
      if (selectedBedrooms < 4 && unit.bedrooms !== selectedBedrooms) return false;
    }

    // Price filter
    const price = Number(listing.price);
    if (priceRange === 'under_20k' && price >= 20000) return false;
    if (priceRange === '20k_40k' && (price < 20000 || price > 40000)) return false;
    if (priceRange === 'over_40k' && price <= 40000) return false;

    return true;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="browse-listings-screen">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>Find your home</Text>
            <Text style={styles.headerTitle}>Rentals in Bangladesh</Text>
          </View>
          <TouchableOpacity
            testID="login-nav-btn"
            style={styles.loginNavButton}
            onPress={() => router.push('/auth/login')}
          >
            <MaterialIcons name="person" size={20} color={colors.ledgerTeal} />
            <Text style={styles.loginNavText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={colors.gray500} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Search location, property name..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.gray500} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {BEDROOM_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              testID={`bedroom-filter-${filter.label}`}
              style={[
                styles.chip,
                selectedBedrooms === filter.value && styles.chipActive,
              ]}
              onPress={() => setSelectedBedrooms(filter.value)}
            >
              <Text style={[
                styles.chipText,
                selectedBedrooms === filter.value && styles.chipTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.chipDivider} />

          {[
            { label: 'Any Price', value: 'all' },
            { label: 'Under ৳20k', value: 'under_20k' },
            { label: '৳20k - ৳40k', value: '20k_40k' },
            { label: 'Over ৳40k', value: 'over_40k' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              testID={`price-filter-${filter.value}`}
              style={[
                styles.chip,
                priceRange === filter.value && styles.chipActive,
              ]}
              onPress={() => setPriceRange(filter.value as any)}
            >
              <Text style={[
                styles.chipText,
                priceRange === filter.value && styles.chipTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredListings.length} {filteredListings.length === 1 ? 'home' : 'homes'} available
        </Text>
      </View>

      {/* Listings */}
      <ScrollView
        style={styles.listingsScroll}
        contentContainerStyle={styles.listingsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ledgerTeal} />
        }
      >
        {filteredListings.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No listings match your filters</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filteredListings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              testID={`listing-card-${listing.id}`}
              style={styles.listingCard}
              onPress={() => router.push(`/listings/${listing.id}`)}
            >
              {/* Photo */}
              <View style={styles.photoContainer}>
                {listing.photos && listing.photos.length > 0 ? (
                  <Image
                    source={{ uri: listing.photos[0] }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="apartment" size={48} color={colors.gray300} />
                  </View>
                )}
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>
                    ৳{Number(listing.price).toLocaleString()}/mo
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {listing.units?.properties?.name}
                </Text>
                <View style={styles.locationRow}>
                  <MaterialIcons name="location-on" size={14} color={colors.gray500} />
                  <Text style={styles.listingAddress} numberOfLines={1}>
                    {listing.units?.properties?.address}
                  </Text>
                </View>
                <View style={styles.listingMeta}>
                  <View style={styles.metaBadge}>
                    <MaterialIcons name="hotel" size={14} color={colors.ledgerTeal} />
                    <Text style={styles.metaBadgeText}>
                      {listing.units?.bedrooms} BR
                    </Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <MaterialIcons name="home" size={14} color={colors.ledgerTeal} />
                    <Text style={styles.metaBadgeText}>
                      Unit {listing.units?.unit_number}
                    </Text>
                  </View>
                </View>
              </View>
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerSubtitle: {
    fontSize: typography.xs,
    color: colors.gray500,
  },
  headerTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ink,
  },
  loginNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.ledgerTeal,
    gap: 4,
  },
  loginNavText: {
    color: colors.ledgerTeal,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.ink,
    height: '100%',
    outlineWidth: 0,
  } as any,
  filtersSection: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.ledgerTeal,
    backgroundColor: colors.ledgerTeal + '15',
  },
  chipText: {
    fontSize: typography.sm,
    color: colors.gray600,
    fontWeight: typography.medium,
  },
  chipTextActive: {
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.sm,
  },
  resultsHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resultsCount: {
    fontSize: typography.sm,
    color: colors.gray600,
    fontWeight: typography.medium,
  },
  listingsScroll: {
    flex: 1,
  },
  listingsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginTop: spacing.lg,
  },
  emptyStateSubtext: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginTop: spacing.sm,
  },
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.small,
  },
  photoContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: colors.gray100,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.button,
    backgroundColor: colors.ledgerTeal,
  },
  priceBadgeText: {
    color: colors.white,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    fontVariant: ['tabular-nums'],
  },
  listingInfo: {
    padding: spacing.lg,
  },
  listingTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  listingAddress: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.gray500,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    backgroundColor: colors.ledgerTeal + '10',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: typography.xs,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
});
