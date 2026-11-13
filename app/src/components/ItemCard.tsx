import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CATEGORY_IMPACT_CONSTANTS,
  classifyUrgencyBucket,
  estimateItemImpact,
  getDaysUntilExpiry,
  type InventoryItem,
} from '@wasteless/core';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';
import { UrgencyBadge } from './UrgencyBadge';

interface Props {
  item: InventoryItem;
  safetyBlocked?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaveOutcome: (outcome: 'saved' | 'frozen' | 'discarded') => void;
}

export function ItemCard({
  item,
  safetyBlocked = false,
  onEdit,
  onDelete,
  onSaveOutcome,
}: Props) {
  const { theme } = useApp();
  const daysLeft = getDaysUntilExpiry(item);
  const bucket = classifyUrgencyBucket(item);
  const impact = estimateItemImpact(item);
  const catLabel = CATEGORY_IMPACT_CONSTANTS[item.category].label;
  const dateTypeLabel = item.dateType === 'use_by' ? 'Use by (Safety)' : 'Best before (Quality)';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: safetyBlocked ? theme.danger : theme.border,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={styles.titleCol}>
          <Text style={[styles.name, { color: theme.text }]} maxFontSizeMultiplier={1.4}>
            {item.name}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]} maxFontSizeMultiplier={1.4}>
            {catLabel} • {item.quantity} {item.unit} • {item.storageLocation.toUpperCase()} •{' '}
            {item.status.toUpperCase()}
          </Text>
        </View>
        <UrgencyBadge bucket={bucket} daysLeft={daysLeft} />
      </View>

      <View style={styles.detailsRow}>
        <Text style={[styles.dateText, { color: theme.text }]} maxFontSizeMultiplier={1.4}>
          {dateTypeLabel}: <Text style={styles.bold}>{item.expiryDate}</Text>
        </Text>
        <Text style={[styles.estText, { color: theme.textMuted }]} maxFontSizeMultiplier={1.4}>
          Est. ~{impact.weightKg} kg • ~${impact.estimatedMoneyUsd} • ~{impact.estimatedCo2eKg} kg CO2e
        </Text>
      </View>

      {safetyBlocked ? (
        <View
          style={[
            styles.safetyAlert,
            { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
          ]}>
          <Ionicons name="warning" size={16} color={theme.dangerText} />
          <Text style={[styles.safetyAlertText, { color: theme.dangerText }]}>
            Safety Rule Alert: Do not consume or rely on appearance/smell — when in doubt, throw it out.
          </Text>
        </View>
      ) : null}

      {item.notes ? (
        <Text style={[styles.notes, { color: theme.textMuted }]} maxFontSizeMultiplier={1.4}>
          Note: {item.notes}
        </Text>
      ) : null}

      <View style={styles.actionsRow}>
        {!safetyBlocked ? (
          <>
            <Pressable
              onPress={() => onSaveOutcome('saved')}
              style={[styles.chipBtn, { backgroundColor: theme.successSoft, borderColor: theme.success }]}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${item.name} as used or saved`}>
              <Ionicons name="checkmark" size={16} color={theme.successText} />
              <Text style={[styles.chipText, { color: theme.successText }]}>Used / Saved</Text>
            </Pressable>

            {item.storageLocation !== 'freezer' && daysLeft >= 0 ? (
              <Pressable
                onPress={() => onSaveOutcome('frozen')}
                style={[styles.chipBtn, { backgroundColor: theme.infoSoft, borderColor: theme.info }]}
                accessibilityRole="button"
                accessibilityLabel={`Freeze ${item.name}`}>
                <Ionicons name="snow" size={16} color={theme.infoText} />
                <Text style={[styles.chipText, { color: theme.infoText }]}>Freeze</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            onPress={() => onSaveOutcome('discarded')}
            style={[styles.chipBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
            accessibilityRole="button"
            accessibilityLabel={`Discard unsafe ${item.name}`}>
            <Ionicons name="trash-bin" size={16} color={theme.dangerText} />
            <Text style={[styles.chipText, { color: theme.dangerText }]}>Discard Safely</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onEdit}
          style={[styles.chipBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.name}`}>
          <Ionicons name="create-outline" size={16} color={theme.text} />
          <Text style={[styles.chipText, { color: theme.text }]}>Edit</Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={[styles.iconBtn, { borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.name}`}>
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleCol: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
  },
  detailsRow: {
    gap: 3,
  },
  dateText: {
    fontSize: 13,
  },
  bold: {
    fontWeight: '700',
  },
  estText: {
    fontSize: 12,
  },
  safetyAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  safetyAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chipBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
});
