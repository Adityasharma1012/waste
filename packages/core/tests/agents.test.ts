import { describe, expect, it } from 'vitest';
import {
  ActionSelector,
  createDemoInventory,
  createDemoProfile,
  DEFAULT_UTILITY_WEIGHTS,
  ExpiryPrioritizer,
  InventoryAnalyst,
  RecipePlanner,
} from '../src';

const REF_DATE = '2026-11-12';

describe('Utility Agents', () => {
  it('InventoryAnalyst computes bucket counts, at-risk totals, and weighted healthScore', () => {
    const items = createDemoInventory(REF_DATE);
    const analyst = new InventoryAnalyst();
    const res = analyst.analyze(items, DEFAULT_UTILITY_WEIGHTS, REF_DATE);

    expect(res.agentName).toBe('InventoryAnalyst');
    expect(res.result.totalItems).toBe(items.length);
    expect(res.result.bucketCounts.expired).toBeGreaterThan(0);
    expect(res.result.bucketCounts.use_today).toBeGreaterThan(0);
    expect(res.result.bucketCounts.use_soon_1_3d).toBeGreaterThan(0);
    expect(res.result.bucketCounts.safe).toBeGreaterThan(0);
    expect(res.scoreBreakdown.length).toBe(5);
    expect(res.utilityScore).toBeGreaterThanOrEqual(0);
    expect(res.utilityScore).toBeLessThanOrEqual(100);
  });

  it('ExpiryPrioritizer prioritizes safety-blocked & urgent items and responds to configurable weights', () => {
    const items = createDemoInventory(REF_DATE);
    const profile = createDemoProfile();
    const prioritizer = new ExpiryPrioritizer();

    const defaultRes = prioritizer.prioritize(items, profile, DEFAULT_UTILITY_WEIGHTS, REF_DATE);
    expect(defaultRes.result[0].safetyBlocked).toBe(true);

    const costHeavy = prioritizer.prioritize(
      items,
      profile,
      { urgency: 0.1, wastePrevented: 0.1, costSavings: 0.6, timeEffort: 0.1, preferenceFit: 0.1 },
      REF_DATE
    );
    expect(costHeavy.result[0].scoreBreakdown.find((s) => s.factor === 'costSavings')?.weight).toBe(0.6);
  });

  it('RecipePlanner enforces dietary preferences and excludes safety-blocked items', () => {
    const items = createDemoInventory(REF_DATE);
    const veganProfile = {
      ...createDemoProfile(),
      dietaryPreferences: ['vegan' as const],
    };
    const planner = new RecipePlanner();
    const bundle = planner.recommendBundle(items, veganProfile, DEFAULT_UTILITY_WEIGHTS, REF_DATE);

    expect(bundle.result.recipes.length).toBeGreaterThan(0);
    for (const r of bundle.result.recipes) {
      expect(r.recipe.dietaryTags).toContain('vegan');
      // Expired Greek yogurt (demo-3) must never appear in matched recipes
      expect(r.matchedItemIds).not.toContain('demo-3');
    }
    expect(bundle.result.freezingTips.length).toBeGreaterThan(0);
    expect(bundle.result.storageTips.length).toBeGreaterThan(0);
    expect(bundle.result.mealPlan.length).toBeGreaterThan(0);
  });

  it('ActionSelector arbitrates rules, priorities, and A* plan into unified output', () => {
    const selector = new ActionSelector();
    const res = selector.select(
      createDemoInventory(REF_DATE),
      createDemoProfile(),
      DEFAULT_UTILITY_WEIGHTS,
      REF_DATE
    );
    expect(res.agentName).toBe('ActionSelector');
    expect(res.result.selectedPlan.steps.length).toBeGreaterThan(0);
    expect(res.result.triggeredRules.length).toBeGreaterThan(0);
    expect(res.result.arbitrationSummary).toContain('A*');
  });
});
