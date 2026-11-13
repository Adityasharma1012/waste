import { describe, expect, it } from 'vitest';
import {
  evaluateRulesForInventory,
  evaluateRulesForItem,
  listRuleDefinitions,
  PERMANENT_FOOD_SAFETY_BANNER,
  type InventoryItem,
} from '../src';

const REF_DATE = '2026-11-12';

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'item-1',
    name: 'Test Item',
    category: 'dairy',
    quantity: 300,
    unit: 'g',
    purchaseDate: '2026-11-10',
    dateType: 'use_by',
    expiryDate: REF_DATE,
    storageLocation: 'fridge',
    status: 'sealed',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    ...overrides,
  };
}

describe('Rules Engine', () => {
  it('exposes explicit readable rules with id, condition, action, and rationale', () => {
    const defs = listRuleDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(10);
    for (const d of defs) {
      expect(d.id).toMatch(/^RULE-/);
      expect(d.conditionDescription.length).toBeGreaterThan(10);
      expect(d.actionSummary.length).toBeGreaterThan(5);
      expect(d.rationale.length).toBeGreaterThan(15);
      expect(d.sourceRef.url).toMatch(/^https:\/\//);
    }
  });

  it('blocks expired use-by items and invokes "when in doubt, throw it out"', () => {
    const expiredMilk = makeItem({
      name: 'Whole Milk',
      dateType: 'use_by',
      expiryDate: '2026-11-11',
      storageLocation: 'fridge',
    });

    const evals = evaluateRulesForItem(expiredMilk, REF_DATE);
    expect(evals.some((e) => e.ruleId === 'RULE-SAFETY-001')).toBe(true);
    expect(evals[0].actionType).toBe('discard_unsafe');
    expect(evals[0].safetyNote.toLowerCase()).toContain('when in doubt, throw it out');
  });

  it('distinguishes best_before (quality) from use_by (safety) and never declares food safe from smell/appearance', () => {
    const pasta = makeItem({
      name: 'Penne Pasta',
      category: 'pantry_grains',
      dateType: 'best_before',
      expiryDate: '2026-11-10',
      storageLocation: 'pantry',
      status: 'sealed',
    });

    const evals = evaluateRulesForItem(pasta, REF_DATE);
    const qualityRule = evals.find((e) => e.ruleId === 'RULE-QUALITY-001');
    expect(qualityRule).toBeDefined();
    expect(qualityRule?.actionType).toBe('check_quality');
    expect(qualityRule?.safetyNote.toLowerCase()).toContain('never declare food safe from appearance or smell');
    expect(qualityRule?.safetyNote.toLowerCase()).toContain('when in doubt, throw it out');
  });

  it('flags cooked leftovers older than 4 days in fridge even if expiryDate is future', () => {
    const oldLeftovers = makeItem({
      name: 'Cooked Chicken Rice',
      category: 'leftovers',
      status: 'cooked',
      purchaseDate: '2026-11-06',
      expiryDate: '2026-11-14',
      storageLocation: 'fridge',
    });

    const evals = evaluateRulesForItem(oldLeftovers, REF_DATE);
    expect(evals.some((e) => e.ruleId === 'RULE-SAFETY-002')).toBe(true);
    expect(evals[0].actionType).toBe('discard_unsafe');
  });

  it('flags notes mentioning power outage or temperature doubt', () => {
    const doubtful = makeItem({
      name: 'Fresh Salmon',
      category: 'seafood',
      expiryDate: '2026-11-14',
      notes: 'Fridge had a power outage overnight, unsure if safe',
    });

    const evals = evaluateRulesForItem(doubtful, REF_DATE);
    expect(evals.some((e) => e.ruleId === 'RULE-SAFETY-004')).toBe(true);
    expect(evals[0].actionType).toBe('discard_unsafe');
  });

  it('recommends freezing fresh meat expiring within 3 days', () => {
    const chicken = makeItem({
      name: 'Chicken Breast',
      category: 'meat_poultry',
      dateType: 'use_by',
      expiryDate: '2026-11-13',
      storageLocation: 'fridge',
      status: 'sealed',
    });

    const evals = evaluateRulesForItem(chicken, REF_DATE);
    expect(evals.some((e) => e.ruleId === 'RULE-PRESERVE-001')).toBe(true);
  });

  it('returns permanent safety banner and safetyBlockedItemIds across inventory', () => {
    const items = [
      makeItem({ id: 'bad', name: 'Expired Yogurt', dateType: 'use_by', expiryDate: '2026-11-10' }),
      makeItem({ id: 'ok', name: 'Apples', category: 'produce', dateType: 'best_before', expiryDate: '2026-11-20' }),
    ];
    const summary = evaluateRulesForInventory(items, REF_DATE);
    expect(summary.safetyBlockedItemIds.has('bad')).toBe(true);
    expect(summary.safetyBlockedItemIds.has('ok')).toBe(false);
    expect(summary.safetyBanner).toBe(PERMANENT_FOOD_SAFETY_BANNER);
  });
});
