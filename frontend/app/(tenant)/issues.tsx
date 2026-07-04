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
import { Input } from '@/src/components/common/Input';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/config/theme';
import { Issue, IssueStatus } from '@/src/types/database.types';

export default function TenantIssuesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [tenancyId, setTenancyId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add issue form
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchIssues = useCallback(async () => {
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
        setIssues([]);
        return;
      }

      setTenancyId(tenancy.id);

      // Get issues
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('tenancy_id', tenancy.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchIssues();
    }, [fetchIssues])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
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
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        setPhotoUri(base64Uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  const resetForm = () => {
    setDescription('');
    setPhotoUri(null);
    setErrors({});
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!description.trim()) newErrors.description = 'Please describe the issue';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!tenancyId) {
      Alert.alert('Error', 'No active tenancy found');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('issues').insert([{
        tenancy_id: tenancyId,
        description: description.trim(),
        photo_url: photoUri,
        status: 'open',
      }]);

      if (error) throw error;

      resetForm();
      setShowAddModal(false);
      await fetchIssues();
      Alert.alert('Issue Reported', 'Your landlord will be notified and get back to you soon.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: IssueStatus): string => {
    switch (status) {
      case 'open': return colors.dueAmber;
      case 'in_progress': return colors.ledgerTeal;
      case 'resolved': return colors.paidGreen;
      case 'closed': return colors.gray500;
      default: return colors.gray400;
    }
  };

  const getStatusLabel = (status: IssueStatus) => {
    const labels: Record<IssueStatus, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    return labels[status] || status;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: 'numeric'
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
    <SafeAreaView style={styles.container} testID="tenant-issues-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Issues</Text>
        <TouchableOpacity
          testID="add-issue-btn"
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          disabled={!tenancyId}
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
        {!tenancyId ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="home-work" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No active tenancy</Text>
            <Text style={styles.emptyStateSubtext}>
              You need an active tenancy to report issues
            </Text>
          </View>
        ) : issues.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="build-circle" size={64} color={colors.gray300} />
            <Text style={styles.emptyStateText}>No issues reported</Text>
            <Text style={styles.emptyStateSubtext}>
              Report maintenance issues, repairs, or concerns to your landlord
            </Text>
            <TouchableOpacity
              testID="empty-add-issue-btn"
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>Report First Issue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          issues.map((issue) => (
            <View
              key={issue.id}
              testID={`issue-row-${issue.id}`}
              style={styles.issueCard}
            >
              <View style={styles.issueHeader}>
                <View style={styles.issueIcon}>
                  <MaterialIcons name="build" size={20} color={colors.dueAmber} />
                </View>
                <View style={styles.issueHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(issue.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(issue.status) }]}>
                      {getStatusLabel(issue.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.issueDescription}>{issue.description}</Text>

              {issue.photo_url && (
                <Image
                  source={{ uri: issue.photo_url }}
                  style={styles.issuePhoto}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.issueDate}>Reported: {formatDate(issue.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Issue Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
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
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <MaterialIcons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.helperText}>
                Describe the issue and optionally add a photo. Your landlord will be notified.
              </Text>

              <Input
                label="Description"
                placeholder="e.g., Water leak in bathroom ceiling"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                error={errors.description}
                style={styles.descriptionInput}
              />

              {/* Photo Upload */}
              <View style={styles.photoSection}>
                <Text style={styles.photoLabel}>Photo (Optional)</Text>
                {photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="contain" />
                    <TouchableOpacity
                      testID="remove-photo-btn"
                      style={styles.removeButton}
                      onPress={() => setPhotoUri(null)}
                    >
                      <MaterialIcons name="close" size={20} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    testID="add-photo-btn"
                    style={styles.uploadButton}
                    onPress={pickImage}
                  >
                    <MaterialIcons name="add-a-photo" size={32} color={colors.ledgerTeal} />
                    <Text style={styles.uploadButtonText}>Tap to add photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Button
                title="Submit Issue"
                onPress={handleSubmit}
                loading={submitting}
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
  emptyStateButton: {
    marginTop: spacing.xl,
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
  issueCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dueAmber + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  issueDescription: {
    fontSize: typography.base,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  issuePhoto: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.card,
    marginBottom: spacing.md,
    backgroundColor: colors.gray100,
  },
  issueDate: {
    fontSize: typography.xs,
    color: colors.gray500,
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
  helperText: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoSection: {
    marginBottom: spacing.xl,
  },
  photoLabel: {
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
    fontSize: typography.sm,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
    marginTop: spacing.sm,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: colors.white,
    ...shadows.small,
  },
  photoImage: {
    width: '100%',
    height: 250,
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
