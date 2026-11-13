import {
  evaluateRulesForInventory,
  type HouseholdProfile,
  type InventoryItem,
  type KnowledgeCitation,
  type ResolutionTier,
} from '@wasteless/core';
import { ResponseCache } from '../cache/responseCache';
import { MetricsStore } from '../metrics/metricsStore';
import { estimateTokenCostUsd } from '../metrics/pricing';
import type { LLMProvider } from '../providers/types';
import { RagService } from '../rag/ragService';

export interface AdviceOutput {
  answer: string;
  resolutionTier: ResolutionTier;
  provider: string;
  cacheHit: boolean;
  ruleHandled: boolean;
  citations: KnowledgeCitation[];
  noMatchFound: boolean;
  responseTimeMs: number;
  estimatedCostUsd: number;
}

export class AssistantOrchestrator {
  private readonly rag: RagService;
  private readonly cache: ResponseCache<Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'>>;
  private readonly metrics: MetricsStore;
  private readonly provider: LLMProvider;

  constructor(deps: {
    rag: RagService;
    cache: ResponseCache<Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'>>;
    metrics: MetricsStore;
    provider: LLMProvider;
  }) {
    this.rag = deps.rag;
    this.cache = deps.cache;
    this.metrics = deps.metrics;
    this.provider = deps.provider;
  }

  private tryAnswerWithInventoryRules(
    question: string,
    items: InventoryItem[]
  ): {
    answer: string;
    citations: KnowledgeCitation[];
  } | null {
    const q = question.toLowerCase();
    const { evaluations } = evaluateRulesForInventory(items);
    if (evaluations.length === 0) return null;

    // 1. Direct question referencing specific item in user's inventory
    const matchedByItem = evaluations.filter((ev) =>
      q.includes(ev.itemName.toLowerCase()) ||
      ev.itemName
        .toLowerCase()
        .split(/\s+/)
        .some((w) => w.length >= 4 && q.includes(w))
    );

    const asksInventoryStatus =
      q.includes('my pantry') ||
      q.includes('my fridge') ||
      q.includes('throw out') ||
      q.includes('discard') ||
      q.includes('expire today') ||
      q.includes('expiring');

    if (matchedByItem.length > 0 && !q.includes('temperature') && !q.includes('difference')) {
      const top = matchedByItem[0];
      const lines = matchedByItem
        .slice(0, 3)
        .map(
          (e) =>
            `• [${e.ruleId}] ${e.itemName}: ${e.actionRecommended} — ${e.rationale} (${e.safetyNote})`
        );
      return {
        answer: `Answered directly by WasteLess Rules Engine for your inventory:\n\n${lines.join('\n')}`,
        citations: [
          {
            id: top.ruleId,
            title: top.title,
            sourceName: top.sourceRef.sourceName,
            url: top.sourceRef.url,
            retrievalDate: '2026-11-12',
            snippet: top.rationale,
          },
        ],
      };
    }

    if (asksInventoryStatus) {
      const safetyList = evaluations.filter((e) => e.severity === 'safety');
      const urgentList = evaluations.filter((e) => e.severity !== 'safety');
      const combined = [...safetyList, ...urgentList].slice(0, 5);
      const lines = combined.map(
        (e) => `• [${e.ruleId}] ${e.itemName}: ${e.actionRecommended}`
      );
      return {
        answer: `Inventory Rules Summary (${evaluations.length} triggered):\n\n${lines.join('\n')}\n\nSafety reminder: Never judge perishable food safe by smell or appearance alone — when in doubt, throw it out.`,
        citations: combined.slice(0, 2).map((e) => ({
          id: e.ruleId,
          title: e.title,
          sourceName: e.sourceRef.sourceName,
          url: e.sourceRef.url,
          retrievalDate: '2026-11-12',
          snippet: e.rationale,
        })),
      };
    }

    return null;
  }

