import type { InventoryItem, RuleDefinition } from '../types';
import { getDaysSincePurchase, getDaysUntilExpiry } from '../utils/dates';

export const PERMANENT_FOOD_SAFETY_BANNER =
  'Food Safety Note: "Use by" is a safety deadline; "Best before" is a quality guide. Never rely on appearance or smell alone to judge if perishable food is safe — when in doubt, throw it out.';

export interface ExecutableRule extends RuleDefinition {
  matches: (item: InventoryItem, referenceDate: string) => string | null;
}

const DOUBT_KEYWORDS = [
  'power outage',
  'left out',
  'warm',
  'room temp',
  'unsure',
  'doubt',
  'thawed',
  'smells off',
  'slimy',
  'mold',
];

export const FOOD_RULES: ExecutableRule[] = [
  {
    id: 'RULE-SAFETY-004',
    title: 'Temperature Abuse or Doubt Flagged',
    severity: 'safety',
    conditionDescription:
      'Item notes mention power outage, temperature danger zone, thawing uncertainty, or spoilage doubt.',
    actionType: 'discard_unsafe',
    actionSummary: 'Do not consume — when in doubt, throw it out',
    rationale:
      'Bacteria multiply rapidly between 40°F and 140°F (4°C–60°C) and pathogenic bacteria often do not alter taste, smell, or appearance.',
    safetyNote:
      'Never declare food safe from appearance or smell alone. When in doubt, throw it out.',
    sourceRef: {
      sourceName: 'FoodSafety.gov — Food Safety During a Power Outage',
      url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage',
    },
    matches: (item) => {
      const notes = (item.notes ?? '').toLowerCase();
      const matchedKeyword = DOUBT_KEYWORDS.find((kw) => notes.includes(kw));
      return matchedKeyword
        ? `Item notes mention "${matchedKeyword}", indicating potential temperature abuse or safety uncertainty.`
        : null;
    },
  },
  {
    id: 'RULE-SAFETY-001',
    title: 'Expired Use-By Date (Safety Limit)',
    severity: 'safety',
    conditionDescription:
      'Item has a "Use by" safety label, is not frozen, and the expiry date has passed (days < 0).',
    actionType: 'discard_unsafe',
    actionSummary: 'Discard safely — do not eat or freeze past Use-By date',
    rationale:
      '"Use by" dates apply to perishable foods where microbial growth can create foodborne illness risk even when the food looks and smells normal.',
    safetyNote:
      'Do not rely on smell or appearance for expired Use-By items. When in doubt, throw it out.',
    sourceRef: {
      sourceName: 'FoodSafety.gov — Cold Food Storage Charts',
      url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (item.dateType === 'use_by' && days < 0 && item.storageLocation !== 'freezer') {
        return `Use-by date passed ${Math.abs(days)} day(s) ago while stored in ${item.storageLocation}.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-SAFETY-002',
    title: 'Cooked Leftovers Exceeding 4-Day Fridge Limit',
    severity: 'safety',
    conditionDescription:
      'Cooked item or leftovers kept in the refrigerator for more than 4 days since purchase/prep.',
    actionType: 'discard_unsafe',
    actionSummary: 'Discard refrigerated leftovers kept past 4 days',
    rationale:
      'USDA FSIS and FoodSafety.gov advise eating or freezing cooked leftovers within 3 to 4 days in the refrigerator at 40°F (4°C) or below.',
    safetyNote:
      'Pathogenic bacteria do not always cause off-odors or visible mold. When in doubt, throw it out.',
    sourceRef: {
      sourceName: 'USDA FSIS — Leftovers and Food Safety',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
    },
    matches: (item, referenceDate) => {
      const ageDays = getDaysSincePurchase(item, referenceDate);
      if (
        (item.status === 'cooked' || item.category === 'leftovers') &&
        item.storageLocation === 'fridge' &&
        ageDays > 4
      ) {
        return `Cooked/leftover item has been refrigerated for ${ageDays} days (exceeding the 3–4 day window).`;
      }
      return null;
    },
  },
  {
    id: 'RULE-SAFETY-003',
    title: 'Opened High-Risk Perishable Past Safe Window',
    severity: 'safety',
    conditionDescription:
      'Opened meat, poultry, seafood, or dairy in the fridge past its date or opened >= 4 days ago.',
    actionType: 'discard_unsafe',
    actionSummary: 'Discard if unsafe window exceeded — when in doubt, throw it out',
    rationale:
      'Opening vacuum or factory seals exposes perishable proteins and dairy to air and cross-contamination, shortening safe refrigeration time.',
    safetyNote:
      'Never judge opened meat, seafood, or dairy safe by smell or appearance alone. When in doubt, throw it out.',
    sourceRef: {
      sourceName: 'FoodSafety.gov — 4 Steps to Food Safety',
      url: 'https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      const ageDays = getDaysSincePurchase(item, referenceDate);
      const highRisk = ['meat_poultry', 'seafood', 'dairy'].includes(item.category);
      if (
        highRisk &&
        item.status === 'opened' &&
        item.storageLocation === 'fridge' &&
        (days < 0 || ageDays >= 4)
      ) {
        return `Opened ${item.category.replace('_', '/')} item in fridge (days left: ${days}, days since logged: ${ageDays}).`;
      }
      return null;
    },
  },
  {
    id: 'RULE-PRESERVE-003',
    title: 'Perishable Stored in Pantry Instead of Cold Storage',
    severity: 'safety',
    conditionDescription:
      'Meat, poultry, seafood, leftovers, or opened dairy is marked as stored in the pantry.',
    actionType: 'move_storage',
    actionSummary: 'Verify cold chain: chill at <= 40°F (4°C) or discard if unrefrigerated > 2h',
    rationale:
      'Perishable proteins, leftovers, and opened dairy must stay refrigerated at 40°F (4°C) or below; above 40°F for over 2 hours is unsafe.',
    safetyNote:
      'If this item was actually kept at room temperature for more than 2 hours (1 hour above 90°F), throw it out.',
    sourceRef: {
      sourceName: 'FoodSafety.gov — 4 Steps to Food Safety',
      url: 'https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety',
    },
    matches: (item) => {
      const mustChill =
        ['meat_poultry', 'seafood', 'leftovers'].includes(item.category) ||
        (item.category === 'dairy' && item.status !== 'sealed');
      if (mustChill && item.storageLocation === 'pantry') {
        return `Perishable item (${item.category}) is currently assigned to pantry storage.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-URGENT-001',
    title: 'Use-By Item Expires Today',
    severity: 'urgent',
    conditionDescription: 'Non-frozen item with a "Use by" date due today (days === 0).',
    actionType: 'cook_today',
    actionSummary: 'Cook/consume today or freeze immediately before end of day',
    rationale:
      'Using or freezing a food before its Use-By deadline captures full nutritional value and avoids an irreversible safety discard tomorrow.',
    safetyNote:
      'Cook poultry/leftovers to safe internal temperatures (165°F / 74°C) or freeze at 0°F (-18°C) today.',
    sourceRef: {
      sourceName: 'FoodSafety.gov — Cold Food Storage Charts',
      url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (item.dateType === 'use_by' && days === 0 && item.storageLocation !== 'freezer') {
        return `Use-by deadline is today (${item.expiryDate}).`;
      }
      return null;
    },
  },
  {
    id: 'RULE-URGENT-003',
    title: 'Cooked Leftovers Within Safe Window',
    severity: 'urgent',
    conditionDescription:
      'Cooked leftovers in the refrigerator within 4 days of preparation and not past expiry.',
    actionType: 'reheat_safely',
    actionSummary: 'Prioritize as a quick meal within 3–4 days and reheat to 165°F (74°C)',
    rationale:
      'Eating leftovers promptly avoids double waste (ingredients + cooking energy) while remaining inside the USDA 3–4 day refrigeration window.',
    safetyNote:
      'Reheat leftovers thoroughly to 165°F (74°C); bring sauces, soups, and gravies to a rolling boil.',
    sourceRef: {
      sourceName: 'USDA FSIS — Leftovers and Food Safety',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      const ageDays = getDaysSincePurchase(item, referenceDate);
      if (
        (item.status === 'cooked' || item.category === 'leftovers') &&
        item.storageLocation === 'fridge' &&
        ageDays <= 4 &&
        days >= 0
      ) {
        return `Cooked leftovers (${ageDays} day(s) in fridge) are ready for a fast meal or freezer portioning.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-PRESERVE-001',
    title: 'Freeze Perishable Meat, Seafood, or Bakery Before Expiry',
    severity: 'preservation',
    conditionDescription:
      'Uncooked meat, poultry, seafood, or bakery item expiring in 0–3 days and not yet frozen.',
    actionType: 'freeze_now',
    actionSummary: 'Portion, wrap airtight, and freeze at 0°F (-18°C) before date passes',
    rationale:
      'Freezing keeps food safe indefinitely by keeping microbes dormant, giving you weeks or months of extra flexibility when you cannot cook today.',
    safetyNote:
      'Freeze before the Use-By date passes. Thaw later in the refrigerator—not on the counter.',
    sourceRef: {
      sourceName: 'USDA FSIS — Freezing and Food Safety',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (
        days >= 0 &&
        days <= 3 &&
        item.storageLocation !== 'freezer' &&
        item.status !== 'cooked' &&
        ['meat_poultry', 'seafood', 'bakery'].includes(item.category)
      ) {
        return `Non-frozen ${item.category.replace('_', '/')} due in ${days} day(s); freezing preserves both safety and quality.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-PRESERVE-002',
    title: 'Rescue Fresh Produce Before Wilting',
    severity: 'preservation',
    conditionDescription:
      'Fresh produce in fridge or pantry expiring within 0–3 days.',
    actionType: 'cook_today',
    actionSummary: 'Cook in a stir-fry/soup/smoothie or blanch & freeze before spoilage',
    rationale:
      'Fresh produce is one of the highest-volume household waste streams; heat-cooking or freezing converts short-lived produce into versatile ingredients.',
    safetyNote:
      'Rinse produce under running water right before eating or cooking. Discard any slimy or moldy soft produce.',
    sourceRef: {
      sourceName: 'U.S. EPA — Preventing Wasted Food at Home',
      url: 'https://www.epa.gov/recycle/reducing-wasted-food-home',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (
        item.category === 'produce' &&
        item.storageLocation !== 'freezer' &&
        days >= 0 &&
        days <= 3
      ) {
        return `Produce due in ${days} day(s) should be used or prepped for freezing soon.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-URGENT-002',
    title: 'Prioritize High-Impact Perishable (1–3 Days Left)',
    severity: 'urgent',
    conditionDescription:
      'Meat, seafood, or dairy stored in fridge with 1–3 days remaining.',
    actionType: 'plan_meal',
    actionSummary: 'Schedule into tonight’s or tomorrow’s meal plan ("Eat First" shelf)',
    rationale:
      'Animal proteins and dairy carry the highest CO2e footprint and retail dollar cost per kilogram; prioritizing them delivers the largest waste & emissions payoff.',
    safetyNote:
      'Keep refrigerator at 40°F (4°C) or below. When in doubt about storage temperature, throw it out.',
    sourceRef: {
      sourceName: 'USDA FoodKeeper / FoodSafety.gov',
      url: 'https://www.foodsafety.gov/keep-food-safe/foodkeeper-app',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (
        days >= 1 &&
        days <= 3 &&
        item.storageLocation === 'fridge' &&
        ['meat_poultry', 'seafood', 'dairy'].includes(item.category)
      ) {
        return `High-impact ${item.category.replace('_', '/')} expires in ${days} day(s).`;
      }
      return null;
    },
  },
  {
    id: 'RULE-QUALITY-001',
    title: 'Best-Before Date Passed (Quality vs. Safety Distinction)',
    severity: 'quality',
    conditionDescription:
      'Non-cooked shelf-stable, bakery, dairy (sealed), or produce item past a "Best before" quality label.',
    actionType: 'check_quality',
    actionSummary: 'Distinguish quality date from safety; inspect package integrity & freshness carefully',
    rationale:
      'Per USDA FSIS, "Best if Used By / Best Before" indicates peak flavor and quality—not an automatic safety deadline—if stored properly and undamaged.',
    safetyNote:
      'Rules never declare food safe from appearance or smell alone. Discard if packaging is swollen/damaged, mold is visible, or if you have any doubt ("when in doubt, throw it out").',
    sourceRef: {
      sourceName: 'USDA FSIS — Food Product Dating',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (
        item.dateType === 'best_before' &&
        days <= 0 &&
        !['meat_poultry', 'seafood'].includes(item.category) &&
        item.status !== 'cooked'
      ) {
        return `"Best before" date (${item.expiryDate}) passed ${Math.abs(days)} day(s) ago; this is a quality label, not an automatic safety cutoff if stored properly.`;
      }
      return null;
    },
  },
  {
    id: 'RULE-QUALITY-002',
    title: 'Best-Before Date Approaching (1–3 Days)',
    severity: 'quality',
    conditionDescription: 'Item with a "Best before" label due in 1–3 days.',
    actionType: 'plan_meal',
    actionSummary: 'Use soon for peak flavor and texture',
    rationale:
      'Rotating near-date "Best before" items to the front of the pantry or fridge keeps quality high and prevents forgotten accumulation.',
    safetyNote:
      'Best-before tracks quality; always check package seal and follow safe storage temperatures.',
    sourceRef: {
      sourceName: 'USDA FSIS — Food Product Dating',
      url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating',
    },
    matches: (item, referenceDate) => {
      const days = getDaysUntilExpiry(item, referenceDate);
      if (item.dateType === 'best_before' && days >= 1 && days <= 3) {
        return `"Best before" quality window ends in ${days} day(s).`;
      }
      return null;
    },
  },
];
