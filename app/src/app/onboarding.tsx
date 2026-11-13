import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type {
  BudgetLevel,
  DietaryPreference,
  SustainabilityGoal,
} from '@wasteless/core';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/Card';
import { ScreenShell } from '@/components/ScreenShell';
import { useApp } from '@/state/AppContext';
import { MIN_TOUCH_TARGET } from '@/theme/tokens';

const DIET_OPTIONS: Array<{ value: DietaryPreference; label: string }> = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'nut_free', label: 'Nut-Free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

const BUDGET_OPTIONS: Array<{ value: BudgetLevel; label: string }> = [
  { value: 'tight', label: 'Tight Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'flexible', label: 'Flexible' },
];

const GOAL_OPTIONS: Array<{ value: SustainabilityGoal; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'minimize_waste', label: 'Minimize Waste' },
  { value: 'cut_emissions', label: 'Cut CO2e' },
  { value: 'save_money', label: 'Save Money' },
];

export default function OnboardingScreen() {
  const { profile, updateProfile, resetDemoData, theme } = useApp();
  const router = useRouter();

  const [householdSize, setHouseholdSize] = useState(profile.householdSize);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>(
    profile.dietaryPreferences
  );
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel>(profile.budgetLevel);
  const [weeklyBudgetUsd, setWeeklyBudgetUsd] = useState(String(profile.weeklyBudgetUsd));
  const [cookingMinutes, setCookingMinutes] = useState(profile.availableCookingMinutes);
  const [goal, setGoal] = useState<SustainabilityGoal>(profile.sustainabilityGoal);
  const [saving, setSaving] = useState(false);

  const toggleDiet = (val: DietaryPreference) => {
    if (val === 'omnivore') {
      setDietaryPreferences(['omnivore']);
      return;
    }
    const withoutOmni = dietaryPreferences.filter((d) => d !== 'omnivore');
    if (withoutOmni.includes(val)) {
      const next = withoutOmni.filter((d) => d !== val);
      setDietaryPreferences(next.length > 0 ? next : ['omnivore']);
    } else {
      setDietaryPreferences([...withoutOmni, val]);
    }
  };

  const finishSetup = async (loadDemo: boolean) => {
    setSaving(true);
    try {
      await resetDemoData(loadDemo);
      await updateProfile({
        householdSize,
        dietaryPreferences,
        budgetLevel,
        weeklyBudgetUsd: Math.max(20, Number(weeklyBudgetUsd) || 120),
        availableCookingMinutes: cookingMinutes,
        sustainabilityGoal: goal,
        onboardingCompleted: true,
      });
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell
      title="Welcome to WasteLess AI"
      subtitle="Reduce household food waste, save money, and cook smarter — works 100% offline with zero API keys.">
      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Household Size</Text>
        <View style={styles.stepperRow}>
          <ActionButton
            label="-"
            variant="secondary"
            accessibilityLabel="Decrease household size"
            onPress={() => setHouseholdSize((n) => Math.max(1, n - 1))}
            style={styles.stepBtn}
          />
          <Text style={[styles.stepVal, { color: theme.text }]}>
            {householdSize} {householdSize === 1 ? 'person' : 'people'}
          </Text>
          <ActionButton
            label="+"
            variant="secondary"
            accessibilityLabel="Increase household size"
            onPress={() => setHouseholdSize((n) => Math.min(12, n + 1))}
            style={styles.stepBtn}
          />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Dietary Preferences</Text>
        <View style={styles.chipGrid}>
          {DIET_OPTIONS.map((opt) => {
            const active = dietaryPreferences.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggleDiet(opt.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primarySoft : theme.surfaceElevated,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? theme.successText : theme.text },
                  ]}>
                  {active ? '✓ ' : ''}
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Budget & Cooking Time
        </Text>
        <View style={styles.chipGrid}>
          {BUDGET_OPTIONS.map((opt) => {
            const active = budgetLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setBudgetLevel(opt.value)}
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
          Weekly Grocery Budget (USD)
        </Text>
        <TextInput
          value={weeklyBudgetUsd}
          onChangeText={setWeeklyBudgetUsd}
          keyboardType="numeric"
          accessibilityLabel="Weekly grocery budget in USD"
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg },
          ]}
        />

        <Text style={[styles.inputLabel, { color: theme.textMuted }]}>
          Typical Cooking Time Available: {cookingMinutes} min
        </Text>
        <View style={styles.chipGrid}>
          {[15, 25, 40, 60].map((mins) => {
            const active = cookingMinutes === mins;
            return (
              <Pressable
                key={mins}
                onPress={() => setCookingMinutes(mins)}
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
                  {mins} min
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Primary Sustainability Goal
        </Text>
        <View style={styles.chipGrid}>
          {GOAL_OPTIONS.map((opt) => {
            const active = goal === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setGoal(opt.value)}
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={styles.ctaCol}>
        <ActionButton
          label={saving ? 'Setting up...' : 'Start with Demo Pantry (12 Realistic Items)'}
          disabled={saving}
          onPress={() => void finishSetup(true)}
        />
        <ActionButton
          label="Start with Empty Pantry"
          variant="secondary"
          disabled={saving}
          onPress={() => void finishSetup(false)}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 52,
  },
  stepVal: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  ctaCol: {
    gap: 10,
    marginBottom: 18,
  },
});
