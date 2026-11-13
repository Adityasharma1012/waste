import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PERMANENT_FOOD_SAFETY_BANNER } from '@wasteless/core';
import { useApp } from '@/state/AppContext';

export function SafetyBanner() {
  const { theme } = useApp();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.amberSoft,
          borderColor: theme.amber,
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={PERMANENT_FOOD_SAFETY_BANNER}>
      <Ionicons name="shield-checkmark" size={20} color={theme.amberText} style={styles.icon} />
      <Text style={[styles.text, { color: theme.amberText }]} maxFontSizeMultiplier={1.5}>
        {PERMANENT_FOOD_SAFETY_BANNER}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
