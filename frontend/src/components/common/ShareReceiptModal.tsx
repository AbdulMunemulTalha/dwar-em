import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { ShareableReceipt } from './ShareableReceipt';
import { colors, spacing, typography, borderRadius } from '@/src/config/theme';

interface ShareReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  receipt: {
    amount: number;
    period: string;
    unitNumber: string;
    propertyName: string;
    tenantName?: string;
    paidDate: string;
    receiptId: string;
  } | null;
}

export const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  visible,
  onClose,
  receipt,
}) => {
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!viewShotRef.current) return;
    try {
      setSharing(true);

      // Capture the receipt as image
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Sharing not available',
          Platform.OS === 'web'
            ? 'Sharing works on iOS and Android devices only'
            : 'Sharing is not available on this device'
        );
        return;
      }

      // Open native share sheet
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Payment Receipt',
      });
    } catch (error: any) {
      console.error('Share error:', error);
      if (error?.message && !error.message.includes('cancel')) {
        Alert.alert('Error', 'Could not share receipt');
      }
    } finally {
      setSharing(false);
    }
  };

  if (!receipt) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} testID="share-receipt-modal">
        <View style={styles.header}>
          <TouchableOpacity testID="close-share-btn" onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Share Receipt</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.subtitle}>
            Send this receipt to your tenant via WhatsApp, SMS, or email
          </Text>

          {/* Receipt Preview */}
          <View style={styles.receiptContainer}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <ShareableReceipt {...receipt} />
            </ViewShot>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            testID="share-btn"
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="share" size={20} color={colors.white} />
                <Text style={styles.shareButtonText}>Share Receipt</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hintText}>
            💡 Tip: Sharing receipts builds trust with tenants and lets them keep proof of payment
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
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
  title: {
    fontSize: typography.lg,
    fontWeight: typography.semibold,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  receiptContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ledgerTeal,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    gap: spacing.sm,
    minWidth: 200,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  hintText: {
    fontSize: typography.xs,
    color: colors.gray500,
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 18,
  },
});
