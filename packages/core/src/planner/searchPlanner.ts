import type {
  ActionPlan,
  HouseholdProfile,
  InventoryItem,
  PlannerAction,
  PlannerState,
  RejectedAlternative,
  ScoredRecipe,
  UtilityWeights,
} from '../types';
import { DEFAULT_UTILITY_WEIGHTS } from '../types';
import { estimateItemImpact, round2 } from '../impact/calculator';
import { evaluateRulesForInventory } from '../rules/engine';
import { getDaysUntilExpiry, todayISODate } from '../utils/dates';
import { RecipePlanner } from '../agents/RecipePlanner';

const FREEZABLE_CATEGORIES = new Set<InventoryItem['category']>([
  'meat_poultry',
  'seafood',
  'bakery',
  'produce',
  'leftovers',
  'dairy',
]);

function isGoalState(state: PlannerState): boolean {
  return state.remainingAtRiskIds.length === 0;
}

/**
 * Admissible lower-bound heuristic h(state):
 * Every remaining at-risk item incurs at least MIN_ITEM_STEP_COST to resolve.
 */
const MIN_ITEM_STEP_COST = 5;

function heuristicCost(state: PlannerState): number {
  return state.remainingAtRiskIds.length * MIN_ITEM_STEP_COST;
}

function stateSignature(state: PlannerState): string {
  return state.remainingAtRiskIds.join('|');
}

