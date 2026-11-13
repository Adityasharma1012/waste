import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  addDaysISODate,
  CATEGORY_IMPACT_CONSTANTS,
  todayISODate,
  type DateType,
  type FoodCategory,
  type InventoryItem,
  type ItemStatus,
  type QuantityUnit,
  type StorageLocation,
} from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

const CATEGORIES = Object.keys(CATEGORY_IMPACT_CONSTANTS) as FoodCategory[];
const UNITS: QuantityUnit[] = ['g', 'kg', 'ml', 'L', 'pcs', 'servings', 'oz', 'lb'];
const STORAGES: StorageLocation[] = ['fridge', 'freezer', 'pantry'];
const STATUSES: ItemStatus[] = ['sealed', 'opened', 'cooked'];

export function ItemFormScreen({ existingItem }: { existingItem?: InventoryItem }) {
  const { addItem, updateItem, theme } = useApp();
  const router = useRouter();
  const today = todayISODate();

  const [name, setName] = useState(existingItem?.name ?? '');
  const [category, setCategory] = useState<FoodCategory>(existingItem?.category ?? 'produce');
  const [quantity, setQuantity] = useState(String(existingItem?.quantity ?? 300));
  const [unit, setUnit] = useState<QuantityUnit>(existingItem?.unit ?? 'g');
  const [purchaseDate, setPurchaseDate] = useState(existingItem?.purchaseDate ?? today);
  const [dateType, setDateType] = useState<DateType>(existingItem?.dateType ?? 'best_before');
  const [expiryDate, setExpiryDate] = useState(
    existingItem?.expiryDate ?? addDaysISODate(today, 3)
  );
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(
    existingItem?.storageLocation ?? 'fridge'
  );
  const [status, setStatus] = useState<ItemStatus>(existingItem?.status ?? 'sealed');
  const [estimatedValueUsd, setEstimatedValueUsd] = useState(
    existingItem?.estimatedValueUsd ? String(existingItem.estimatedValueUsd) : ''
  );
  const [notes, setNotes] = useState(existingItem?.notes ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    const qtyNum = Number(quantity);
    if (!trimmedName) {
      setErrorMsg('Please enter an item name.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Quantity must be a positive number.');
      return;
    }
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRe.test(purchaseDate.trim()) || !isoRe.test(expiryDate.trim())) {
      setErrorMsg('Dates must use YYYY-MM-DD format.');
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        category,
        quantity: qtyNum,
        unit,
        purchaseDate: purchaseDate.trim(),
        dateType,
        expiryDate: expiryDate.trim(),
        storageLocation,
        status,
        notes: notes.trim() || undefined,
        estimatedValueUsd:
          estimatedValueUsd.trim() && Number(estimatedValueUsd) > 0
            ? Number(estimatedValueUsd)
            : undefined,
      };
      if (existingItem) {
        await updateItem(existingItem.id, payload);
      } else {
        await addItem(payload);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell
      title={existingItem ? `Edit: ${existingItem.name}` : 'Add Pantry / Fridge Item'}
      subtitle="Distinguish Use-By (safety) from Best-Before (quality) so recommendations stay accurate.">
      {errorMsg ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
          ]}
          accessibilityRole="alert">
          <Text style={[styles.errorText, { color: theme.dangerText }]}>{errorMsg}</Text>
        </View>
      ) : null}

      <Card>
        <Text style={[styles.label, { color: theme.text }]}>Item Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Baby Spinach, Chicken Breast, Whole Milk"
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Item name"
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
        />

        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {CATEGORY_IMPACT_CONSTANTS[cat].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: theme.text }]}>Quantity *</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: theme.text }]}>Optional Price ($ USD)</Text>
            <TextInput
              value={estimatedValueUsd}
              onChangeText={setEstimatedValueUsd}
              keyboardType="decimal-pad"
              placeholder="Auto-estimate"
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Optional item value in USD"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Unit</Text>
        <View style={styles.chipRow}>
          {UNITS.map((u) => {
            const active = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {u}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.label, { color: theme.text }]}>Date Label Type</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setDateType('use_by')}
            accessibilityRole="radio"
            accessibilityState={{ selected: dateType === 'use_by' }}
            style={[
              styles.chip,
              {
                backgroundColor: dateType === 'use_by' ? theme.dangerSoft : theme.surfaceElevated,
                borderColor: dateType === 'use_by' ? theme.danger : theme.border,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: dateType === 'use_by' ? theme.dangerText : theme.text },
              ]}>
              Use by (Safety deadline)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDateType('best_before')}
            accessibilityRole="radio"
            accessibilityState={{ selected: dateType === 'best_before' }}
            style={[
              styles.chip,
              {
                backgroundColor:
                  dateType === 'best_before' ? theme.primarySoft : theme.surfaceElevated,
                borderColor: dateType === 'best_before' ? theme.primary : theme.border,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: dateType === 'best_before' ? theme.successText : theme.text },
              ]}>
              Best before (Quality guide)
            </Text>
          </Pressable>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: theme.text }]}>Purchase / Prep Date</Text>
            <TextInput
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Purchase date YYYY-MM-DD"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: theme.text }]}>Expiry / Date on Package</Text>
            <TextInput
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Expiry date YYYY-MM-DD"
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
          </View>
        </View>

        <Text style={[styles.hint, { color: theme.textMuted }]}>Quick set expiry date:</Text>
        <View style={styles.chipRow}>
          {[
            { label: 'Yesterday', delta: -1 },
            { label: 'Today', delta: 0 },
            { label: '+2 days', delta: 2 },
            { label: '+5 days', delta: 5 },
            { label: '+14 days', delta: 14 },
          ].map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => setExpiryDate(addDaysISODate(today, preset.delta))}
              style={[
                styles.chip,
                { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
              ]}
              accessibilityRole="button">
              <Text style={[styles.chipText, { color: theme.text }]}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.label, { color: theme.text }]}>Storage Location</Text>
        <View style={styles.chipRow}>
          {STORAGES.map((loc) => {
            const active = storageLocation === loc;
            return (
              <Pressable
                key={loc}
                onPress={() => setStorageLocation(loc)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {loc.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Container / Prep Status</Text>
        <View style={styles.chipRow}>
          {STATUSES.map((st) => {
            const active = status === st;
            return (
              <Pressable
                key={st}
                onPress={() => setStatus(st)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: active ? theme.successText : theme.text }]}>
                  {st.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="e.g., Half bag left, or note any temperature concern..."
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Item notes"
          style={[
            styles.input,
            styles.notesInput,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg },
          ]}
        />
      </Card>

      <View style={styles.footerBtns}>
        <ActionButton
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <ActionButton
          label={saving ? 'Saving...' : existingItem ? 'Save Changes' : 'Add to Inventory'}
          disabled={saving}
          onPress={() => void handleSave()}
          style={{ flex: 2 }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  notesInput: {
    minHeight: 74,
    textAlignVertical: 'top',
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
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  col: {
    flex: 1,
    minWidth: 150,
    gap: 4,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
});
