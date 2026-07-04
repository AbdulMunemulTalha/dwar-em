import React, { useState, useEffect } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { colors, spacing, typography } from '@/src/config/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn, loading, user, role } = useAuth();
  const router = useRouter();

  // Redirect after successful login
  useEffect(() => {
    if (user && role) {
      if (role === 'owner') router.replace('/(owner)/dashboard');
      else if (role === 'tenant') router.replace('/(tenant)/dashboard');
      else if (role === 'admin') router.replace('/');
    }
  }, [user, role, router]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    const { error } = await signIn(email, password);
    if (error) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Dwar</Text>
            <Text style={styles.subtitle}>Property & Rental Management</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<MaterialIcons name="email" size={20} color={colors.gray400} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              leftIcon={<MaterialIcons name="lock" size={20} color={colors.gray400} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              }
            />

            <Button
              title="Login"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <TouchableOpacity
              onPress={() => router.push('/auth/signup')}
              style={styles.signupLink}
            >
              <Text style={styles.signupText}>
                Don&apos;t have an account? <Text style={styles.signupTextBold}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Replacing the paper ledger with digital trust</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.xxxl,
    fontWeight: typography.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.base,
    color: colors.gray500,
  },
  form: {
    flex: 1,
  },
  loginButton: {
    marginTop: spacing.lg,
  },
  signupLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  signupText: {
    fontSize: typography.sm,
    color: colors.gray500,
  },
  signupTextBold: {
    color: colors.ledgerTeal,
    fontWeight: typography.semibold,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.xs,
    color: colors.gray400,
    textAlign: 'center',
  },
});