function generateCandidateActions(
  state: PlannerState,
  itemsById: Map<string, InventoryItem>,
  safetyBlockedIds: Set<string>,
  scoredRecipes: ScoredRecipe[],
  profile: HouseholdProfile,
  weights: UtilityWeights,
  referenceDate: string
): PlannerAction[] {
  const remainingSet = new Set(state.remainingAtRiskIds);

  // 1. Safety-critical discards MUST be resolved first before cooking/freezing anything else
  const safetyActions: PlannerAction[] = [];
  for (const id of state.remainingAtRiskIds) {
    if (safetyBlockedIds.has(id)) {
      const item = itemsById.get(id)!;
      safetyActions.push({
        id: `discard-${item.id}`,
        type: 'DISCARD_UNSAFE',
        title: `Safely discard ${item.name}`,
        targetItemIds: [item.id],
        targetItemNames: [item.name],
        estimatedMinutes: 2,
        estimatedKgSaved: 0,
        estimatedMoneySavedUsd: 0,
        estimatedCo2eSavedKg: 0,
        utilityGain: 98,
        stepCost: 5,
        rationale:
          'Blocked by food safety rule (expired Use-By, >4 day cooked leftover, or temperature doubt). Never judge safety by smell/appearance — when in doubt, throw it out.',
        safetyWarning: 'Do not eat, taste, or freeze this item.',
      });
    }
  }
  if (safetyActions.length > 0) {
    return safetyActions;
  }

  const candidates: PlannerAction[] = [];

  // 2. Cook recipe actions covering >=1 remaining at-risk items
  for (const sr of scoredRecipes) {
    const coveredIds = sr.matchedItemIds.filter((id) => remainingSet.has(id));
    if (coveredIds.length === 0) continue;

    const coveredItems = coveredIds.map((id) => itemsById.get(id)!).filter(Boolean);
    const totalKg = coveredItems.reduce((acc, it) => acc + estimateItemImpact(it).weightKg, 0);
    const totalMoney = coveredItems.reduce(
      (acc, it) => acc + estimateItemImpact(it).estimatedMoneyUsd,
      0
    );
    const totalCo2e = coveredItems.reduce(
      (acc, it) => acc + estimateItemImpact(it).estimatedCo2eKg,
      0
    );

    const timeFitBonus =
      sr.recipe.prepAndCookMinutes <= Math.max(15, state.remainingMinutes) ? 12 : -18;
    const synergyBonus = coveredIds.length > 1 ? coveredIds.length * 14 : 0;
    const perItemUtility = Math.min(
      95,
      Math.max(25, sr.utilityScore + synergyBonus / coveredIds.length + timeFitBonus)
    );
    const utilityGain = round2(perItemUtility * coveredIds.length);
    const stepCost = Math.max(
      coveredIds.length * MIN_ITEM_STEP_COST,
      round2(coveredIds.length * 100 - utilityGain + sr.recipe.prepAndCookMinutes * 0.25)
    );

    candidates.push({
      id: `cook-${sr.recipe.id}-${coveredIds.join('_')}`,
      type: 'COOK_RECIPE',
      title: `Cook "${sr.recipe.title}"`,
      targetItemIds: coveredIds,
      targetItemNames: coveredItems.map((i) => i.name),
      recipeId: sr.recipe.id,
      estimatedMinutes: sr.recipe.prepAndCookMinutes,
      estimatedKgSaved: round2(totalKg),
      estimatedMoneySavedUsd: round2(totalMoney),
      estimatedCo2eSavedKg: round2(totalCo2e),
      utilityGain,
      stepCost,
      rationale: `Rescues ${coveredItems.map((i) => i.name).join(' + ')} together in ${sr.recipe.prepAndCookMinutes} min (est. ~${round2(totalKg)} kg / ~$${round2(totalMoney)} / ~${round2(totalCo2e)} kg CO2e saved).`,
    });
  }

  // 3. Single-item actions for the highest-urgency remaining items (keep branching bounded & deterministic)
  const focusIds = state.remainingAtRiskIds.slice(0, 6);
  for (const id of focusIds) {
    const item = itemsById.get(id);
    if (!item) continue;
    const impact = estimateItemImpact(item);
    const days = getDaysUntilExpiry(item, referenceDate);

    // EAT_LEFTOVERS for cooked items / leftovers
    if (item.status === 'cooked' || item.category === 'leftovers') {
      const u = round2(78 + (weights.timeEffort * 20) + (days <= 0 ? 10 : 0));
      candidates.push({
        id: `leftover-${item.id}`,
        type: 'EAT_LEFTOVERS',
        title: `Reheat & eat ${item.name}`,
        targetItemIds: [item.id],
        targetItemNames: [item.name],
        estimatedMinutes: 8,
        estimatedKgSaved: impact.weightKg,
        estimatedMoneySavedUsd: impact.estimatedMoneyUsd,
        estimatedCo2eSavedKg: impact.estimatedCo2eKg,
        utilityGain: u,
        stepCost: Math.max(MIN_ITEM_STEP_COST, round2(100 - u + 2)),
        rationale: `Quick 8-minute meal using refrigerated leftovers before the 3–4 day safety window closes.`,
        safetyWarning: 'Reheat thoroughly to 165°F (74°C).',
      });
    }

    // FREEZE_ITEM for freezable non-frozen items with days >= 0
    if (
      item.storageLocation !== 'freezer' &&
      days >= 0 &&
      FREEZABLE_CATEGORIES.has(item.category)
    ) {
      const freezeUtility = round2(
        66 + weights.wastePrevented * 22 + (days === 0 ? 8 : 0) - (item.category === 'produce' ? 4 : 0)
      );
      candidates.push({
        id: `freeze-${item.id}`,
        type: 'FREEZE_ITEM',
        title: `Portion & freeze ${item.name}`,
        targetItemIds: [item.id],
        targetItemNames: [item.name],
        estimatedMinutes: 4,
        estimatedKgSaved: impact.weightKg,
        estimatedMoneySavedUsd: impact.estimatedMoneyUsd,
        estimatedCo2eSavedKg: impact.estimatedCo2eKg,
        utilityGain: freezeUtility,
        stepCost: Math.max(MIN_ITEM_STEP_COST, round2(100 - freezeUtility + 3)),
        rationale: `Takes ~4 minutes to wrap airtight and freeze at 0°F (-18°C), pausing microbial growth and rescuing ~${impact.weightKg} kg.`,
      });
    }

    // STORE_PRESERVE fallback (eat fresh / move to fridge / check best-before quality)
    const preserveUtility = round2(
      56 + weights.timeEffort * 15 + (item.dateType === 'best_before' ? 8 : 0)
    );
    candidates.push({
      id: `preserve-${item.id}`,
      type: 'STORE_PRESERVE',
      title:
        item.dateType === 'best_before' && days < 0
          ? `Inspect & rotate best-before item: ${item.name}`
          : `Eat or properly chill ${item.name}`,
      targetItemIds: [item.id],
      targetItemNames: [item.name],
      estimatedMinutes: 3,
      estimatedKgSaved: impact.weightKg,
      estimatedMoneySavedUsd: impact.estimatedMoneyUsd,
      estimatedCo2eSavedKg: impact.estimatedCo2eKg,
      utilityGain: preserveUtility,
      stepCost: Math.max(MIN_ITEM_STEP_COST, round2(100 - preserveUtility + 4)),
      rationale:
        item.dateType === 'best_before'
          ? '"Best before" reflects peak quality rather than a strict safety date for intact shelf-stable goods; move to front of shelf to use first.'
          : 'Prioritize as an immediate snack/side or verify storage at <= 40°F (4°C).',
      safetyWarning:
        item.dateType === 'best_before'
          ? 'Discard if packaging is damaged, mold is present, or you have any doubt.'
          : undefined,
    });
  }

  return candidates.sort((a, b) => a.stepCost - b.stepCost);
}

