import type {
  AgentResult,
  HouseholdProfile,
  InventoryItem,
  PrioritizedItem,
  ScoreComponent,
  UtilityWeights,
} from '../types';
import { DEFAULT_UTILITY_WEIGHTS } from '../types';
import { estimateItemImpact, round2 } from '../impact/calculator';
import { classifyUrgencyBucket, getDaysUntilExpiry, todayISODate } from '../utils/dates';
import { evaluateRulesForItem } from '../rules/engine';

export class ExpiryPrioritizer {
  readonly name = 'ExpiryPrioritizer';

  prioritize(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
    referenceDate: string = todayISODate()
  ): AgentResult<PrioritizedItem[]> {
    const weightSum = Math.max(
      0.01,
      weights.urgency +
        weights.wastePrevented +
        weights.costSavings +
        weights.timeEffort +
        weights.preferenceFit
    );

    const prioritized: PrioritizedItem[] = items.map((item) => {
      const daysUntilExpiry = getDaysUntilExpiry(item, referenceDate);
      const urgencyBucket = classifyUrgencyBucket(item, referenceDate);
      const rules = evaluateRulesForItem(item, referenceDate);
      const safetyBlocked = rules.some((r) => r.actionType === 'discard_unsafe');
      const impact = estimateItemImpact(item);

      // Urgency score 0..100
      let urgencyRaw = 15;
      if (daysUntilExpiry < 0) urgencyRaw = 100;
      else if (daysUntilExpiry === 0) urgencyRaw = 95;
      else if (daysUntilExpiry <= 3) urgencyRaw = 85 - (daysUntilExpiry - 1) * 10;
      else if (daysUntilExpiry <= 7) urgencyRaw = 50 - (daysUntilExpiry - 4) * 5;
      if (item.dateType === 'use_by' && daysUntilExpiry <= 3) urgencyRaw = Math.min(100, urgencyRaw + 8);
      if (item.status !== 'sealed' && item.storageLocation === 'fridge') {
        urgencyRaw = Math.min(100, urgencyRaw + 7);
      }
      if (item.storageLocation === 'freezer' && daysUntilExpiry >= 0) {
        urgencyRaw = Math.max(10, urgencyRaw - 45);
      }

      // Waste/CO2e footprint score 0..100
      const wasteRaw = Math.min(100, round2((impact.estimatedCo2eKg * 12 + impact.weightKg * 30)));
      // Cost score 0..100
      const budgetBoost = profile.budgetLevel === 'tight' ? 1.2 : 1.0;
      const costRaw = Math.min(100, round2(impact.estimatedMoneyUsd * 8 * budgetBoost));
      // Quick-to-act score 0..100
      const timeRaw =
        item.status === 'cooked' || item.category === 'bakery' || item.category === 'dairy'
          ? 85
          : 60;
      // Goal alignment score 0..100
      let prefRaw = 65;
      if (profile.sustainabilityGoal === 'cut_emissions' && impact.estimatedCo2eKg >= 2) prefRaw = 95;
      if (profile.sustainabilityGoal === 'save_money' && impact.estimatedMoneyUsd >= 4) prefRaw = 95;
      if (safetyBlocked) prefRaw = 100;

      const scoreBreakdown: ScoreComponent[] = [
        {
          factor: 'urgency',
          rawValue: urgencyRaw,
          weight: weights.urgency,
          weightedContribution: round2(urgencyRaw * weights.urgency),
          note: `${daysUntilExpiry}d left (${item.dateType}, ${item.status})`,
        },
        {
          factor: 'wastePrevented',
          rawValue: wasteRaw,
          weight: weights.wastePrevented,
          weightedContribution: round2(wasteRaw * weights.wastePrevented),
          note: `~${impact.weightKg} kg / ~${impact.estimatedCo2eKg} kg CO2e`,
        },
        {
          factor: 'costSavings',
          rawValue: costRaw,
          weight: weights.costSavings,
          weightedContribution: round2(costRaw * weights.costSavings),
          note: `~$${impact.estimatedMoneyUsd} estimated value`,
        },
        {
          factor: 'timeEffort',
          rawValue: timeRaw,
          weight: weights.timeEffort,
          weightedContribution: round2(timeRaw * weights.timeEffort),
          note: `Ready/handling speed for ${item.category}`,
        },
        {
          factor: 'preferenceFit',
          rawValue: prefRaw,
          weight: weights.preferenceFit,
          weightedContribution: round2(prefRaw * weights.preferenceFit),
          note: `Goal alignment (${profile.sustainabilityGoal})`,
        },
      ];

      const urgencyScore = round2(
        scoreBreakdown.reduce((acc, s) => acc + s.weightedContribution, 0) / weightSum
      );

      let recommendedAction = 'Keep stored cleanly and check again later this week.';
      if (rules.length > 0) {
        recommendedAction = rules[0].actionRecommended;
      } else if (urgencyBucket === 'use_today') {
        recommendedAction = 'Use in a meal today or freeze if suitable.';
      } else if (urgencyBucket === 'use_soon_1_3d') {
        recommendedAction = 'Include in your 1–3 day meal plan or freeze.';
      }

      return {
        item,
        daysUntilExpiry,
        urgencyBucket,
        urgencyScore,
        safetyBlocked,
        recommendedAction,
        scoreBreakdown,
      };
    });

    prioritized.sort((a, b) => {
      if (a.safetyBlocked !== b.safetyBlocked) return a.safetyBlocked ? -1 : 1;
      return b.urgencyScore - a.urgencyScore;
    });

    const topScore = prioritized[0]?.urgencyScore ?? 0;

    return {
      agentName: this.name,
      utilityScore: topScore,
      formulaDescription:
        'U(item) = (w_urgency·Urgency + w_waste·CO2eWeight + w_cost·Value + w_time·HandlingEase + w_pref·GoalFit) / Σw',
      scoreBreakdown: prioritized[0]?.scoreBreakdown ?? [],
      result: prioritized,
    };
  }
}
