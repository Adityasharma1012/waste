export interface ModelTokenPricing {
  inputUsdPer1M: number;
  outputUsdPer1M: number;
}

/**
 * Configurable estimated pricing table (USD per 1M tokens).
 * Used strictly for sustainable-AI cost awareness logging.
 */
export const MODEL_PRICE_TABLE_USD_PER_1M: Record<string, ModelTokenPricing> = {
  'claude-sonnet-4-20250514': { inputUsdPer1M: 3.0, outputUsdPer1M: 15.0 },
  'claude-3-5-haiku-latest': { inputUsdPer1M: 0.8, outputUsdPer1M: 4.0 },
  'gpt-4o-mini': { inputUsdPer1M: 0.15, outputUsdPer1M: 0.6 },
  'gpt-4o': { inputUsdPer1M: 2.5, outputUsdPer1M: 10.0 },
  'gemini-3.5-flash-lite': { inputUsdPer1M: 0.1, outputUsdPer1M: 0.4 },
  'gemini-3.8-flash': { inputUsdPer1M: 0.25, outputUsdPer1M: 1.5 },
  'deterministic-rag-synthesizer': { inputUsdPer1M: 0, outputUsdPer1M: 0 },
  'rules-engine': { inputUsdPer1M: 0, outputUsdPer1M: 0 },
};

export function estimateTokenCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = MODEL_PRICE_TABLE_USD_PER_1M[model] ?? {
    inputUsdPer1M: 1.0,
    outputUsdPer1M: 3.0,
  };
  const cost =
    (Math.max(0, inputTokens) / 1_000_000) * rate.inputUsdPer1M +
    (Math.max(0, outputTokens) / 1_000_000) * rate.outputUsdPer1M;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
