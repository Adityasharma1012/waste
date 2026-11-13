import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HouseholdProfile, ImpactEvent, InventoryItem } from '@wasteless/core';
import type { AppSettingsRecord, PersistedAppData, StorageRepository } from './repository';

const KEYS = {
  items: '@wasteless/items_v1',
  profile: '@wasteless/profile_v1',
  impact: '@wasteless/impact_v1',
  settings: '@wasteless/settings_v1',
} as const;

export class AsyncStorageRepository implements StorageRepository {
  async loadAll(): Promise<PersistedAppData | null> {
    const [itemsRaw, profileRaw, impactRaw, settingsRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.items),
      AsyncStorage.getItem(KEYS.profile),
      AsyncStorage.getItem(KEYS.impact),
      AsyncStorage.getItem(KEYS.settings),
    ]);

    if (!itemsRaw && !profileRaw && !impactRaw && !settingsRaw) {
      return null;
    }

    return {
      items: itemsRaw ? (JSON.parse(itemsRaw) as InventoryItem[]) : [],
      profile: profileRaw
        ? (JSON.parse(profileRaw) as HouseholdProfile)
        : {
            householdSize: 2,
            dietaryPreferences: ['omnivore'],
            budgetLevel: 'moderate',
            weeklyBudgetUsd: 120,
            availableCookingMinutes: 25,
            sustainabilityGoal: 'balanced',
            onboardingCompleted: false,
          },
      impactEvents: impactRaw ? (JSON.parse(impactRaw) as ImpactEvent[]) : [],
      settings: settingsRaw
        ? (JSON.parse(settingsRaw) as AppSettingsRecord)
        : {
            demoMode: true,
            apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
            utilityWeights: {
              urgency: 0.35,
              wastePrevented: 0.25,
              costSavings: 0.2,
              timeEffort: 0.1,
              preferenceFit: 0.1,
            },
            themePreference: 'system',
          },
    };
  }

  async saveItems(items: InventoryItem[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.items, JSON.stringify(items));
  }

  async saveProfile(profile: HouseholdProfile): Promise<void> {
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
  }

  async saveImpactEvents(events: ImpactEvent[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.impact, JSON.stringify(events));
  }

  async saveSettings(settings: AppSettingsRecord): Promise<void> {
    await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
  }

  async saveAll(data: PersistedAppData): Promise<void> {
    await Promise.all([
      this.saveItems(data.items),
      this.saveProfile(data.profile),
      this.saveImpactEvents(data.impactEvents),
      this.saveSettings(data.settings),
    ]);
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.removeMany([KEYS.items, KEYS.profile, KEYS.impact, KEYS.settings]);
  }
}