  private isFoodDomainQuery(question: string, items: InventoryItem[]): boolean {
    const q = question.toLowerCase();
    if (
      items.some(
        (it) =>
          q.includes(it.name.toLowerCase()) ||
          it.name
            .toLowerCase()
            .split(/\s+/)
            .some((w) => w.length >= 4 && q.includes(w))
      )
    ) {
      return true;
    }

    const foodKeywords = [
      'food', 'foods', 'store', 'stored', 'storing', 'storage', 'keep', 'keeping', 'fresh',
      'fridge', 'refrigerator', 'freezer', 'freeze', 'freezing', 'frozen', 'thaw', 'thawing',
      'defrost', 'pantry', 'cook', 'cooked', 'cooking', 'reheat', 'leftover', 'leftovers',
      'expire', 'expired', 'expiring', 'expiry', 'best before', 'use by', 'spoil', 'spoiled',
      'mold', 'mould', 'smell', 'safe', 'safety', 'eat', 'meal', 'meals', 'recipe', 'recipes',
      'waste', 'shelf life', 'container', 'airtight', 'cake', 'cakes', 'bread', 'pastry',
      'bakery', 'paneer', 'milk', 'dairy', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'eggs',
      'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'rice', 'pasta', 'grain', 'grains',
      'lentil', 'lentils', 'dal', 'vegetable', 'vegetables', 'veggies', 'fruit', 'fruits',
      'produce', 'spinach', 'tomato', 'tomatoes', 'potato', 'potatoes', 'onion', 'onions',
      'banana', 'bananas', 'apple', 'apples', 'berry', 'berries', 'herb', 'herbs', 'avocado',
      'avocados', 'oil', 'sauce', 'soup', 'curry', 'salad', 'dough', 'batter', 'icing', 'frosting',
    ];
    const pattern = new RegExp(`\\b(${foodKeywords.join('|')})\\b`, 'i');
    return pattern.test(q);
  }

  async answerAdvice(
    question: string,
    items: InventoryItem[],
    profile: HouseholdProfile
  ): Promise<AdviceOutput> {
    const started = Date.now();
    const normalizedQ = question.trim().toLowerCase().replace(/\s+/g, ' ');

    // Tier 1: Rules Engine first (zero LLM cost, deterministic)
    const ruleAnswer = this.tryAnswerWithInventoryRules(normalizedQ, items);
    if (ruleAnswer) {
      const latency = Math.max(1, Date.now() - started);
      this.metrics.record({
        endpoint: '/api/advice',
        resolutionTier: 'rules',
        provider: 'rules-engine',
        responseTimeMs: latency,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        cacheHit: false,
        ruleHandled: true,
        ragSourceCount: ruleAnswer.citations.length,
      });
      return {
        answer: ruleAnswer.answer,
        resolutionTier: 'rules',
        provider: 'rules-engine',
        cacheHit: false,
        ruleHandled: true,
        citations: ruleAnswer.citations,
        noMatchFound: false,
        responseTimeMs: latency,
        estimatedCostUsd: 0,
      };
    }

    // Tier 2: Canonical Cache check
    const cacheKey = ResponseCache.makeKey('advice', {
      q: normalizedQ,
      provider: this.provider.name,
      diet: profile.dietaryPreferences,
      itemDigest: items.map((i) => `${i.id}:${i.expiryDate}:${i.storageLocation}:${i.status}`),
    });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const latency = Math.max(1, Date.now() - started);
      this.metrics.record({
        endpoint: '/api/advice',
        resolutionTier: 'cache',
        provider: cached.provider,
        responseTimeMs: latency,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        cacheHit: true,
        ruleHandled: false,
        ragSourceCount: cached.citations.length,
      });
      return {
        ...cached,
        resolutionTier: 'cache',
        cacheHit: true,
        responseTimeMs: latency,
        estimatedCostUsd: 0,
      };
    }

    // Tier 3: BM25 RAG retrieval over verified passages only
    const ragRes = this.rag.retrieve(question, 3);
    if (ragRes.noMatchFound) {
      // If a real LLM API is configured AND the query is food/storage/waste related,
      // allow the configured LLM API to answer using conservative food-safety principles
      // while transparently marking noMatchFound = true (no local RAG citation matched).
      if (this.provider.isConfigured() && this.isFoodDomainQuery(question, items)) {
        try {
          const fallbackPrompt = [
            'You are WasteLess AI, a household food-safety and food-waste reduction assistant.',
            'No exact passage in the local WasteLess knowledge base matched this query, so answer helpfully using established food-safety and storage best practices (e.g., fridge <=40°F / 4°C, freezer <=0°F / -18°C, Two-Hour Rule for perishables, airtight containers, slicing/portioning before freezing).',
            'Start with one brief note that this is general AI guidance (no exact local RAG passage matched), do NOT fabricate specific URLs or claim a local passage citation, never declare perishable food safe by smell or appearance alone, and for uncertain cases say: "When in doubt, throw it out."',
          ].join(' ');

          const llmRes = await this.provider.generate({
            systemPrompt: fallbackPrompt,
            userPrompt: `Household context: size ${profile.householdSize}, diet ${profile.dietaryPreferences.join(', ')}.\nQuestion: ${question}`,
            citations: [],
          });

          const estimatedCostUsd = estimateTokenCostUsd(
            llmRes.model,
            llmRes.usage.inputTokens,
            llmRes.usage.outputTokens
          );
          const latency = Math.max(1, Date.now() - started);
          const output: Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'> = {
            answer: llmRes.text,
            resolutionTier: 'rag_llm',
            provider: llmRes.provider,
            ruleHandled: false,
            citations: [],
            noMatchFound: true,
            estimatedCostUsd,
          };

          this.cache.set(cacheKey, output);
          this.metrics.record({
            endpoint: '/api/advice',
            resolutionTier: 'rag_llm',
            provider: llmRes.provider,
            responseTimeMs: latency,
            inputTokens: llmRes.usage.inputTokens,
            outputTokens: llmRes.usage.outputTokens,
            totalTokens: llmRes.usage.totalTokens,
            estimatedCostUsd,
            cacheHit: false,
            ruleHandled: false,
            ragSourceCount: 0,
          });

          return {
            ...output,
            cacheHit: false,
            responseTimeMs: latency,
          };
        } catch {
          // Fall through to honest offline message if upstream LLM call fails
        }
      }

