import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS } from '../theme';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
}) {
  const gradient =
    variant === 'danger'
      ? GRADIENTS.danger
      : variant === 'success'
      ? GRADIENTS.success
      : GRADIENTS.primary;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <LinearGradient colors={gradient} style={styles.button}>
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  text: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
});