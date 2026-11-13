import type {
  AgentResult,
  InventoryAnalysis,
  InventoryItem,
  ItemStatus,
  ScoreComponent,
  StorageLocation,
  UrgencyBucket,
  UtilityWeights,
} from '../types';
import { DEFAULT_UTILITY_WEIGHTS } from '../types';
import { estimateItemImpact, round2 } from '../impact/calculator';
import { classifyUrgencyBucket, todayISODate } from '../utils/dates';
import { evaluateRulesForInventory } from '../rules/engine';

export class InventoryAnalyst {
  readonly name = 'InventoryAnalyst';

  analyze(
    items: InventoryItem[],
    weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
    referenceDate: string = todayISODate()
  ): AgentResult<InventoryAnalysis> {
    const bucketCounts: Record<UrgencyBucket, number> = {
      expired: 0,
      use_today: 0,
      use_soon_1_3d: 0,
      safe: 0,
    };
    const storageCounts: Record<StorageLocation, number> = {
      fridge: 0,
      freezer: 0,
      pantry: 0,
    };
    const statusCounts: Record<ItemStatus, number> = {
      sealed: 0,
      opened: 0,
      cooked: 0,
    };

    let atRiskWeightKg = 0;
    let atRiskValueUsd = 0;
    let atRiskCo2eKg = 0;
    let totalWeightKg = 0;

    for (const item of items) {
      const bucket = classifyUrgencyBucket(item, referenceDate);
      bucketCounts[bucket] += 1;
      storageCounts[item.storageLocation] += 1;
      statusCounts[item.status] += 1;

      const impact = estimateItemImpact(item);
      totalWeightKg += impact.weightKg;

      if (bucket === 'expired' || bucket === 'use_today' || bucket === 'use_soon_1_3d') {
        atRiskWeightKg += impact.weightKg;
        atRiskValueUsd += impact.estimatedMoneyUsd;
        atRiskCo2eKg += impact.estimatedCo2eKg;
      }
    }

    const ruleCheck = evaluateRulesForInventory(items, referenceDate);
    const total = Math.max(1, items.length);
    const safeFraction = bucketCounts.safe / total;
    const atRiskWeightRatio = totalWeightKg > 0 ? atRiskWeightKg / totalWeightKg : 0;
    const safetyClearance = 1 - Math.min(1, ruleCheck.safetyBlockedItemIds.size / total);
    const freezerUtilization = Math.min(1, (storageCounts.freezer / total) * 2.2);
    const sealedStability = 1 - Math.min(1, (statusCounts.opened + statusCounts.cooked) / total) * 0.5;

    const components: ScoreComponent[] = [
      {
        factor: 'urgency',
        rawValue: round2(safeFraction * 100),
        weight: weights.urgency,
        weightedContribution: round2(safeFraction * 100 * weights.urgency),
        note: `${bucketCounts.safe} of ${items.length} items are in the Safe (>3d) window.`,
      },
      {
        factor: 'wastePrevented',
        rawValue: round2((1 - atRiskWeightRatio) * 100),
        weight: weights.wastePrevented,
        weightedContribution: round2((1 - atRiskWeightRatio) * 100 * weights.wastePrevented),
        note: `${round2(atRiskWeightKg)} kg of ${round2(totalWeightKg)} kg total stock is currently at risk.`,
      },
      {
        factor: 'costSavings',
        rawValue: round2(safetyClearance * 100),
        weight: weights.costSavings,
        weightedContribution: round2(safetyClearance * 100 * weights.costSavings),
        note: `${ruleCheck.safetyBlockedItemIds.size} item(s) flagged for safety discard; ~$${round2(atRiskValueUsd)} value at risk.`,
      },
      {
        factor: 'timeEffort',
        rawValue: round2(freezerUtilization * 100),
        weight: weights.timeEffort,
        weightedContribution: round2(freezerUtilization * 100 * weights.timeEffort),
        note: `${storageCounts.freezer} item(s) preserved in freezer for scheduling flexibility.`,
      },
      {
        factor: 'preferenceFit',
        rawValue: round2(sealedStability * 100),
        weight: weights.preferenceFit,
        weightedContribution: round2(sealedStability * 100 * weights.preferenceFit),
        note: `${statusCounts.opened} opened and ${statusCounts.cooked} cooked items need closer monitoring.`,
      },
    ];

    const weightSum =
      weights.urgency +
      weights.wastePrevented +
      weights.costSavings +
      weights.timeEffort +
      weights.preferenceFit;

    const rawWeightedTotal = components.reduce((acc, c) => acc + c.weightedContribution, 0);
    const healthScore = items.length === 0 ? 100 : round2(rawWeightedTotal / Math.max(0.01, weightSum));

    const summary =
      items.length === 0
        ? 'Your pantry and fridge inventory is empty. Add items or load demo data to begin tracking.'
        : `${bucketCounts.expired} expired, ${bucketCounts.use_today} due today, ${bucketCounts.use_soon_1_3d} due in 1–3 days. Est. ~$${round2(atRiskValueUsd)} and ~${round2(atRiskCo2eKg)} kg CO2e at risk.`;

    return {
      agentName: this.name,
      utilityScore: healthScore,
      formulaDescription:
        'Weighted sum of safe-horizon ratio (w_urgency), low weight-at-risk ratio (w_waste), safety clearance (w_cost), freezer buffer (w_time), and container stability (w_pref).',
      scoreBreakdown: components,
      result: {
        totalItems: items.length,
        bucketCounts,
        storageCounts,
        statusCounts,
        atRiskWeightKg: round2(atRiskWeightKg),
        atRiskValueUsd: round2(atRiskValueUsd),
        atRiskCo2eKg: round2(atRiskCo2eKg),
        healthScore,
        summary,
      },
    };
  }
}
