import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { colors } from '@/src/config/theme';

export default function Index() {
  const { user, loading, role } = useAuth();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.ledgerTeal} />
      </View>
    );
  }

  // Route based on authentication and role
  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  if (role === 'owner') {
    return <Redirect href="/(owner)/dashboard" />;
  }

  if (role === 'tenant') {
    return <Redirect href="/(tenant)/dashboard" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  // Fallback to login if role is not set
  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
