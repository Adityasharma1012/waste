import type {
  AgentResult,
  DietaryPreference,
  HouseholdProfile,
  InventoryItem,
  LeftoverIdea,
  MealPlanSlot,
  Recipe,
  RecommendationBundle,
  ScoreComponent,
  ScoredRecipe,
  StorageTip,
  UtilityWeights,
} from '../types';
import { DEFAULT_UTILITY_WEIGHTS } from '../types';
import { estimateItemImpact, round2 } from '../impact/calculator';
import { RECIPE_CATALOG } from '../planner/recipesCatalog';
import { evaluateRulesForInventory } from '../rules/engine';
import { getDaysUntilExpiry, todayISODate } from '../utils/dates';

const CATEGORY_STORAGE_TIPS: Record<
  InventoryItem['category'],
  { tip: string; canFreeze: boolean; sourceName: string; url: string }
> = {
  produce: {
    tip: 'Keep leafy greens dry in a breathable bag lined with a paper towel; wash only right before eating or cooking.',
    canFreeze: true,
    sourceName: 'U.S. EPA — Preventing Wasted Food at Home',
    url: 'https://www.epa.gov/recycle/reducing-wasted-food-home',
  },
  dairy: {
    tip: 'Store milk and yogurt on middle fridge shelves (<= 40°F / 4°C), not in the warmer fridge door.',
    canFreeze: true,
    sourceName: 'FoodSafety.gov — Cold Food Storage Charts',
    url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
  },
  meat_poultry: {
    tip: 'Keep raw meat/poultry on the bottom shelf in a sealed tray to prevent drips, or freeze in meal-sized portions before the Use-By date.',
    canFreeze: true,
    sourceName: 'USDA FSIS — Freezing and Food Safety',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety',
  },
  seafood: {
    tip: 'Use fresh seafood within 1–2 days in the coldest part of the fridge, or wrap airtight and freeze at 0°F (-18°C).',
    canFreeze: true,
    sourceName: 'FoodSafety.gov — Cold Food Storage Charts',
    url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
  },
  bakery: {
    tip: 'Slice bread before freezing so you can toast single slices straight from frozen without defrosting the whole loaf.',
    canFreeze: true,
    sourceName: 'Love Food Hate Waste / WRAP — Storage & Freezing',
    url: 'https://www.lovefoodhatewaste.com/',
  },
  pantry_grains: {
    tip: 'Keep dry grains, beans, and pasta in airtight jars in a cool, dark cabinet away from stove heat.',
    canFreeze: false,
    sourceName: 'USDA FoodKeeper / FoodSafety.gov',
    url: 'https://www.foodsafety.gov/keep-food-safe/foodkeeper-app',
  },
  leftovers: {
    tip: 'Divide hot leftovers into shallow containers for rapid cooling, eat within 3–4 days, or freeze clearly labeled with today’s date.',
    canFreeze: true,
    sourceName: 'USDA FSIS — Leftovers and Food Safety',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
  },
  beverages: {
    tip: 'Refrigerate opened juices and plant milks promptly and consume within manufacturer opened-window guidelines.',
    canFreeze: false,
    sourceName: 'USDA FoodKeeper / FoodSafety.gov',
    url: 'https://www.foodsafety.gov/keep-food-safe/foodkeeper-app',
  },
  frozen: {
    tip: 'Keep freezer at 0°F (-18°C) or below; label bags with item name and freeze date for best quality rotation.',
    canFreeze: true,
    sourceName: 'USDA FSIS — Freezing and Food Safety',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety',
  },
  other: {
    tip: 'Keep cool, dry, or chilled per package label and rotate older dates to the front.',
    canFreeze: false,
    sourceName: 'USDA FSIS — Food Product Dating',
    url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating',
  },
};

function matchesIngredient(itemName: string, ingredientKeyword: string): boolean {
  const lowerItem = itemName.toLowerCase();
  const lowerKw = ingredientKeyword.toLowerCase();
  return lowerItem.includes(lowerKw) || lowerKw.includes(lowerItem);
}

function isDietCompatible(recipe: Recipe, prefs: DietaryPreference[]): boolean {
  const strictPrefs = prefs.filter((p) => p !== 'omnivore');
  if (strictPrefs.length === 0) return true;
  return strictPrefs.every((pref) => recipe.dietaryTags.includes(pref));
}

export class RecipePlanner {
  readonly name = 'RecipePlanner';

