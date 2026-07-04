import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/src/config/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { colors, spacing, typography, borderRadius } from '@/src/config/theme';
import { PropertyType } from '@/src/types/database.types';

export default function AddPropertyScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<PropertyType>('single_owner');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Property name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([{
          name: name.trim(),
          address: address.trim(),
          type,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (propertyError) throw propertyError;

      // Link owner to property
      const { error: ownerError } = await supabase
        .from('property_owners')
        .insert([{
          property_id: property.id,
          user_id: user?.id,
        }]);

      if (ownerError) throw ownerError;

      Alert.alert('Success', 'Property added successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/(owner)/properties/${property.id}`),
        },
      ]);
    } catch (error: any) {
      console.error('Error adding property:', error);
      Alert.alert('Error', error.message || 'Failed to add property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="add-property-screen">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Property</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.description}>
            Add your property to start managing units, tenants, and payments
          </Text>

          <View style={styles.form}>
            <Input
              label="Property Name"
              placeholder="e.g., Green Valley Apartments"
              value={name}
              onChangeText={setName}
              error={errors.name}
              leftIcon={<MaterialIcons name="apartment" size={20} color={colors.gray400} />}
            />

            <Input
              label="Full Address"
              placeholder="House, Road, Area, City"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              error={errors.address}
              leftIcon={<MaterialIcons name="location-on" size={20} color={colors.gray400} />}
              style={styles.addressInput}
            />

            <View style={styles.typeSelector}>
              <Text style={styles.typeLabel}>Property Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  testID="type-single-owner-btn"
                  style={[styles.typeButton, type === 'single_owner' && styles.typeButtonActive]}
                  onPress={() => setType('single_owner')}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={type === 'single_owner' ? colors.white : colors.gray600}
                  />
                  <Text style={[styles.typeButtonText, type === 'single_owner' && styles.typeButtonTextActive]}>
                    Single Owner
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="type-multi-owner-btn"
                  style={[styles.typeButton, type === 'multi_owner' && styles.typeButtonActive]}
                  onPress={() => setType('multi_owner')}
                >
                  <MaterialIcons
                    name="groups"
                    size={20}
                    color={type === 'multi_owner' ? colors.white : colors.gray600}
                  />
                  <Text style={[styles.typeButtonText, type === 'multi_owner' && styles.typeButtonTextActive]}>
                    Multi-Owner
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.typeHint}>
                {type === 'single_owner'
                  ? 'You are the sole owner of this property'
                  : 'Multiple owners share this property (e.g., apartment committee)'}
              </Text>
            </View>

            <Button
              title="Add Property"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  keyboardView: {
    flex: 1,
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
  title: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
  },
  description: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    marginBottom: spacing.xl,
  },
  typeLabel: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  typeButtonActive: {
    borderColor: colors.ledgerTeal,
    backgroundColor: colors.ledgerTeal,
  },
  typeButtonText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.gray600,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  typeHint: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
