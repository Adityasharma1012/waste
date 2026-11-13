import { describe, expect, it } from 'vitest';
import {
  buildImpactSummary,
  CATEGORY_IMPACT_CONSTANTS,
  createDemoImpactEvents,
  estimateItemImpact,
  getImpactCalculationGuide,
  normalizeQuantityToKg,
} from '../src';

describe('Impact Estimation & Constants', () => {
  it('normalizes units consistently to kg', () => {
    expect(normalizeQuantityToKg(500, 'g', 'produce')).toBe(0.5);
    expect(normalizeQuantityToKg(1.5, 'kg', 'produce')).toBe(1.5);
    expect(normalizeQuantityToKg(1, 'lb', 'meat_poultry')).toBeCloseTo(0.45, 2);
    expect(normalizeQuantityToKg(1000, 'ml', 'dairy')).toBe(1);
    expect(normalizeQuantityToKg(2, 'servings', 'leftovers')).toBe(0.6);
  });

  it('marks every item and summary estimate explicitly as an estimate', () => {
    const est = estimateItemImpact({ quantity: 1, unit: 'kg', category: 'meat_poultry' });
    expect(est.isEstimate).toBe(true);
    expect(est.estimatedCo2eKg).toBe(CATEGORY_IMPACT_CONSTANTS.meat_poultry.co2eKgPerKg);
    expect(est.estimatedMoneyUsd).toBe(CATEGORY_IMPACT_CONSTANTS.meat_poultry.avgPriceUsdPerKg);

    const events = createDemoImpactEvents('2026-11-12');
    const summary = buildImpactSummary([
      ...events,
      {
        id: 'disc-1',
        timestamp: '2026-11-12T10:00:00Z',
        itemName: 'Spoiled Greens',
        category: 'produce',
        outcome: 'discarded',
        weightKg: 0.2,
        estimatedValueUsd: 0.84,
        estimatedCo2eKg: 0.32,
      },
    ]);

    expect(summary.isEstimate).toBe(true);
    expect(summary.totalSavedKg).toBeGreaterThan(0);
    expect(summary.totalDiscardedKg).toBe(0.2);
    expect(summary.wastePreventionRatePct).toBeLessThan(100);
    expect(summary.disclaimer.toLowerCase()).toContain('estimate');
  });

  it('provides plain-language formulas and cited sources in calculation guide', () => {
    const guide = getImpactCalculationGuide();
    expect(guide.plainLanguageSteps.length).toBeGreaterThanOrEqual(4);
    expect(guide.categoryConstants.length).toBe(10);
    expect(guide.sources.length).toBeGreaterThanOrEqual(4);
  });
});
