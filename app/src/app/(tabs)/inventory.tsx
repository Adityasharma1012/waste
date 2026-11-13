import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  classifyUrgencyBucket,
  getDaysUntilExpiry,
  type StorageLocation,
  type UrgencyBucket,
} from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ItemCard } from '@/components/ItemCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

type BucketFilter = 'all' | UrgencyBucket;
type StorageFilter = 'all' | StorageLocation;

export default function InventoryScreen() {
  const { items, safetyBlockedIds, deleteItem, markItemOutcome, theme } = useApp();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((it) => {
        if (q && !it.name.toLowerCase().includes(q) && !(it.notes ?? '').toLowerCase().includes(q)) {
          return false;
        }
        if (bucketFilter !== 'all' && classifyUrgencyBucket(it) !== bucketFilter) {
          return false;
        }
        if (storageFilter !== 'all' && it.storageLocation !== storageFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => getDaysUntilExpiry(a) - getDaysUntilExpiry(b));
  }, [items, query, bucketFilter, storageFilter]);

  return (
    <ScreenShell
      title="Pantry & Fridge Inventory"
      subtitle={`${items.length} tracked item(s) • Delete supports instant Undo`}
      rightAction={
        <ActionButton
          label="+ Add Item"
          onPress={() => router.push('/item/new')}
          accessibilityLabel="Add new inventory item"
        />
      }>
      <Card>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items or notes..."
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Search inventory items"
          style={[
            styles.searchInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg },
          ]}
        />

        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Urgency</Text>
        <View style={styles.chipRow}>
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'expired', label: 'Expired' },
              { id: 'use_today', label: 'Use Today' },
              { id: 'use_soon_1_3d', label: '1–3 Days' },
              { id: 'safe', label: 'Safe' },
            ] as const
          ).map((f) => {
            const active = bucketFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setBucketFilter(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Storage Location</Text>
        <View style={styles.chipRow}>
          {(
            [
              { id: 'all', label: 'All Locations' },
              { id: 'fridge', label: 'Fridge' },
              { id: 'freezer', label: 'Freezer' },
              { id: 'pantry', label: 'Pantry' },
            ] as const
          ).map((f) => {
            const active = storageFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setStorageFilter(f.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No matching items</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            Try clearing your search or filters, or add a new item.
          </Text>
          <ActionButton label="+ Add Item" onPress={() => router.push('/item/new')} />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((item) => (
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
});
