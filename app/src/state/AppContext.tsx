import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  ActionSelector,
  addDaysISODate,
  buildImpactSummary,
  createDemoImpactEvents,
  createDemoInventory,
  createDemoProfile,
  DEFAULT_UTILITY_WEIGHTS,
  estimateItemImpact,
  evaluateRulesForInventory,
  ExpiryPrioritizer,
  InventoryAnalyst,
  RecipePlanner,
  todayISODate,
  type ActionSelection,
  type AgentResult,
  type HouseholdProfile,
  type ImpactEvent,
  type ImpactSummary,
  type InventoryAnalysis,
  type InventoryItem,
  type PrioritizedItem,
  type RecommendationBundle,
  type RuleEvaluation,
  type SustainableMetricsSummary,
  type UtilityWeights,
} from '@wasteless/core';

import { WasteLessApiClient, type BackendHealth } from '@/api/client';
import { AsyncStorageRepository } from '@/storage/asyncStorageRepo';
import type { AppSettingsRecord } from '@/storage/repository';
import { DARK_THEME, LIGHT_THEME, type AppTheme } from '@/theme/tokens';

export interface UndoDeleteState {
  item: InventoryItem;
  index: number;
}

export interface NewItemInput {
  name: string;
  category: InventoryItem['category'];
  quantity: number;
  unit: InventoryItem['unit'];
  purchaseDate: string;
  dateType: InventoryItem['dateType'];
  expiryDate: string;
  storageLocation: InventoryItem['storageLocation'];
  status: InventoryItem['status'];
  notes?: string;
  estimatedValueUsd?: number;
}

interface AppContextValue {
  hydrated: boolean;
  theme: AppTheme;
  items: InventoryItem[];
  profile: HouseholdProfile;
  impactEvents: ImpactEvent[];
  settings: AppSettingsRecord;
  undoState: UndoDeleteState | null;

  // Derived @wasteless/core computations
  inventoryAnalysis: AgentResult<InventoryAnalysis>;
  prioritizedItems: PrioritizedItem[];
  ruleEvaluations: RuleEvaluation[];
  safetyBlockedIds: Set<string>;
  actionSelection: ActionSelection;
  recommendations: RecommendationBundle;
  impactSummary: ImpactSummary;

  // Backend & sustainable AI
  apiClient: WasteLessApiClient;
  backendHealth: BackendHealth;
  metricsSummary: SustainableMetricsSummary | null;
  refreshBackend: () => Promise<void>;

