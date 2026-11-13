import {
  ActionSelector,
  evaluateRulesForInventory,
  RecipePlanner,
  type ActionSelection,
  type HouseholdProfile,
  type InventoryItem,
  type KnowledgeCitation,
  type RecommendationBundle,
  type ResolutionTier,
  type SustainableMetricsSummary,
  type UtilityWeights,
} from '@wasteless/core';

export interface BackendHealth {
  reachable: boolean;
  providerName: string;
  providerConfigured: boolean;
  availableProviders: string[];
  knowledgeCount: number;
  error?: string;
}

export interface AdviceResponse {
  answer: string;
  resolutionTier: ResolutionTier;
  provider: string;
  cacheHit: boolean;
  ruleHandled: boolean;
  citations: KnowledgeCitation[];
  noMatchFound: boolean;
  responseTimeMs: number;
  estimatedCostUsd: number;
  fromOfflineFallback?: boolean;
}

export interface PlanApiResponse {
  selection: ActionSelection;
  resolutionTier: ResolutionTier;
  responseTimeMs: number;
  fromOfflineFallback?: boolean;
}

export interface RecipesApiResponse {
  bundle: RecommendationBundle;
  resolutionTier: ResolutionTier;
  citations: KnowledgeCitation[];
  responseTimeMs: number;
  fromOfflineFallback?: boolean;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4500
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class WasteLessApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  async checkHealth(): Promise<BackendHealth> {
    try {
      const data = await fetchJsonWithTimeout<{
        status: string;
        activeProvider: string;
        providerConfigured: boolean;
        availableProviders: string[];
        knowledgeCount: number;
      }>(`${this.baseUrl}/api/health`, { method: 'GET' }, 2500);
      return {
        reachable: true,
        providerName: data.activeProvider,
        providerConfigured: data.providerConfigured,
        availableProviders: data.availableProviders,
        knowledgeCount: data.knowledgeCount,
      };
    } catch (err) {
      return {
        reachable: false,
        providerName: 'offline-rules',
        providerConfigured: false,
        availableProviders: [],
        knowledgeCount: 0,
        error: err instanceof Error ? err.message : 'Backend unreachable',
      };
    }
  }

  async getActionPlan(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights
  ): Promise<PlanApiResponse> {
    const started = Date.now();
    try {
      return await fetchJsonWithTimeout<PlanApiResponse>(`${this.baseUrl}/api/plan`, {
        method: 'POST',
        body: JSON.stringify({ items, profile, weights }),
      });
    } catch {
      const selector = new ActionSelector();
      const selection = selector.select(items, profile, weights).result;
      return {
        selection,
        resolutionTier: 'rules',
        responseTimeMs: Math.max(1, Date.now() - started),
        fromOfflineFallback: true,
      };
    }
  }

  async getRecommendations(
    items: InventoryItem[],
    profile: HouseholdProfile,
    weights: UtilityWeights
  ): Promise<RecipesApiResponse> {
    const started = Date.now();
    try {
      return await fetchJsonWithTimeout<RecipesApiResponse>(`${this.baseUrl}/api/recipes/recommend`, {
        method: 'POST',
        body: JSON.stringify({ items, profile, weights }),
      });
    } catch {
      const planner = new RecipePlanner();
      const bundle = planner.recommendBundle(items, profile, weights).result;
      return {
        bundle,
        resolutionTier: 'rules',
        citations: [],
        responseTimeMs: Math.max(1, Date.now() - started),
        fromOfflineFallback: true,
      };
    }
  }

  async askAdvice(
    question: string,
    items: InventoryItem[],
    profile: HouseholdProfile
  ): Promise<AdviceResponse> {
    const started = Date.now();
    try {
      return await fetchJsonWithTimeout<AdviceResponse>(`${this.baseUrl}/api/advice`, {
        method: 'POST',
        body: JSON.stringify({ question, items, profile }),
      }, 25000);
    } catch {
      // Deterministic offline rules fallback
      const rulesRes = evaluateRulesForInventory(items);
      const qLower = question.toLowerCase();
      const matchingRule = rulesRes.evaluations.find(
        (r) =>
          qLower.includes(r.itemName.toLowerCase()) ||
          qLower.includes(r.actionType.replace('_', ' ')) ||
          (qLower.includes('leftover') && r.ruleId.includes('002')) ||
          (qLower.includes('freeze') && r.actionType === 'freeze_now')
      );

      if (matchingRule) {
        return {
          answer: `[Offline Rules Fallback — Backend Unreachable]\n\n${matchingRule.itemName}: ${matchingRule.actionRecommended}\n\nReason (${matchingRule.ruleId}): ${matchingRule.rationale}\n\nSafety: ${matchingRule.safetyNote}`,
          resolutionTier: 'rules',
          provider: 'offline-rules',
          cacheHit: false,
          ruleHandled: true,
          citations: [
            {
              id: matchingRule.ruleId,
              title: matchingRule.title,
              sourceName: matchingRule.sourceRef.sourceName,
              url: matchingRule.sourceRef.url,
              retrievalDate: '2026-11-12',
              snippet: matchingRule.rationale,
            },
          ],
          noMatchFound: false,
          responseTimeMs: Math.max(1, Date.now() - started),
          estimatedCostUsd: 0,
          fromOfflineFallback: true,
        };
      }

      return {
        answer:
          'Backend server is currently unreachable, so full RAG passage search is offline. Core inventory rules reminder: "Use by" is a safety deadline and "Best before" is a quality guide. Never rely on smell or appearance alone — when in doubt, throw it out.',
        resolutionTier: 'rules',
        provider: 'offline-rules',
        cacheHit: false,
        ruleHandled: true,
        citations: [],
        noMatchFound: true,
        responseTimeMs: Math.max(1, Date.now() - started),
        estimatedCostUsd: 0,
        fromOfflineFallback: true,
      };
    }
  }

  async getMetrics(): Promise<SustainableMetricsSummary | null> {
    try {
      return await fetchJsonWithTimeout<SustainableMetricsSummary>(
        `${this.baseUrl}/api/metrics`,
        { method: 'GET' },
        2500
      );
    } catch {
      return null;
    }
  }

  async getKnowledgeSources(): Promise<{
    verifiedCount: number;
    excludedPlaceholderCount: number;
    sources: KnowledgeCitation[];
  } | null> {
    try {
      return await fetchJsonWithTimeout(`${this.baseUrl}/api/knowledge`, { method: 'GET' }, 2500);
    } catch {
      return null;
    }
  }
}