function transitionState(state: PlannerState, action: PlannerAction): PlannerState {
  const targetSet = new Set(action.targetItemIds);
  return {
    remainingAtRiskIds: state.remainingAtRiskIds.filter((id) => !targetSet.has(id)),
    addressedItemIds: [...state.addressedItemIds, ...action.targetItemIds],
    frozenItemIds:
      action.type === 'FREEZE_ITEM'
        ? [...state.frozenItemIds, ...action.targetItemIds]
        : state.frozenItemIds,
    discardedItemIds:
      action.type === 'DISCARD_UNSAFE'
        ? [...state.discardedItemIds, ...action.targetItemIds]
        : state.discardedItemIds,
    remainingMinutes: Math.max(0, state.remainingMinutes - action.estimatedMinutes),
    totalUtility: round2(state.totalUtility + action.utilityGain),
    totalCost: round2(state.totalCost + action.stepCost),
    totalKgSaved: round2(state.totalKgSaved + action.estimatedKgSaved),
    totalMoneySavedUsd: round2(state.totalMoneySavedUsd + action.estimatedMoneySavedUsd),
    totalCo2eSavedKg: round2(state.totalCo2eSavedKg + action.estimatedCo2eSavedKg),
  };
}

interface SearchNode {
  state: PlannerState;
  path: PlannerAction[];
  alternativesByStep: Array<{
    stepNumber: number;
    chosen: PlannerAction;
    siblings: PlannerAction[];
  }>;
  g: number;
  f: number;
}

function explainRejection(chosen: PlannerAction, alt: PlannerAction): string {
  if (chosen.targetItemIds.length > alt.targetItemIds.length) {
    return `Lower utility (${alt.utilityGain} vs ${chosen.utilityGain}): "${chosen.title}" resolves ${chosen.targetItemIds.length} at-risk items together in one step.`;
  }
  if (alt.type === 'FREEZE_ITEM' && chosen.type === 'COOK_RECIPE') {
    return `Lower utility (${alt.utilityGain} vs ${chosen.utilityGain}): cooking now preserves peak texture and pairs multiple ingredients instead of occupying freezer space.`;
  }
  if (alt.estimatedMinutes > chosen.estimatedMinutes && alt.utilityGain <= chosen.utilityGain) {
    return `Requires more time (${alt.estimatedMinutes} min vs ${chosen.estimatedMinutes} min) with lower net utility (${alt.utilityGain} vs ${chosen.utilityGain}).`;
  }
  return `Lower weighted utility (${alt.utilityGain} vs ${chosen.utilityGain}) under your current household weights.`;
}

