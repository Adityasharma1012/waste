import type { ResolutionTier, SustainableMetricsSummary } from '@wasteless/core';

export interface RequestMetricLog {
  requestId: string;
  timestamp: string;
  endpoint: string;
  resolutionTier: ResolutionTier;
  provider: string;
  responseTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  cacheHit: boolean;
  ruleHandled: boolean;
  ragSourceCount: number;
}

export class MetricsStore {
  private readonly logs: RequestMetricLog[] = [];
  private readonly maxLogs = 200;

  record(entry: Omit<RequestMetricLog, 'requestId' | 'timestamp'>): RequestMetricLog {
    const record: RequestMetricLog = {
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(record);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    return record;
  }

  getSummary(): SustainableMetricsSummary {
    const total = this.logs.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        rulesHandledCount: 0,
        cacheHitsCount: 0,
        ragLlmCount: 0,
        ragOfflineCount: 0,
        withoutLlmPercent: 100,
        cacheHitPercent: 0,
        avgResponseTimeMs: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalEstimatedCostUsd: 0,
        recentLogs: [],
      };
    }

    let rulesHandledCount = 0;
    let cacheHitsCount = 0;
    let ragLlmCount = 0;
    let ragOfflineCount = 0;
    let totalLatency = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalEstimatedCostUsd = 0;

    for (const log of this.logs) {
      if (log.resolutionTier === 'rules') rulesHandledCount += 1;
      else if (log.resolutionTier === 'cache') cacheHitsCount += 1;
      else if (log.resolutionTier === 'rag_llm') ragLlmCount += 1;
      else if (log.resolutionTier === 'rag_offline') ragOfflineCount += 1;

      totalLatency += log.responseTimeMs;
      totalInputTokens += log.inputTokens;
      totalOutputTokens += log.outputTokens;
      totalEstimatedCostUsd += log.estimatedCostUsd;
    }

    const withoutLlm = total - ragLlmCount;
    return {
      totalRequests: total,
      rulesHandledCount,
      cacheHitsCount,
      ragLlmCount,
      ragOfflineCount,
      withoutLlmPercent: Math.round((withoutLlm / total) * 1000) / 10,
      cacheHitPercent: Math.round((cacheHitsCount / total) * 1000) / 10,
      avgResponseTimeMs: Math.round(totalLatency / total),
      totalInputTokens,
      totalOutputTokens,
      totalEstimatedCostUsd: Math.round(totalEstimatedCostUsd * 1_000_000) / 1_000_000,
      recentLogs: this.logs.slice(0, 20).map((l) => ({
        requestId: l.requestId,
        timestamp: l.timestamp,
        endpoint: l.endpoint,
        resolutionTier: l.resolutionTier,
        provider: l.provider,
        responseTimeMs: l.responseTimeMs,
        totalTokens: l.totalTokens,
        estimatedCostUsd: l.estimatedCostUsd,
        cacheHit: l.cacheHit,
        ruleHandled: l.ruleHandled,
        ragSourceCount: l.ragSourceCount,
      })),
    };
  }

  reset(): void {
    this.logs.length = 0;
  }
}
