import type { CategoryImpactConstant, FoodCategory } from '../types';

export const IMPACT_METHODOLOGY_VERSION = '2026.1';

export const IMPACT_ESTIMATE_DISCLAIMER =
  'All food weight, money, and CO2e savings are estimates derived from category-level retail prices and cradle-to-retail life-cycle emission averages, not exact household measurements.';

/**
 * Single source of truth for household impact estimation constants.
 * Citations:
 * - CO2e/kg: Poore & Nemecek (2018), Science / Our World in Data cradle-to-retail GHG intensities;
 *   WRAP household food waste carbon factor benchmark (~2.5-3.2 kg CO2e/kg mixed food).
 * - Avg retail USD/kg: U.S. Bureau of Labor Statistics (BLS) Average Retail Food Prices &
 *   USDA Economic Research Service (ERS) Fruit & Vegetable Prices, converted to per-kg equivalents.
 */
export const CATEGORY_IMPACT_CONSTANTS: Record<FoodCategory, CategoryImpactConstant> = {
  meat_poultry: {
    category: 'meat_poultry',
    label: 'Meat & Poultry',
    co2eKgPerKg: 14.5,
    avgPriceUsdPerKg: 10.5,
    defaultItemWeightKg: 0.45,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (poultry ~9.9, beef dairy/beef herd ~33-99 kg CO2e/kg); BLS retail meat prices',
  },
  seafood: {
    category: 'seafood',
    label: 'Seafood',
    co2eKgPerKg: 13.6,
    avgPriceUsdPerKg: 16.5,
    defaultItemWeightKg: 0.35,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (farmed fish ~13.6 kg CO2e/kg); USDA/BLS retail seafood estimates',
  },
  dairy: {
    category: 'dairy',
    label: 'Dairy & Eggs',
    co2eKgPerKg: 6.5,
    avgPriceUsdPerKg: 5.8,
    defaultItemWeightKg: 0.5,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (milk ~3.15, eggs ~4.67, cheese ~23.88 kg CO2e/kg weighted blend); BLS dairy/egg prices',
  },
  produce: {
    category: 'produce',
    label: 'Fresh Produce',
    co2eKgPerKg: 1.6,
    avgPriceUsdPerKg: 4.2,
    defaultItemWeightKg: 0.35,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (vegetables/fruits ~0.5-2.1 kg CO2e/kg); USDA ERS Fruit and Vegetable Prices',
  },
  bakery: {
    category: 'bakery',
    label: 'Bakery & Bread',
    co2eKgPerKg: 1.57,
    avgPriceUsdPerKg: 5.2,
    defaultItemWeightKg: 0.45,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (wheat & rye bread ~1.57 kg CO2e/kg); BLS white/wheat pan bread prices',
  },
  pantry_grains: {
    category: 'pantry_grains',
    label: 'Pantry & Grains',
    co2eKgPerKg: 2.2,
    avgPriceUsdPerKg: 3.8,
    defaultItemWeightKg: 0.5,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (grains/rice/legumes blend ~0.9-4.45 kg CO2e/kg); BLS pantry staples',
  },
  leftovers: {
    category: 'leftovers',
    label: 'Cooked Leftovers',
    co2eKgPerKg: 3.2,
    avgPriceUsdPerKg: 7.5,
    defaultItemWeightKg: 0.4,
    sourceCitation:
      'WRAP UK household edible food waste carbon benchmark (~2.5-3.2 kg CO2e/kg mixed meals); USDA prepared-meal equivalent estimate',
  },
  beverages: {
    category: 'beverages',
    label: 'Beverages',
    co2eKgPerKg: 1.2,
    avgPriceUsdPerKg: 2.6,
    defaultItemWeightKg: 0.75,
    sourceCitation:
      'Poore & Nemecek (2018) / Our World in Data (plant milks/juices conservative blend); BLS retail beverage averages',
  },
  frozen: {
    category: 'frozen',
    label: 'Frozen Foods',
    co2eKgPerKg: 3.5,
    avgPriceUsdPerKg: 6.8,
    defaultItemWeightKg: 0.45,
    sourceCitation:
      'EPA WARM & WRAP mixed food waste cold-chain composite factor (~3.5 kg CO2e/kg); retail frozen grocery average',
  },
  other: {
    category: 'other',
    label: 'Other Groceries',
    co2eKgPerKg: 2.8,
    avgPriceUsdPerKg: 5.0,
    defaultItemWeightKg: 0.35,
    sourceCitation:
      'WRAP UK general household food waste factor (~2.5-3.0 kg CO2e/kg); BLS mixed grocery estimate',
  },
};

export const PIECE_WEIGHT_KG_BY_CATEGORY: Record<FoodCategory, number> = {
  meat_poultry: 0.22,
  seafood: 0.18,
  dairy: 0.25,
  produce: 0.15,
  bakery: 0.08,
  pantry_grains: 0.25,
  leftovers: 0.32,
  beverages: 0.33,
  frozen: 0.25,
  other: 0.18,
};

export const SERVING_WEIGHT_KG = 0.3;

export const IMPACT_SOURCES = [
  {
    name: 'Poore & Nemecek (2018) / Our World in Data — Food GHG Emissions',
    url: 'https://ourworldindata.org/food-choice-vs-eating-local',
    usedFor: 'Category cradle-to-retail kg CO2e per kg multipliers',
  },
  {
    name: 'U.S. EPA — Waste Reduction Model (WARM) & From Farm to Kitchen',
    url: 'https://www.epa.gov/warm',
    usedFor: 'Source reduction framing and mixed food category structure',
  },
  {
    name: 'WRAP — Household Food & Drink Waste Research',
    url: 'https://www.wrap.ngo/',
    usedFor: 'Composite household food waste carbon factor benchmark (~2.5-3.2 kg CO2e/kg)',
  },
  {
    name: 'U.S. BLS Average Retail Food Prices & USDA ERS Fruit and Vegetable Prices',
    url: 'https://www.bls.gov/cpi/factsheets/average-prices.htm',
    usedFor: 'Category average retail price per kg estimates (USD)',
  },
];
