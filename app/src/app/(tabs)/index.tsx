import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  classifyUrgencyBucket,
  getDaysUntilExpiry,
  type InventoryItem,
  type UrgencyBucket,
} from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ItemCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';

const GROUP_META: Array<{
  bucket: UrgencyBucket;
  title: string;
  subtitle: string;
}> = [
  {
    bucket: 'expired',
    title: 'EXPIRED — Check Safety Rules First',
    subtitle: 'Past printed date. Use-By items must be discarded; Best-Before items require inspection.',
  },
  {
    bucket: 'use_today',
    title: 'USE TODAY — Due Today',
    subtitle: 'Cook, eat, or freeze before end of day to prevent waste.',
  },
  {
    bucket: 'use_soon_1_3d',
    title: 'USE IN 1–3 DAYS — Plan Now',
    subtitle: 'Schedule into meals or move freezable items to the freezer.',
  },
  {
    bucket: 'safe',
    title: 'SAFE — > 3 Days Remaining',
    subtitle: 'Properly stored with time left. Rotate older items to the front.',
  },
];

export default function DashboardScreen() {
  const {
    items,
    inventoryAnalysis,
    safetyBlockedIds,
    impactSummary,
    settings,
    deleteItem,
    markItemOutcome,
  } = useApp();
  const { theme } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 820;

  const grouped = useMemo(() => {
    const map: Record<UrgencyBucket, InventoryItem[]> = {
      expired: [],
      use_today: [],
      use_soon_1_3d: [],
      safe: [],
    };
    const sorted = [...items].sort(
      (a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b)
    );
    for (const item of sorted) {
      map[classifyUrgencyBucket(item)].push(item);
    }
    return map;
  }, [items]);

  const analysis = inventoryAnalysis.result;

  return (
    <ScreenShell
      title="WasteLess AI"
      subtitle={
        settings.demoMode
          ? 'Demo Mode Active • Works offline with seeded household pantry'
          : 'Your household food-waste reduction dashboard'
      }
      rightAction={
        <ActionButton
          label="+ Add Item"
          onPress={() => router.push('/item/new')}
          accessibilityLabel="Add new pantry item"
        />
      }>
      <View style={[styles.kpiGrid, isWide && styles.kpiGridWide]}>
        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>PANTRY HEALTH</Text>
          <Text style={[styles.kpiValue, { color: theme.primary }]}>
            {Math.round(analysis.healthScore)}/100
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>
            {analysis.bucketCounts.expired + analysis.bucketCounts.use_today} urgent •{' '}
            {analysis.bucketCounts.use_soon_1_3d} soon
          </Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>AT RISK (ESTIMATE)</Text>
          <Text style={[styles.kpiValue, { color: theme.warning }]}>
            ~${analysis.atRiskValueUsd.toFixed(2)}
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>
            ~{analysis.atRiskWeightKg} kg • ~{analysis.atRiskCo2eKg} kg CO2e
          </Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>SAVED SO FAR (EST.)</Text>
          <Text style={[styles.kpiValue, { color: theme.success }]}>
            ~{impactSummary.totalSavedKg} kg
          </Text>
          <Text style={[styles.kpiSub, { color: theme.textMuted }]}>
            ~${impactSummary.totalSavedMoneyUsd.toFixed(2)} • ~{impactSummary.totalSavedCo2eKg} kg CO2e
          </Text>
        </Card>
      </View>

      <View style={styles.quickRow}>
        <ActionButton
          label="Open Use-Soon Action Plan"
          onPress={() => router.push('/(tabs)/plan')}
          style={{ flex: 1 }}
        />
        <ActionButton
          label="View Recipes & Tips"
          variant="secondary"
          onPress={() => router.push('/(tabs)/recipes')}
          style={{ flex: 1 }}
        />
      </View>

      {items.length === 0 ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Your pantry is empty</Text>
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>
            Add your fridge, freezer, or pantry items to get expiry tracking, safety rules, and
            zero-waste meal plans.
          </Text>
          <ActionButton label="+ Add Your First Item" onPress={() => router.push('/item/new')} />
        </Card>
      ) : (
        GROUP_META.map((group) => {
          const list = grouped[group.bucket];
          return (
            <View key={group.bucket} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: theme.text }]}>
                  {group.title} ({list.length})
                </Text>
                <Text style={[styles.groupSub, { color: theme.textMuted }]}>
                  {group.subtitle}
                </Text>
              </View>

              {list.length === 0 ? (
                <Card>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>
                    No items in this category.
                  </Text>
                </Card>
              ) : (
                <View style={styles.itemsList}>
                  {list.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      safetyBlocked={safetyBlockedIds.has(item.id)}
                      onEdit={() => router.push(`/item/${item.id}`)}
                      onDelete={() => void deleteItem(item.id)}
                      onSaveOutcome={(outcome) => void markItemOutcome(item.id, outcome)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    gap: 10,
  },
  kpiGridWide: {
    flexDirection: 'row',
  },
  kpiCard: {
    flex: 1,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  kpiSub: {
    fontSize: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  groupSection: {
    gap: 8,
    marginTop: 4,
  },
  groupHeader: {
    gap: 2,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  groupSub: {
    fontSize: 12,
  },
  itemsList: {
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