export function planUseSoonActions(
  items: InventoryItem[],
  profile: HouseholdProfile,
  weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
  referenceDate: string = todayISODate()
): ActionPlan {
  const startMs = Date.now();
  const { safetyBlockedItemIds } = evaluateRulesForInventory(items, referenceDate);

  // Identify at-risk items: <= 3 days, expired, safety-blocked, or fridge leftovers
  const atRiskItems = items.filter((item) => {
    const days = getDaysUntilExpiry(item, referenceDate);
    if (safetyBlockedItemIds.has(item.id)) return true;
    if (item.storageLocation === 'freezer' && days >= 0) return false;
    return days <= 3 || item.status === 'cooked' || item.category === 'leftovers';
  });

  // Sort deterministically by safety-block then earliest expiry
  atRiskItems.sort((a, b) => {
    const sa = safetyBlockedItemIds.has(a.id) ? 0 : 1;
    const sb = safetyBlockedItemIds.has(b.id) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return getDaysUntilExpiry(a, referenceDate) - getDaysUntilExpiry(b, referenceDate);
  });

  // Cap search horizon at top 10 at-risk items for responsive interactive speed
  const boundedAtRisk = atRiskItems.slice(0, 10);
  const itemsById = new Map(boundedAtRisk.map((i) => [i.id, i]));

  const recipePlanner = new RecipePlanner();
  const scoredRecipes = recipePlanner.scoreRecipes(
    boundedAtRisk,
    profile,
    weights,
    referenceDate
  ).result;

  const initialState: PlannerState = {
    remainingAtRiskIds: boundedAtRisk.map((i) => i.id),
    addressedItemIds: [],
    frozenItemIds: [],
    discardedItemIds: [],
    remainingMinutes: Math.max(25, profile.availableCookingMinutes * 2),
    totalUtility: 0,
    totalCost: 0,
    totalKgSaved: 0,
    totalMoneySavedUsd: 0,
    totalCo2eSavedKg: 0,
  };

  if (isGoalState(initialState)) {
    return {
      generatedAt: new Date().toISOString(),
      algorithm: 'A*',
      goalSatisfied: true,
      statesExpanded: 1,
      searchTimeMs: Math.max(1, Date.now() - startMs),
      steps: [],
      rejectedAlternatives: [],
      plainLanguageExplanation:
        'All items are currently in the Safe window (>3 days) with no food safety alerts. Keep rotating older items forward.',
      totals: {
        itemsAddressed: 0,
        minutesRequired: 0,
        estimatedKgSaved: 0,
        estimatedMoneySavedUsd: 0,
        estimatedCo2eSavedKg: 0,
        totalUtilityScore: 0,
      },
    };
  }

  const openSet: SearchNode[] = [
    {
      state: initialState,
      path: [],
      alternativesByStep: [],
      g: 0,
      f: heuristicCost(initialState),
    },
  ];
  const bestCostBySig = new Map<string, number>([[stateSignature(initialState), 0]]);

  let statesExpanded = 0;
  const MAX_EXPANSIONS = 350;
  let bestNode: SearchNode = openSet[0];
  let goalNode: SearchNode | null = null;

  while (openSet.length > 0 && statesExpanded < MAX_EXPANSIONS) {
    // Pop lowest f = g + h (A*)
    openSet.sort((a, b) => a.f - b.f || b.state.totalUtility - a.state.totalUtility);
    const current = openSet.shift()!;
    statesExpanded += 1;

    if (current.state.addressedItemIds.length > bestNode.state.addressedItemIds.length) {
      bestNode = current;
    }

    if (isGoalState(current.state)) {
      goalNode = current;
      break;
    }

    const actions = generateCandidateActions(
      current.state,
      itemsById,
      safetyBlockedIdsSafe(safetyBlockedItemIds),
      scoredRecipes,
      profile,
      weights,
      referenceDate
    );

    const topBranches = actions.slice(0, 6);
    for (const action of topBranches) {
      const nextState = transitionState(current.state, action);
      const sig = stateSignature(nextState);
      const nextG = current.g + action.stepCost;

      const prevBest = bestCostBySig.get(sig);
      if (prevBest !== undefined && prevBest <= nextG) {
        continue;
      }
      bestCostBySig.set(sig, nextG);

      const siblings = topBranches.filter((a) => a.id !== action.id).slice(0, 2);
      openSet.push({
        state: nextState,
        path: [...current.path, action],
        alternativesByStep: [
          ...current.alternativesByStep,
          {
            stepNumber: current.path.length + 1,
            chosen: action,
            siblings,
          },
        ],
        g: nextG,
        f: nextG + heuristicCost(nextState),
      });
    }
  }

  const finalNode = goalNode ?? bestNode;
  const rejectedAlternatives: RejectedAlternative[] = [];
  for (const stepInfo of finalNode.alternativesByStep) {
    for (const sib of stepInfo.siblings) {
      rejectedAlternatives.push({
        stepNumber: stepInfo.stepNumber,
        actionTitle: sib.title,
        actionType: sib.type,
        utilityScore: sib.utilityGain,
        chosenActionTitle: stepInfo.chosen.title,
        chosenUtilityScore: stepInfo.chosen.utilityGain,
        reasonRejected: explainRejection(stepInfo.chosen, sib),
      });
    }
  }

  const minutesRequired = finalNode.path.reduce((acc, s) => acc + s.estimatedMinutes, 0);
  const discardCount = finalNode.path.filter((s) => s.type === 'DISCARD_UNSAFE').length;
  const cookCount = finalNode.path.filter((s) => s.type === 'COOK_RECIPE').length;
  const freezeCount = finalNode.path.filter((s) => s.type === 'FREEZE_ITEM').length;

  const plainLanguageExplanation =
    `A* search evaluated ${statesExpanded} state(s) to address ${finalNode.state.addressedItemIds.length} at-risk item(s) within ~${minutesRequired} minutes. ` +
    (discardCount > 0
      ? `First, ${discardCount} unsafe item(s) were flagged for disposal ("when in doubt, throw it out"). `
      : '') +
    `The plan prioritizes ${cookCount} multi-ingredient recipe(s) and ${freezeCount} freezing action(s) to maximize rescued food (~${finalNode.state.totalKgSaved} kg est.), money (~$${finalNode.state.totalMoneySavedUsd} est.), and avoided emissions (~${finalNode.state.totalCo2eSavedKg} kg CO2e est.).`;

  return {
    generatedAt: new Date().toISOString(),
    algorithm: 'A*',
    goalSatisfied: goalNode !== null,
    statesExpanded,
    searchTimeMs: Math.max(1, Date.now() - startMs),
    steps: finalNode.path,
    rejectedAlternatives: rejectedAlternatives.slice(0, 6),
    plainLanguageExplanation,
    totals: {
      itemsAddressed: finalNode.state.addressedItemIds.length,
      minutesRequired,
      estimatedKgSaved: finalNode.state.totalKgSaved,
      estimatedMoneySavedUsd: finalNode.state.totalMoneySavedUsd,
      estimatedCo2eSavedKg: finalNode.state.totalCo2eSavedKg,
      totalUtilityScore: finalNode.state.totalUtility,
    },
  };
}

function safetyBlockedIdsSafe(s: Set<string>): Set<string> {
  return s;
}
