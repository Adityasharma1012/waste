import type {
  ActionSelection,
  AgentResult,
  HouseholdProfile,
  InventoryItem,
  UtilityWeights,
} from '../types';
import { DEFAULT_UTILITY_WEIGHTS } from '../types';
import { evaluateRulesForInventory } from '../rules/engine';
import { planUseSoonActions } from '../planner/searchPlanner';
import { todayISODate } from '../utils/dates';
import { ExpiryPrioritizer } from './ExpiryPrioritizer';

export class ActionSelector {
  readonly name = 'ActionSelector';

  select(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
    referenceDate: string = todayISODate()
  ): AgentResult<ActionSelection> {
    const prioritizer = new ExpiryPrioritizer();
    const priorityAgent = prioritizer.prioritize(items, profile, weights, referenceDate);
    const ruleCheck = evaluateRulesForInventory(items, referenceDate);
    const selectedPlan = planUseSoonActions(items, profile, weights, referenceDate);

    const arbitrationSummary =
      `Arbitrated ${ruleCheck.evaluations.length} triggered rule(s) and ${priorityAgent.result.length} item priority score(s) into a ${selectedPlan.steps.length}-step ${selectedPlan.algorithm} plan ` +
      `(goal satisfied: ${selectedPlan.goalSatisfied ? 'yes' : 'partial'}, states expanded: ${selectedPlan.statesExpanded}).`;

    return {
      agentName: this.name,
      utilityScore: selectedPlan.totals.totalUtilityScore,
      formulaDescription:
        'Combines deterministic safety rules (hard constraints), ExpiryPrioritizer utility rankings, and A* multi-step waste-minimization search.',
      scoreBreakdown: priorityAgent.scoreBreakdown,
      result: {
        selectedPlan,
        topPriorities: priorityAgent.result.slice(0, 6),
        triggeredRules: ruleCheck.evaluations,
        arbitrationSummary,
      },
    };
  }
}
