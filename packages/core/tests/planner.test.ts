import { describe, expect, it } from 'vitest';
import {
  createDemoInventory,
  createDemoProfile,
  DEFAULT_UTILITY_WEIGHTS,
  planUseSoonActions,
} from '../src';

const REF_DATE = '2026-11-12';

describe('A* Search Planner', () => {
  it('satisfies the goal test on demo inventory and resolves safety discards before cooking', () => {
    const items = createDemoInventory(REF_DATE);
    const profile = createDemoProfile();

    const plan = planUseSoonActions(items, profile, DEFAULT_UTILITY_WEIGHTS, REF_DATE);
    expect(plan.algorithm).toBe('A*');
    expect(plan.goalSatisfied).toBe(true);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.statesExpanded).toBeGreaterThan(0);
    expect(plan.plainLanguageExplanation.length).toBeGreaterThan(20);

    // Expired Use-By Yogurt (demo-3) must be DISCARD_UNSAFE first
    expect(plan.steps[0].type).toBe('DISCARD_UNSAFE');
    expect(plan.steps[0].targetItemIds).toContain('demo-3');

    // Should also include at least one multi-item COOK_RECIPE or FREEZE_ITEM
    const hasRecipe = plan.steps.some((s) => s.type === 'COOK_RECIPE');
    expect(hasRecipe).toBe(true);
  });

  it('records rejected alternatives with reasons why they were not selected', () => {
    const items = createDemoInventory(REF_DATE);
    const profile = createDemoProfile();
    const plan = planUseSoonActions(items, profile, DEFAULT_UTILITY_WEIGHTS, REF_DATE);

    expect(plan.rejectedAlternatives.length).toBeGreaterThan(0);
    for (const alt of plan.rejectedAlternatives) {
      expect(alt.reasonRejected.length).toBeGreaterThan(10);
      expect(alt.chosenActionTitle.length).toBeGreaterThan(3);
    }
  });

  it('returns an empty step plan cleanly when all items are safe', () => {
    const safeItems = createDemoInventory(REF_DATE).filter((i) => i.id === 'demo-10' || i.id === 'demo-12');
    const plan = planUseSoonActions(safeItems, createDemoProfile(), DEFAULT_UTILITY_WEIGHTS, REF_DATE);
    expect(plan.goalSatisfied).toBe(true);
    expect(plan.steps).toEqual([]);
  });
});
