import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/config/theme';

interface StampAnimationProps {
  visible: boolean;
  onComplete: () => void;
  amount?: number;
}

export const StampAnimation: React.FC<StampAnimationProps> = ({ visible, onComplete, amount }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-15);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback (only on native platforms)
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch {}

      // Backdrop fade in
      backdropOpacity.value = withTiming(1, { duration: 200 });

      // Stamp animation - scale up with slight rotation "thump"
      scale.value = withSequence(
        withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) })
      );

      rotate.value = withSequence(
        withTiming(5, { duration: 200 }),
        withTiming(-5, { duration: 150 }),
        withTiming(0, { duration: 100 })
      );

      opacity.value = withTiming(1, { duration: 200 });

      // Hide after 1.5 seconds
      backdropOpacity.value = withDelay(
        1200,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(onComplete)();
          }
        })
      );

      opacity.value = withDelay(1200, withTiming(0, { duration: 300 }));
      scale.value = withDelay(1200, withTiming(0.8, { duration: 300 }));
    } else {
      // Reset values
      scale.value = 0;
      rotate.value = -15;
      opacity.value = 0;
      backdropOpacity.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <View style={styles.container}>
          <Animated.View style={[styles.stamp, stampStyle]}>
            <View style={styles.stampInner}>
              <MaterialIcons name="check-circle" size={64} color={colors.paidGreen} />
              <Text style={styles.stampText}>PAID</Text>
              {amount && (
                <Text style={styles.stampAmount}>৳{amount.toLocaleString()}</Text>
              )}
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.paidGreen,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  stampInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.paidGreen,
    marginTop: spacing.sm,
    letterSpacing: 2,
  },
  stampAmount: {
    fontSize: typography.base,
    color: colors.gray600,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