      const latency = Math.max(1, Date.now() - started);
      const honestReply: Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'> = {
        answer:
          'No verified guidance passages in the local WasteLess knowledge base matched your question cleanly. Rather than guessing, please consult official USDA FoodKeeper or FoodSafety.gov guidance directly — and remember: when in doubt, throw it out.',
        resolutionTier: 'rag_offline',
        provider: 'rag-honesty-gate',
        ruleHandled: false,
        citations: [],
        noMatchFound: true,
        estimatedCostUsd: 0,
      };
      this.cache.set(cacheKey, honestReply);
      this.metrics.record({
        endpoint: '/api/advice',
        resolutionTier: 'rag_offline',
        provider: 'rag-honesty-gate',
        responseTimeMs: latency,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        cacheHit: false,
        ruleHandled: false,
        ragSourceCount: 0,
      });
      return {
        ...honestReply,
        cacheHit: false,
        responseTimeMs: latency,
      };
    }

    // Grounded synthesis (LLM if configured, else deterministic OfflineMockProvider)
    const passageBlock = ragRes.citations
      .map(
        (c, idx) =>
          `[${idx + 1}] ${c.sourceName} (${c.url}, retrieved ${c.retrievalDate}): ${c.snippet}`
      )
      .join('\n');

    const systemPrompt = [
      'You are WasteLess AI, a food-safety and food-waste reduction assistant.',
      'Prefer and cite the verified passages supplied below whenever they directly answer the question.',
      'If the user asks about a specific food item or storage case not directly covered in the supplied passages, still answer helpfully using conservative food-safety and storage best practices while clearly distinguishing general AI guidance from the cited local sources (never fabricate URLs or passage titles).',
      'NEVER declare perishable food safe from appearance or smell alone.',
      'For uncertain food safety cases, state: "When in doubt, throw it out."',
    ].join(' ');

    const userPrompt = [
      `Household context: size ${profile.householdSize}, diet ${profile.dietaryPreferences.join(', ')}.`,
      `Question: ${question}`,
      '',
      'Verified Knowledge Passages:',
      passageBlock,
    ].join('\n');

    let llmRes;
    let llmFailed = false;
    let tier: ResolutionTier = this.provider.isConfigured() ? 'rag_llm' : 'rag_offline';
    try {
      llmRes = await this.provider.generate({
        systemPrompt,
        userPrompt,
        citations: ragRes.citations,
      });
    } catch {
      // Graceful fallback to RAG snippet synthesis if upstream LLM network fails
      llmFailed = true;
      tier = 'rag_offline';
      llmRes = {
        text: `Upstream LLM unavailable; grounded directly from verified passages:\n\n${ragRes.citations
          .map((c) => `• ${c.snippet} (${c.sourceName})`)
          .join('\n')}\n\nSafety Reminder: When in doubt, throw it out.`,
        model: 'deterministic-rag-synthesizer',
        provider: 'rag-fallback',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        latencyMs: 1,
      };
    }

    const estimatedCostUsd = estimateTokenCostUsd(
      llmRes.model,
      llmRes.usage.inputTokens,
      llmRes.usage.outputTokens
    );
    const latency = Math.max(1, Date.now() - started);

    const output: Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'> = {
      answer: llmRes.text,
      resolutionTier: tier,
      provider: llmRes.provider,
      ruleHandled: false,
      citations: ragRes.citations,
      noMatchFound: false,
      estimatedCostUsd,
    };

    if (!llmFailed) {
      this.cache.set(cacheKey, output);
    }
    this.metrics.record({
      endpoint: '/api/advice',
      resolutionTier: tier,
      provider: llmRes.provider,
      responseTimeMs: latency,
      inputTokens: llmRes.usage.inputTokens,
      outputTokens: llmRes.usage.outputTokens,
      totalTokens: llmRes.usage.totalTokens,
      estimatedCostUsd,
      cacheHit: false,
      ruleHandled: false,
      ragSourceCount: ragRes.citations.length,
    });

    return {
      ...output,
      cacheHit: false,
      responseTimeMs: latency,
    };
  }
}
