import type {
  FoodCategory,
  ImpactEvent,
  ImpactSummary,
  InventoryItem,
  QuantityUnit,
} from '../types';
import {
  CATEGORY_IMPACT_CONSTANTS,
  IMPACT_ESTIMATE_DISCLAIMER,
  IMPACT_METHODOLOGY_VERSION,
  IMPACT_SOURCES,
  PIECE_WEIGHT_KG_BY_CATEGORY,
  SERVING_WEIGHT_KG,
} from './constants';

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeQuantityToKg(
  quantity: number,
  unit: QuantityUnit,
  category: FoodCategory
): number {
  const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
  switch (unit) {
    case 'kg':
      return round2(safeQty);
    case 'g':
      return round2(safeQty * 0.001);
    case 'lb':
      return round2(safeQty * 0.453592);
    case 'oz':
      return round2(safeQty * 0.0283495);
    case 'L':
      return round2(safeQty * 1.0);
    case 'ml':
      return round2(safeQty * 0.001);
    case 'pcs':
      return round2(safeQty * PIECE_WEIGHT_KG_BY_CATEGORY[category]);
    case 'servings':
      return round2(safeQty * SERVING_WEIGHT_KG);
    default:
      return round2(safeQty * CATEGORY_IMPACT_CONSTANTS[category].defaultItemWeightKg);
  }
}

export interface ItemImpactEstimate {
  weightKg: number;
  estimatedMoneyUsd: number;
  estimatedCo2eKg: number;
  isEstimate: true;
  formulaNote: string;
}

export function estimateItemImpact(
  item: Pick<InventoryItem, 'quantity' | 'unit' | 'category' | 'estimatedValueUsd'>
): ItemImpactEstimate {
  const constants = CATEGORY_IMPACT_CONSTANTS[item.category];
  const weightKg = Math.max(0.02, normalizeQuantityToKg(item.quantity, item.unit, item.category));
  const estimatedMoneyUsd =
    typeof item.estimatedValueUsd === 'number' && item.estimatedValueUsd > 0
      ? round2(item.estimatedValueUsd)
      : round2(weightKg * constants.avgPriceUsdPerKg);
  const estimatedCo2eKg = round2(weightKg * constants.co2eKgPerKg);

  return {
    weightKg,
    estimatedMoneyUsd,
    estimatedCo2eKg,
    isEstimate: true,
    formulaNote: `Estimate: ${weightKg} kg × $${constants.avgPriceUsdPerKg}/kg (${constants.label}) = ~$${estimatedMoneyUsd}; ${weightKg} kg × ${constants.co2eKgPerKg} kg CO2e/kg = ~${estimatedCo2eKg} kg CO2e`,
  };
}

export function buildImpactSummary(events: ImpactEvent[]): ImpactSummary {
  let totalSavedKg = 0;
  let totalSavedMoneyUsd = 0;
  let totalSavedCo2eKg = 0;
  let totalDiscardedKg = 0;

  const categoryTotals = new Map<
    FoodCategory,
    { savedKg: number; moneyUsd: number; co2eKg: number }
  >();

  for (const event of events) {
    if (event.outcome === 'saved' || event.outcome === 'frozen') {
      totalSavedKg += event.weightKg;
      totalSavedMoneyUsd += event.estimatedValueUsd;
      totalSavedCo2eKg += event.estimatedCo2eKg;

      const existing = categoryTotals.get(event.category) ?? {
        savedKg: 0,
        moneyUsd: 0,
        co2eKg: 0,
      };
      existing.savedKg += event.weightKg;
      existing.moneyUsd += event.estimatedValueUsd;
      existing.co2eKg += event.estimatedCo2eKg;
      categoryTotals.set(event.category, existing);
    } else if (event.outcome === 'discarded') {
      totalDiscardedKg += event.weightKg;
    }
  }

  const totalHandledKg = totalSavedKg + totalDiscardedKg;
  const wastePreventionRatePct =
    totalHandledKg > 0 ? round2((totalSavedKg / totalHandledKg) * 100) : 100;

  const byCategory = Array.from(categoryTotals.entries())
    .map(([category, vals]) => ({
      category,
      label: CATEGORY_IMPACT_CONSTANTS[category].label,
      savedKg: round2(vals.savedKg),
      moneyUsd: round2(vals.moneyUsd),
      co2eKg: round2(vals.co2eKg),
    }))
    .sort((a, b) => b.co2eKg - a.co2eKg);

  return {
    totalSavedKg: round2(totalSavedKg),
    totalSavedMoneyUsd: round2(totalSavedMoneyUsd),
    totalSavedCo2eKg: round2(totalSavedCo2eKg),
    totalDiscardedKg: round2(totalDiscardedKg),
    wastePreventionRatePct,
    byCategory,
    isEstimate: true,
    disclaimer: IMPACT_ESTIMATE_DISCLAIMER,
  };
}

export function getImpactCalculationGuide() {
  return {
    methodologyVersion: IMPACT_METHODOLOGY_VERSION,
    disclaimer: IMPACT_ESTIMATE_DISCLAIMER,
    plainLanguageSteps: [
      '1. Convert item quantity and unit (g, kg, ml, L, oz, lb, pieces, servings) into an estimated weight in kilograms (kg).',
      '2. Multiply weight (kg) by the category average retail price ($/kg), or use your own entered price if provided.',
      '3. Multiply weight (kg) by the category cradle-to-retail emission factor (kg CO2e/kg) to estimate avoided greenhouse gas emissions.',
      '4. Only items marked Consumed/Saved or Safely Frozen before spoiling count toward saved estimates; discarded items are tracked separately.',
    ],
    formulas: {
      weightKg: 'Estimated Weight (kg) = Quantity × Unit Conversion Factor',
      moneyUsd: 'Estimated Money Saved ($) = User Item Value OR (Estimated Weight kg × Category Price $/kg)',
      co2eKg: 'Estimated CO2e Saved (kg) = Estimated Weight kg × Category Emission Factor (kg CO2e/kg)',
    },
    categoryConstants: Object.values(CATEGORY_IMPACT_CONSTANTS),
    sources: IMPACT_SOURCES,
  };
}
