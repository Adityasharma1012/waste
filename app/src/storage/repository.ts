import type { HouseholdProfile, ImpactEvent, InventoryItem, UtilityWeights } from '@wasteless/core';

export interface AppSettingsRecord {
  demoMode: boolean;
  apiUrl: string;
  utilityWeights: UtilityWeights;
  themePreference: 'system' | 'light' | 'dark';
}

export interface PersistedAppData {
  items: InventoryItem[];
  profile: HouseholdProfile;
  impactEvents: ImpactEvent[];
  settings: AppSettingsRecord;
}

export interface StorageRepository {
  loadAll(): Promise<PersistedAppData | null>;
  saveItems(items: InventoryItem[]): Promise<void>;
  saveProfile(profile: HouseholdProfile): Promise<void>;
  saveImpactEvents(events: ImpactEvent[]): Promise<void>;
  saveSettings(settings: AppSettingsRecord): Promise<void>;
  saveAll(data: PersistedAppData): Promise<void>;
  clearAll(): Promise<void>;
}
