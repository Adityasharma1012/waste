import type { InventoryItem, RuleDefinition, RuleEvaluation } from '../types';
import { todayISODate } from '../utils/dates';
import { FOOD_RULES, PERMANENT_FOOD_SAFETY_BANNER } from './rules';

const SEVERITY_RANK: Record<RuleEvaluation['severity'], number> = {
  safety: 0,
  urgent: 1,
  preservation: 2,
  quality: 3,
};

export function listRuleDefinitions(): RuleDefinition[] {
  return FOOD_RULES.map(({ matches: _matches, ...def }) => def);
}

export function evaluateRulesForItem(
  item: InventoryItem,
  referenceDate: string = todayISODate()
): RuleEvaluation[] {
  const evaluations: RuleEvaluation[] = [];

  for (const rule of FOOD_RULES) {
    const matchedCondition = rule.matches(item, referenceDate);
    if (matchedCondition) {
      evaluations.push({
        ruleId: rule.id,
        title: rule.title,
        severity: rule.severity,
        itemId: item.id,
        itemName: item.name,
        conditionMatched: matchedCondition,
        actionType: rule.actionType,
        actionRecommended: rule.actionSummary,
        rationale: rule.rationale,
        safetyNote: rule.safetyNote,
        sourceRef: rule.sourceRef,
      });
    }
  }

  return evaluations.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function evaluateRulesForInventory(
  items: InventoryItem[],
  referenceDate: string = todayISODate()
): {
  evaluations: RuleEvaluation[];
  safetyBlockedItemIds: Set<string>;
  safetyBanner: string;
} {
  const evaluations: RuleEvaluation[] = [];
  const safetyBlockedItemIds = new Set<string>();

  for (const item of items) {
    const itemRules = evaluateRulesForItem(item, referenceDate);
    for (const rule of itemRules) {
      evaluations.push(rule);
      if (rule.actionType === 'discard_unsafe') {
        safetyBlockedItemIds.add(item.id);
      }
    }
  }

  evaluations.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return {
    evaluations,
    safetyBlockedItemIds,
    safetyBanner: PERMANENT_FOOD_SAFETY_BANNER,
  };
}
