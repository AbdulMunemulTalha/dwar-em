import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/src/config/theme';

interface ShareableReceiptProps {
  amount: number;
  period: string; // YYYY-MM format
  unitNumber: string;
  propertyName: string;
  tenantName?: string;
  paidDate: string;
  receiptId: string;
}

// Component wraps a stamped receipt for capturing as image
export const ShareableReceipt = forwardRef<View, ShareableReceiptProps>((props, ref) => {
  const { amount, period, unitNumber, propertyName, tenantName, paidDate, receiptId } = props;

  const formatMonth = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View ref={ref} style={styles.container} collapsable={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <MaterialIcons name="receipt-long" size={24} color={colors.ledgerTeal} />
          <Text style={styles.logoText}>Dwar</Text>
        </View>
        <Text style={styles.receiptLabel}>PAYMENT RECEIPT</Text>
      </View>

      {/* Amount Section with Stamp */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Amount Paid</Text>
        <Text style={styles.amountValue}>৳{amount.toLocaleString()}</Text>

        {/* Stamp */}
        <View style={styles.stamp}>
          <View style={styles.stampInner}>
            <Text style={styles.stampText}>PAID</Text>
            <Text style={styles.stampDate}>{formatDate(paidDate)}</Text>
          </View>
        </View>
      </View>

      {/* Details */}
      <View style={styles.divider} />

      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Property</Text>
          <Text style={styles.detailValue}>{propertyName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unit</Text>
          <Text style={styles.detailValue}>{unitNumber}</Text>
        </View>
        {tenantName && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tenant</Text>
            <Text style={styles.detailValue}>{tenantName}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Period</Text>
          <Text style={styles.detailValue}>{formatMonth(period)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Paid Date</Text>
          <Text style={styles.detailValue}>{formatDate(paidDate)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.receiptId}>Receipt #{receiptId.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.footerText}>Powered by Dwar — Digital Rent Ledger</Text>
        <Text style={styles.footerSubtext}>Replacing the paper ledger with digital trust</Text>
      </View>
    </View>
  );
});

ShareableReceipt.displayName = 'ShareableReceipt';

const styles = StyleSheet.create({
  container: {
    width: 340,
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.paidGreen,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.ledgerTeal,
  },
  receiptLabel: {
    fontSize: typography.xs,
    color: colors.gray500,
    letterSpacing: 2,
    fontWeight: typography.semibold,
  },
  amountSection: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: spacing.lg,
  },
  amountLabel: {
    fontSize: typography.sm,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 40,
    fontWeight: typography.bold,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  stamp: {
    position: 'absolute',
    right: -10,
    top: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.paidGreen,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
    backgroundColor: colors.white,
    opacity: 0.9,
  },
  stampInner: {
    alignItems: 'center',
  },
  stampText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.paidGreen,
    letterSpacing: 2,
  },
  stampDate: {
    fontSize: 9,
    color: colors.paidGreen,
    marginTop: 2,
    fontWeight: typography.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.lg,
  },
  detailsSection: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  detailValue: {
    fontSize: typography.sm,
    color: colors.ink,
    fontWeight: typography.medium,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  receiptId: {
    fontSize: typography.xs,
    color: colors.gray500,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  footerText: {
    fontSize: typography.xs,
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
  footerSubtext: {
    fontSize: 10,
    color: colors.gray400,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