  scoreRecipes(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
    referenceDate: string = todayISODate()
  ): AgentResult<ScoredRecipe[]> {
    const { safetyBlockedItemIds } = evaluateRulesForInventory(items, referenceDate);
    const usableItems = items.filter((item) => !safetyBlockedItemIds.has(item.id));

    const weightSum = Math.max(
      0.01,
      weights.urgency +
        weights.wastePrevented +
        weights.costSavings +
        weights.timeEffort +
        weights.preferenceFit
    );

    const scored: ScoredRecipe[] = [];

    for (const recipe of RECIPE_CATALOG) {
      if (!isDietCompatible(recipe, profile.dietaryPreferences)) {
        continue;
      }

      const matchedItems: InventoryItem[] = [];
      for (const item of usableItems) {
        if (recipe.ingredients.some((kw) => matchesIngredient(item.name, kw))) {
          matchedItems.push(item);
        }
      }

      if (matchedItems.length === 0) {
        continue;
      }

      let urgentMatchCount = 0;
      let urgencySum = 0;
      let kgSaved = 0;
      let moneySaved = 0;
      let co2eSaved = 0;

      for (const item of matchedItems) {
        const days = getDaysUntilExpiry(item, referenceDate);
        if (days <= 3 && item.storageLocation !== 'freezer') {
          urgentMatchCount += 1;
        }
        const itemUrgency =
          days <= 0 ? 100 : days <= 3 ? 85 : days <= 7 ? 45 : 20;
        urgencySum += itemUrgency;

        const impact = estimateItemImpact(item);
        // Estimate fraction of item used in one recipe
        const portionFactor = Math.min(1, Math.max(0.35, profile.householdSize / 3));
        kgSaved += impact.weightKg * portionFactor;
        moneySaved += impact.estimatedMoneyUsd * portionFactor;
        co2eSaved += impact.estimatedCo2eKg * portionFactor;
      }

      const avgUrgencyRaw = round2(urgencySum / matchedItems.length);
      const wasteRaw = Math.min(100, round2(kgSaved * 55 + co2eSaved * 8));
      const costRaw = Math.min(100, round2(moneySaved * 9));

      const timeDiff = recipe.prepAndCookMinutes - profile.availableCookingMinutes;
      const timeRaw =
        timeDiff <= 0
          ? Math.min(100, 75 + Math.round((Math.abs(timeDiff) / Math.max(10, profile.availableCookingMinutes)) * 25))
          : Math.max(15, 70 - timeDiff * 2.5);

      const multiMatchBonus = Math.min(100, matchedItems.length * 30 + (recipe.servings >= profile.householdSize ? 15 : 0));

      const scoreBreakdown: ScoreComponent[] = [
        {
          factor: 'urgency',
          rawValue: avgUrgencyRaw,
          weight: weights.urgency,
          weightedContribution: round2(avgUrgencyRaw * weights.urgency),
          note: `${urgentMatchCount} urgent item(s) rescued.`,
        },
        {
          factor: 'wastePrevented',
          rawValue: wasteRaw,
          weight: weights.wastePrevented,
          weightedContribution: round2(wasteRaw * weights.wastePrevented),
          note: `~${round2(kgSaved)} kg / ~${round2(co2eSaved)} kg CO2e saved`,
        },
        {
          factor: 'costSavings',
          rawValue: costRaw,
          weight: weights.costSavings,
          weightedContribution: round2(costRaw * weights.costSavings),
          note: `~$${round2(moneySaved)} grocery value used`,
        },
        {
          factor: 'timeEffort',
          rawValue: round2(timeRaw),
          weight: weights.timeEffort,
          weightedContribution: round2(timeRaw * weights.timeEffort),
          note: `${recipe.prepAndCookMinutes} min vs ${profile.availableCookingMinutes} min budget`,
        },
        {
          factor: 'preferenceFit',
          rawValue: multiMatchBonus,
          weight: weights.preferenceFit,
          weightedContribution: round2(multiMatchBonus * weights.preferenceFit),
          note: `Matches ${matchedItems.length} pantry/fridge item(s) & dietary settings`,
        },
      ];

      const utilityScore = round2(
        scoreBreakdown.reduce((acc, s) => acc + s.weightedContribution, 0) / weightSum
      );

      scored.push({
        recipe,
        matchedItemIds: matchedItems.map((m) => m.id),
        matchedItemNames: matchedItems.map((m) => m.name),
        urgentMatchCount,
        utilityScore,
        estimatedKgSaved: round2(kgSaved),
        estimatedMoneySavedUsd: round2(moneySaved),
        estimatedCo2eSavedKg: round2(co2eSaved),
        scoreBreakdown,
        fitSummary: `Uses ${matchedItems.map((m) => m.name).join(', ')} (${recipe.prepAndCookMinutes} min)`,
      });
    }

    scored.sort((a, b) => b.utilityScore - a.utilityScore);

    return {
      agentName: this.name,
      utilityScore: scored[0]?.utilityScore ?? 0,
      formulaDescription:
        'Weighted utility across matched ingredient urgency, weight/CO2e rescued, grocery value used, cooking-time fit, and multi-item household fit.',
      scoreBreakdown: scored[0]?.scoreBreakdown ?? [],
      result: scored,
    };
  }

