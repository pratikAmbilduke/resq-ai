import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../theme';

export default function AppCard({ children, style, variant = 'default' }) {
  const getBackground = () => {
    if (variant === 'blue') return COLORS.cardSoftBlue;
    if (variant === 'purple') return COLORS.cardSoftPurple;
    if (variant === 'pink') return COLORS.cardSoftPink;
    if (variant === 'green') return COLORS.cardSoftGreen;
    if (variant === 'orange') return COLORS.cardSoftOrange;
    return COLORS.card;
  };

  return (
    <View style={[styles.card, { backgroundColor: getBackground() }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.card,
  },
});