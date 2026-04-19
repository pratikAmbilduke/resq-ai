import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS } from '../theme';

export default function AppButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
}) {
  const getGradient = () => {
    if (variant === 'success') return GRADIENTS.greenBlue;
    if (variant === 'danger') return GRADIENTS.sunset;
    if (variant === 'pink') return GRADIENTS.pinkPurple;
    if (variant === 'dark') return GRADIENTS.dark;
    return GRADIENTS.primary;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={getGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, disabled && styles.disabled]}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  button: {
    minHeight: 54,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
});