  // Mutations
  addItem: (input: NewItemInput) => Promise<InventoryItem>;
  updateItem: (id: string, input: Partial<NewItemInput>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  dismissUndo: () => void;
  markItemOutcome: (id: string, outcome: 'saved' | 'frozen' | 'discarded') => Promise<void>;
  updateProfile: (updates: Partial<HouseholdProfile>) => Promise<void>;
  updateSettings: (updates: Partial<AppSettingsRecord>) => Promise<void>;
  updateWeights: (weights: UtilityWeights) => Promise<void>;
  toggleDemoMode: (enabled: boolean) => Promise<void>;
  resetDemoData: (seedDemoItems?: boolean) => Promise<void>;
  exportAllJson: () => string;
}

const AppContext = createContext<AppContextValue | null>(null);

const repo = new AsyncStorageRepository();

function defaultSettings(): AppSettingsRecord {
  return {
    demoMode: true,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
    utilityWeights: { ...DEFAULT_UTILITY_WEIGHTS },
    themePreference: 'system',
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>(() => createDemoInventory());
  const [profile, setProfile] = useState<HouseholdProfile>(() => ({
    ...createDemoProfile(),
    onboardingCompleted: false,
  }));
  const [impactEvents, setImpactEvents] = useState<ImpactEvent[]>(() => createDemoImpactEvents());
  const [settings, setSettings] = useState<AppSettingsRecord>(() => defaultSettings());
  const [undoState, setUndoState] = useState<UndoDeleteState | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth>({
    reachable: false,
    providerName: 'checking...',
    providerConfigured: false,
    availableProviders: [],
    knowledgeCount: 0,
  });
  const [metricsSummary, setMetricsSummary] = useState<SustainableMetricsSummary | null>(null);

  const apiClient = useMemo(() => new WasteLessApiClient(settings.apiUrl), [settings.apiUrl]);

  const refreshBackend = useCallback(async () => {
    const [health, metrics] = await Promise.all([
      apiClient.checkHealth(),
      apiClient.getMetrics(),
    ]);
    setBackendHealth(health);
    setMetricsSummary(metrics);
  }, [apiClient]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await repo.loadAll();
        if (!active) return;
        if (stored) {
          setItems(stored.items);
          setProfile(stored.profile);
          setImpactEvents(stored.impactEvents);
          setSettings(stored.settings);
        } else {
          const initialItems = createDemoInventory();
          const initialProfile = { ...createDemoProfile(), onboardingCompleted: false };
          const initialImpact = createDemoImpactEvents();
          const initialSettings = defaultSettings();
          setItems(initialItems);
          setProfile(initialProfile);
          setImpactEvents(initialImpact);
          setSettings(initialSettings);
          await repo.saveAll({
            items: initialItems,
            profile: initialProfile,
            impactEvents: initialImpact,
            settings: initialSettings,
          });
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      void refreshBackend();
    }
  }, [hydrated, refreshBackend]);

  const theme = useMemo<AppTheme>(() => {
    if (settings.themePreference === 'dark') return DARK_THEME;
    if (settings.themePreference === 'light') return LIGHT_THEME;
    return systemScheme === 'dark' ? DARK_THEME : LIGHT_THEME;
  }, [settings.themePreference, systemScheme]);

  const refDate = todayISODate();

  const inventoryAnalysis = useMemo(() => {
    const analyst = new InventoryAnalyst();
    return analyst.analyze(items, settings.utilityWeights, refDate);
  }, [items, settings.utilityWeights, refDate]);

  const prioritizedItems = useMemo(() => {
    const prioritizer = new ExpiryPrioritizer();
    return prioritizer.prioritize(items, profile, settings.utilityWeights, refDate).result;
  }, [items, profile, settings.utilityWeights, refDate]);

  const ruleCheck = useMemo(() => evaluateRulesForInventory(items, refDate), [items, refDate]);

  const actionSelection = useMemo(() => {
    const selector = new ActionSelector();
    return selector.select(items, profile, settings.utilityWeights, refDate).result;
  }, [items, profile, settings.utilityWeights, refDate]);

  const recommendations = useMemo(() => {
    const planner = new RecipePlanner();
    return planner.recommendBundle(items, profile, settings.utilityWeights, refDate).result;
  }, [items, profile, settings.utilityWeights, refDate]);

  const impactSummary = useMemo(() => buildImpactSummary(impactEvents), [impactEvents]);

  const addItem = useCallback(
    async (input: NewItemInput) => {
      const nowIso = new Date().toISOString();
      const created: InventoryItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...input,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const next = [created, ...items];
      setItems(next);
      await repo.saveItems(next);
      return created;
    },
    [items]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<NewItemInput>) => {
      const nowIso = new Date().toISOString();
      const next = items.map((it) =>
        it.id === id ? { ...it, ...updates, updatedAt: nowIso } : it
      );
      setItems(next);
      await repo.saveItems(next);
    },
    [items]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) return;
      const target = items[idx];
      const next = items.filter((it) => it.id !== id);
      setUndoState({ item: target, index: idx });
      setItems(next);
      await repo.saveItems(next);
    },
    [items]
  );

  const undoDelete = useCallback(async () => {
    if (!undoState) return;
    const next = [...items];
    const insertAt = Math.min(undoState.index, next.length);
    next.splice(insertAt, 0, undoState.item);
    setItems(next);
    setUndoState(null);
    await repo.saveItems(next);
  }, [items, undoState]);

  const dismissUndo = useCallback(() => setUndoState(null), []);

  const markItemOutcome = useCallback(
    async (id: string, outcome: 'saved' | 'frozen' | 'discarded') => {
      const target = items.find((i) => i.id === id);
      if (!target) return;

      const est = estimateItemImpact(target);
      const event: ImpactEvent = {
        id: `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        itemName: target.name,
        category: target.category,
        outcome,
        weightKg: est.weightKg,
        estimatedValueUsd: est.estimatedMoneyUsd,
        estimatedCo2eKg: est.estimatedCo2eKg,
      };

      const nextEvents = [event, ...impactEvents];
      setImpactEvents(nextEvents);
      await repo.saveImpactEvents(nextEvents);

      if (outcome === 'frozen') {
        const nextItems = items.map((it) =>
          it.id === id
            ? {
                ...it,
                storageLocation: 'freezer' as const,
                expiryDate: addDaysISODate(todayISODate(), 60),
                dateType: 'best_before' as const,
                notes: `${it.notes ? `${it.notes} • ` : ''}Frozen on ${todayISODate()} to pause spoilage.`,
                updatedAt: new Date().toISOString(),
              }
            : it
        );
        setItems(nextItems);
        await repo.saveItems(nextItems);
      } else {
        const nextItems = items.filter((it) => it.id !== id);
        setItems(nextItems);
        await repo.saveItems(nextItems);
      }
    },
    [items, impactEvents]
  );

  const updateProfile = useCallback(
    async (updates: Partial<HouseholdProfile>) => {
      const next = { ...profile, ...updates };
      setProfile(next);
      await repo.saveProfile(next);
    },
    [profile]
  );

  const updateSettings = useCallback(
    async (updates: Partial<AppSettingsRecord>) => {
      const next = { ...settings, ...updates };
      setSettings(next);
      await repo.saveSettings(next);
    },
    [settings]
  );

  const updateWeights = useCallback(
    async (weights: UtilityWeights) => {
      const next = { ...settings, utilityWeights: weights };
      setSettings(next);
      await repo.saveSettings(next);
    },
    [settings]
  );

  const toggleDemoMode = useCallback(
    async (enabled: boolean) => {
      const nextSettings = { ...settings, demoMode: enabled };
      setSettings(nextSettings);
      await repo.saveSettings(nextSettings);
      if (enabled && items.length === 0) {
        const demoItems = createDemoInventory();
        const demoImpact = createDemoImpactEvents();
        setItems(demoItems);
        setImpactEvents(demoImpact);
        await Promise.all([repo.saveItems(demoItems), repo.saveImpactEvents(demoImpact)]);
      }
    },
    [settings, items.length]
  );

  const resetDemoData = useCallback(
    async (seedDemoItems = true) => {
      const nextItems = seedDemoItems ? createDemoInventory() : [];
      const nextImpact = seedDemoItems ? createDemoImpactEvents() : [];
      const nextProfile: HouseholdProfile = {
        ...createDemoProfile(),
        onboardingCompleted: true,
      };
      const nextSettings: AppSettingsRecord = {
        ...settings,
        demoMode: seedDemoItems,
      };
      setItems(nextItems);
      setImpactEvents(nextImpact);
      setProfile(nextProfile);
      setSettings(nextSettings);
      setUndoState(null);
      await repo.saveAll({
        items: nextItems,
        profile: nextProfile,
        impactEvents: nextImpact,
        settings: nextSettings,
      });
    },
    [settings]
  );

  const exportAllJson = useCallback(() => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        profile,
        items,
        impactEvents,
        impactSummary,
        settings,
      },
      null,
      2
    );
  }, [profile, items, impactEvents, impactSummary, settings]);

  const value: AppContextValue = {
    hydrated,
    theme,
    items,
    profile,
    impactEvents,
    settings,
    undoState,
    inventoryAnalysis,
    prioritizedItems,
    ruleEvaluations: ruleCheck.evaluations,
    safetyBlockedIds: ruleCheck.safetyBlockedItemIds,
    actionSelection,
    recommendations,
    impactSummary,
    apiClient,
    backendHealth,
    metricsSummary,
    refreshBackend,
    addItem,
    updateItem,
    deleteItem,
    undoDelete,
    dismissUndo,
    markItemOutcome,
    updateProfile,
    updateSettings,
    updateWeights,
    toggleDemoMode,
    resetDemoData,
    exportAllJson,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
