import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../theme';

export default function AppInput(props) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={props.placeholderTextColor || '#9CA3AF'}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: '#D7E3FF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    color: COLORS.textPrimary,
    fontSize: 15,
  },
});