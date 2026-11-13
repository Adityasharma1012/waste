export type FoodCategory =
  | 'produce'
  | 'dairy'
  | 'meat_poultry'
  | 'seafood'
  | 'bakery'
  | 'pantry_grains'
  | 'leftovers'
  | 'beverages'
  | 'frozen'
  | 'other';

export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type ItemStatus = 'sealed' | 'opened' | 'cooked';

export type DateType = 'use_by' | 'best_before';

export type QuantityUnit = 'g' | 'kg' | 'ml' | 'L' | 'pcs' | 'servings' | 'oz' | 'lb';

export type UrgencyBucket = 'expired' | 'use_today' | 'use_soon_1_3d' | 'safe';

export interface InventoryItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: QuantityUnit;
  purchaseDate: string; // YYYY-MM-DD
  dateType: DateType;
  expiryDate: string; // YYYY-MM-DD
  storageLocation: StorageLocation;
  status: ItemStatus;
  notes?: string;
  estimatedValueUsd?: number;
  createdAt: string;
  updatedAt: string;
}

export type DietaryPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'dairy_free'
  | 'gluten_free'
  | 'nut_free'
  | 'halal'
  | 'kosher'
  | 'pescatarian';

export type BudgetLevel = 'tight' | 'moderate' | 'flexible';

export type SustainabilityGoal =
  | 'minimize_waste'
  | 'cut_emissions'
  | 'save_money'
  | 'balanced';

export interface HouseholdProfile {
  householdSize: number;
  dietaryPreferences: DietaryPreference[];
  budgetLevel: BudgetLevel;
  weeklyBudgetUsd: number;
  availableCookingMinutes: number;
  sustainabilityGoal: SustainabilityGoal;
  onboardingCompleted: boolean;
}

export interface UtilityWeights {
  urgency: number;
  wastePrevented: number;
  costSavings: number;
  timeEffort: number;
  preferenceFit: number;
}

export const DEFAULT_UTILITY_WEIGHTS: UtilityWeights = {
  urgency: 0.35,
  wastePrevented: 0.25,
  costSavings: 0.2,
  timeEffort: 0.1,
  preferenceFit: 0.1,
};

export type RuleSeverity = 'safety' | 'urgent' | 'preservation' | 'quality';

export type RuleActionType =
  | 'discard_unsafe'
  | 'cook_today'
  | 'eat_today'
  | 'freeze_now'
  | 'move_storage'
  | 'reheat_safely'
  | 'check_quality'
  | 'plan_meal';

export interface GuidanceSourceRef {
  sourceName: string;
  url: string;
}

export interface RuleDefinition {
  id: string;
  title: string;
  severity: RuleSeverity;
  conditionDescription: string;
  actionType: RuleActionType;
  actionSummary: string;
  rationale: string;
  safetyNote: string;
  sourceRef: GuidanceSourceRef;
}

export interface RuleEvaluation {
  ruleId: string;
  title: string;
  severity: RuleSeverity;
  itemId: string;
  itemName: string;
  conditionMatched: string;
  actionType: RuleActionType;
  actionRecommended: string;
  rationale: string;
  safetyNote: string;
  sourceRef: GuidanceSourceRef;
}

export type PlannerActionType =
  | 'COOK_RECIPE'
  | 'FREEZE_ITEM'
  | 'EAT_LEFTOVERS'
  | 'STORE_PRESERVE'
  | 'DISCARD_UNSAFE';

export interface PlannerAction {
  id: string;
  type: PlannerActionType;
  title: string;
  targetItemIds: string[];
  targetItemNames: string[];
  recipeId?: string;
  estimatedMinutes: number;
  estimatedKgSaved: number;
  estimatedMoneySavedUsd: number;
  estimatedCo2eSavedKg: number;
  utilityGain: number;
  stepCost: number;
  rationale: string;
  safetyWarning?: string;
}

export interface PlannerState {
  remainingAtRiskIds: string[];
  addressedItemIds: string[];
  frozenItemIds: string[];
  discardedItemIds: string[];
  remainingMinutes: number;
  totalUtility: number;
  totalCost: number;
  totalKgSaved: number;
  totalMoneySavedUsd: number;
  totalCo2eSavedKg: number;
}

export interface RejectedAlternative {
  stepNumber: number;
  actionTitle: string;
  actionType: PlannerActionType;
  utilityScore: number;
  chosenActionTitle: string;
  chosenUtilityScore: number;
  reasonRejected: string;
}

