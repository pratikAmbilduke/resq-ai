import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../theme';

export default function AppCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.card,
  },
});