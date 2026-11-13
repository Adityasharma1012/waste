import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  style,
}: ActionButtonProps) {
  const { theme } = useApp();

  const colors = (() => {
    switch (variant) {
      case 'danger':
        return { bg: theme.dangerSoft, border: theme.danger, fg: theme.dangerText };
      case 'secondary':
        return { bg: theme.surfaceElevated, border: theme.border, fg: theme.text };
      case 'ghost':
        return { bg: 'transparent', border: theme.border, fg: theme.text };
      case 'primary':
      default:
        return { bg: theme.primary, border: theme.primary, fg: theme.primaryText };
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <Text style={[styles.label, { color: colors.fg }]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