export interface ActionPlan {
  generatedAt: string;
  algorithm: 'A*';
  goalSatisfied: boolean;
  statesExpanded: number;
  searchTimeMs: number;
  steps: PlannerAction[];
  rejectedAlternatives: RejectedAlternative[];
  plainLanguageExplanation: string;
  totals: {
    itemsAddressed: number;
    minutesRequired: number;
    estimatedKgSaved: number;
    estimatedMoneySavedUsd: number;
    estimatedCo2eSavedKg: number;
    totalUtilityScore: number;
  };
}

export interface ScoreComponent {
  factor: string;
  rawValue: number;
  weight: number;
  weightedContribution: number;
  note: string;
}

export interface AgentResult<T> {
  agentName: string;
  utilityScore: number;
  formulaDescription: string;
  scoreBreakdown: ScoreComponent[];
  result: T;
}

export interface InventoryAnalysis {
  totalItems: number;
  bucketCounts: Record<UrgencyBucket, number>;
  storageCounts: Record<StorageLocation, number>;
  statusCounts: Record<ItemStatus, number>;
  atRiskWeightKg: number;
  atRiskValueUsd: number;
  atRiskCo2eKg: number;
  healthScore: number;
  summary: string;
}

export interface PrioritizedItem {
  item: InventoryItem;
  daysUntilExpiry: number;
  urgencyBucket: UrgencyBucket;
  urgencyScore: number;
  safetyBlocked: boolean;
  recommendedAction: string;
  scoreBreakdown: ScoreComponent[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepAndCookMinutes: number;
  servings: number;
  dietaryTags: DietaryPreference[];
  ingredients: string[];
  instructions: string[];
  storageTip: string;
  isLeftoverRemix?: boolean;
}

export interface ScoredRecipe {
  recipe: Recipe;
  matchedItemIds: string[];
  matchedItemNames: string[];
  urgentMatchCount: number;
  utilityScore: number;
  estimatedKgSaved: number;
  estimatedMoneySavedUsd: number;
  estimatedCo2eSavedKg: number;
  scoreBreakdown: ScoreComponent[];
  fitSummary: string;
}

export interface StorageTip {
  id: string;
  itemId?: string;
  itemName: string;
  tip: string;
  canFreeze: boolean;
  sourceRef: GuidanceSourceRef;
}

export interface MealPlanSlot {
  dayLabel: string;
  mealType: 'Lunch' | 'Dinner' | 'Quick Meal';
  title: string;
  usesItemNames: string[];
  minutes: number;
}

export interface LeftoverIdea {
  id: string;
  title: string;
  usesItemNames: string[];
  idea: string;
  safetyNote: string;
}

export interface RecommendationBundle {
  recipes: ScoredRecipe[];
  freezingTips: StorageTip[];
  storageTips: StorageTip[];
  mealPlan: MealPlanSlot[];
  leftoverIdeas: LeftoverIdea[];
}

export interface ActionSelection {
  selectedPlan: ActionPlan;
  topPriorities: PrioritizedItem[];
  triggeredRules: RuleEvaluation[];
  arbitrationSummary: string;
}

export interface CategoryImpactConstant {
  category: FoodCategory;
  label: string;
  co2eKgPerKg: number;
  avgPriceUsdPerKg: number;
  defaultItemWeightKg: number;
  sourceCitation: string;
}

export interface ImpactEvent {
  id: string;
  timestamp: string;
  itemName: string;
  category: FoodCategory;
  outcome: 'saved' | 'frozen' | 'discarded';
  weightKg: number;
  estimatedValueUsd: number;
  estimatedCo2eKg: number;
}

export interface ImpactSummary {
  totalSavedKg: number;
  totalSavedMoneyUsd: number;
  totalSavedCo2eKg: number;
  totalDiscardedKg: number;
  wastePreventionRatePct: number;
  byCategory: Array<{
    category: FoodCategory;
    label: string;
    savedKg: number;
    moneyUsd: number;
    co2eKg: number;
  }>;
  isEstimate: true;
  disclaimer: string;
}

export type ResolutionTier = 'rules' | 'cache' | 'rag_llm' | 'rag_offline';

export interface SustainableMetricsSummary {
  totalRequests: number;
  rulesHandledCount: number;
  cacheHitsCount: number;
  ragLlmCount: number;
  ragOfflineCount: number;
  withoutLlmPercent: number;
  cacheHitPercent: number;
  avgResponseTimeMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  recentLogs: Array<{
    requestId: string;
    timestamp: string;
    endpoint: string;
    resolutionTier: ResolutionTier;
    provider: string;
    responseTimeMs: number;
    totalTokens: number;
    estimatedCostUsd: number;
    cacheHit: boolean;
    ruleHandled: boolean;
    ragSourceCount: number;
  }>;
}

export interface KnowledgeCitation {
  id: string;
  title: string;
  sourceName: string;
  url: string;
  retrievalDate: string;
  snippet: string;
  score?: number;
}
