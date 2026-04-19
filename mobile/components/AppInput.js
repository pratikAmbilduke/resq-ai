import { TextInput, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../theme';

export default function AppInput(props) {
  return <TextInput {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
    backgroundColor: '#f9fafb',
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});