import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UrgencyBucket } from '@wasteless/core';
import { useApp } from '@/state/AppContext';

interface Props {
  bucket: UrgencyBucket;
  daysLeft?: number;
}

export function UrgencyBadge({ bucket, daysLeft }: Props) {
  const { theme } = useApp();

  const meta = (() => {
    switch (bucket) {
      case 'expired':
        return {
          label:
            daysLeft !== undefined ? `EXPIRED (${Math.abs(daysLeft)}d ago)` : 'EXPIRED',
          icon: 'alert-circle' as const,
          bg: theme.dangerSoft,
          border: theme.danger,
          fg: theme.dangerText,
        };
      case 'use_today':
        return {
          label: 'USE TODAY',
          icon: 'flame' as const,
          bg: theme.warningSoft,
          border: theme.warning,
          fg: theme.warningText,
        };
      case 'use_soon_1_3d':
        return {
          label: daysLeft !== undefined ? `USE IN ${daysLeft}D` : 'USE IN 1–3 DAYS',
          icon: 'time' as const,
          bg: theme.amberSoft,
          border: theme.amber,
          fg: theme.amberText,
        };
      case 'safe':
      default:
        return {
          label: daysLeft !== undefined ? `SAFE (${daysLeft}d)` : 'SAFE',
          icon: 'checkmark-circle' as const,
          bg: theme.successSoft,
          border: theme.success,
          fg: theme.successText,
        };
    }
  })();

  return (
    <View
      style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}
      accessibilityLabel={`Status: ${meta.label}`}>
      <Ionicons name={meta.icon} size={14} color={meta.fg} />
      <Text style={[styles.label, { color: meta.fg }]} maxFontSizeMultiplier={1.4}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
