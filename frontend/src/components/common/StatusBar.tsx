import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DueStatus } from '@/src/types/database.types';
import { colors } from '@/src/config/theme';

interface StatusBarProps {
  status: DueStatus | 'available' | 'occupied' | 'vacant';
}

export const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'paid':
      case 'available':
        return colors.paidGreen;
      case 'due':
        return colors.dueAmber;
      case 'overdue':
        return colors.overdueRed;
      case 'occupied':
        return colors.gray500;
      case 'vacant':
        return colors.gray300;
      default:
        return colors.gray300;
    }
  };

  return <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />;
};

const styles = StyleSheet.create({
  statusBar: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
});