  recommendBundle(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights = DEFAULT_UTILITY_WEIGHTS,
    referenceDate: string = todayISODate()
  ): AgentResult<RecommendationBundle> {
    const recipeAgent = this.scoreRecipes(items, profile, weights, referenceDate);
    const { safetyBlockedItemIds } = evaluateRulesForInventory(items, referenceDate);
    const safeItems = items.filter((item) => !safetyBlockedItemIds.has(item.id));

    const freezingTips: StorageTip[] = [];
    const storageTips: StorageTip[] = [];
    const seenCategories = new Set<string>();

    for (const item of safeItems) {
      const days = getDaysUntilExpiry(item, referenceDate);
      const catTip = CATEGORY_STORAGE_TIPS[item.category];
      if (days <= 3 && item.storageLocation !== 'freezer' && catTip.canFreeze) {
        freezingTips.push({
          id: `freeze-${item.id}`,
          itemId: item.id,
          itemName: item.name,
          tip: `Freeze ${item.name} in airtight portions at 0°F (-18°C) before ${item.expiryDate} to pause spoilage.`,
          canFreeze: true,
          sourceRef: { sourceName: catTip.sourceName, url: catTip.url },
        });
      }
      if (!seenCategories.has(item.category)) {
        seenCategories.add(item.category);
        storageTips.push({
          id: `storage-${item.category}`,
          itemId: item.id,
          itemName: item.name,
          tip: catTip.tip,
          canFreeze: catTip.canFreeze,
          sourceRef: { sourceName: catTip.sourceName, url: catTip.url },
        });
      }
    }

    const mealPlan: MealPlanSlot[] = [];
    const topRecipes = recipeAgent.result.slice(0, 3);
    if (topRecipes[0]) {
      mealPlan.push({
        dayLabel: 'Today',
        mealType: 'Dinner',
        title: topRecipes[0].recipe.title,
        usesItemNames: topRecipes[0].matchedItemNames,
        minutes: topRecipes[0].recipe.prepAndCookMinutes,
      });
    }
    if (topRecipes[1]) {
      mealPlan.push({
        dayLabel: 'Tomorrow',
        mealType: 'Lunch',
        title: topRecipes[1].recipe.title,
        usesItemNames: topRecipes[1].matchedItemNames,
        minutes: topRecipes[1].recipe.prepAndCookMinutes,
      });
    }
    if (topRecipes[2]) {
      mealPlan.push({
        dayLabel: 'Day 3',
        mealType: 'Dinner',
        title: topRecipes[2].recipe.title,
        usesItemNames: topRecipes[2].matchedItemNames,
        minutes: topRecipes[2].recipe.prepAndCookMinutes,
      });
    }

    const leftoverItems = safeItems.filter(
      (i) => i.status === 'cooked' || i.category === 'leftovers'
    );
    const leftoverIdeas: LeftoverIdea[] = leftoverItems.map((item) => ({
      id: `leftover-${item.id}`,
      title: `Remix ${item.name}`,
      usesItemNames: [item.name],
      idea: `Turn ${item.name} into a quick skillet hash, wrap, or grain bowl with crisp greens.`,
      safetyNote:
        'Keep refrigerated leftovers at <= 40°F (4°C), use within 3–4 days, and reheat to 165°F (74°C).',
    }));

    if (leftoverIdeas.length === 0) {
      for (const r of recipeAgent.result.filter((sr) => sr.recipe.isLeftoverRemix).slice(0, 2)) {
        leftoverIdeas.push({
          id: `remix-${r.recipe.id}`,
          title: r.recipe.title,
          usesItemNames: r.matchedItemNames,
          idea: r.recipe.description,
          safetyNote: r.recipe.storageTip,
        });
      }
    }

    return {
      agentName: this.name,
      utilityScore: recipeAgent.utilityScore,
      formulaDescription: recipeAgent.formulaDescription,
      scoreBreakdown: recipeAgent.scoreBreakdown,
      result: {
        recipes: recipeAgent.result,
        freezingTips: freezingTips.slice(0, 5),
        storageTips: storageTips.slice(0, 5),
        mealPlan,
        leftoverIdeas,
      },
    };
  }
}
