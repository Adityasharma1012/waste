# WasteLess AI — Impact Estimation Methodology

All food weight, grocery dollar savings, and greenhouse gas (`kg CO2e`) figures in WasteLess AI are **estimates** computed from a single configuration module: [`packages/core/src/impact/constants.ts`](../packages/core/src/impact/constants.ts).

## Formulas (Plain Language)

1. **Estimated Weight (kg)**  
   `weightKg = quantity * unitConversionFactor(unit, category)`  
   - Direct mass (`kg`, `g`, `lb`, `oz`) and liquid approximations (`L`, `ml` at 1.0 kg/L) convert deterministically.
   - `pcs` uses category piece averages (e.g., 0.15 kg/piece produce, 0.08 kg/slice-unit bakery, 0.22 kg meat).
   - `servings` uses 0.30 kg per serving.
2. **Estimated Money Saved (USD)**  
   `moneyUsd = userItemValueOverride ?? (weightKg * avgPriceUsdPerKg[category])`
3. **Estimated CO2e Avoided (kg CO2e)**  
   `co2eKg = weightKg * co2eKgPerKg[category]`
4. **Waste Prevention Rate (%)**  
   `savedKg / (savedKg + discardedKg) * 100`

## Documented Category Constants

| Category | kg CO2e / kg | Avg Price (USD / kg) | Primary Basis & Citations |
| --- | ---: | ---: | --- |
| Meat & Poultry | 14.50 | $10.50 | Poore & Nemecek (2018) / OWID blended poultry/beef; BLS retail meat prices |
| Seafood | 13.60 | $16.50 | Poore & Nemecek (2018) / OWID farmed fish (~13.63); BLS/USDA seafood |
| Dairy & Eggs | 6.50 | $5.80 | Poore & Nemecek (2018) / OWID milk/eggs/cheese blend; BLS dairy prices |
| Fresh Produce | 1.60 | $4.20 | Poore & Nemecek (2018) / OWID vegetables/fruit; USDA ERS Fruit & Vegetable Prices |
| Bakery & Bread | 1.57 | $5.20 | Poore & Nemecek (2018) / OWID wheat & rye bread; BLS pan bread prices |
| Pantry & Grains | 2.20 | $3.80 | Poore & Nemecek (2018) / OWID grains/rice/legumes blend; BLS staples |
| Cooked Leftovers | 3.20 | $7.50 | WRAP household edible food waste benchmark (~2.5–3.2 kg CO2e/kg); prepared meal est. |
| Beverages | 1.20 | $2.60 | Poore & Nemecek (2018) / OWID plant milk/juice blend; BLS beverages |
| Frozen Foods | 3.50 | $6.80 | EPA WARM & WRAP cold-chain composite estimate |
| Other Groceries | 2.80 | $5.00 | WRAP UK general household food waste factor (~2.5–3.0 kg CO2e/kg) |

## Primary References

- Poore, J., & Nemecek, T. (2018). *Reducing food's environmental impacts through producers and consumers*, *Science* / Our World in Data: <https://ourworldindata.org/food-choice-vs-eating-local>
- U.S. EPA Waste Reduction Model (WARM): <https://www.epa.gov/warm>
- WRAP Household Food & Drink Waste Research: <https://www.wrap.ngo/>
- U.S. Bureau of Labor Statistics (BLS) Average Retail Food Prices: <https://www.bls.gov/cpi/factsheets/average-prices.htm>
- USDA Economic Research Service (ERS) Fruit and Vegetable Prices: <https://www.ers.usda.gov/data-products/fruit-and-vegetable-prices/>
