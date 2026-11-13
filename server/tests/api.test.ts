import { describe, expect, it } from 'vitest';
import { createDemoInventory, createDemoProfile } from '@wasteless/core';
import { buildServerApp } from '../src/app';
import { ResponseCache } from '../src/cache/responseCache';
import { loadServerEnv } from '../src/config/env';
import { MetricsStore } from '../src/metrics/metricsStore';
import { AssistantOrchestrator } from '../src/orchestrator/assistantOrchestrator';
import type { LLMProvider } from '../src/providers/types';
import { RagService } from '../src/rag/ragService';

describe('WasteLess API Server (Fastify + Orchestrator + Metrics)', () => {
  it('serves health, providers, and verified knowledge endpoints', async () => {
    const app = await buildServerApp({
      env: loadServerEnv({ LLM_PROVIDER: 'mock', ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GEMINI_API_KEY: '' }),
    });

    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe('ok');
    expect(health.json().knowledgeCount).toBeGreaterThanOrEqual(10);

    const kb = await app.inject({ method: 'GET', url: '/api/knowledge' });
    expect(kb.statusCode).toBe(200);
    expect(kb.json().excludedPlaceholderCount).toBe(1);

    await app.close();
  });

  it('prefers rules then cache for /api/plan and /api/advice and tracks sustainable AI metrics', async () => {
    const app = await buildServerApp({
      env: loadServerEnv({ LLM_PROVIDER: 'mock', ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GEMINI_API_KEY: '' }),
    });
    const items = createDemoInventory('2026-11-12');
    const profile = createDemoProfile();

    // 1. First /api/plan -> rules
    const plan1 = await app.inject({
      method: 'POST',
      url: '/api/plan',
      payload: { items, profile },
    });
    expect(plan1.statusCode).toBe(200);
    expect(plan1.json().resolutionTier).toBe('rules');
    expect(plan1.json().selection.selectedPlan.steps.length).toBeGreaterThan(0);

    // 2. Second identical /api/plan -> cache
    const plan2 = await app.inject({
      method: 'POST',
      url: '/api/plan',
      payload: { items, profile },
    });
    expect(plan2.statusCode).toBe(200);
    expect(plan2.json().resolutionTier).toBe('cache');

    // 3. Direct inventory advice -> rules tier
    const advRules = await app.inject({
      method: 'POST',
      url: '/api/advice',
      payload: {
        question: 'What should I throw out in my fridge?',
        items,
        profile,
      },
    });
    expect(advRules.statusCode).toBe(200);
    expect(advRules.json().resolutionTier).toBe('rules');
    expect(advRules.json().ruleHandled).toBe(true);

    // 4. General RAG query -> rag_offline with real citations, then repeat -> cache
    const advRag1 = await app.inject({
      method: 'POST',
      url: '/api/advice',
      payload: {
        question: 'Can I freeze food before the Use-By date and how should I thaw it?',
        items,
        profile,
      },
    });
    expect(advRag1.statusCode).toBe(200);
    expect(advRag1.json().noMatchFound).toBe(false);
    expect(advRag1.json().citations.length).toBeGreaterThan(0);

    const advRag2 = await app.inject({
      method: 'POST',
      url: '/api/advice',
      payload: {
        question: 'Can I freeze food before the Use-By date and how should I thaw it?',
        items,
        profile,
      },
    });
    expect(advRag2.statusCode).toBe(200);
    expect(advRag2.json().resolutionTier).toBe('cache');
    expect(advRag2.json().cacheHit).toBe(true);

    // 5. Unmatched query -> noMatchFound = true
    const advNoMatch = await app.inject({
      method: 'POST',
      url: '/api/advice',
      payload: {
        question: 'What is the voltage of an electric car battery?',
        items,
        profile,
      },
    });
    expect(advNoMatch.statusCode).toBe(200);
    expect(advNoMatch.json().noMatchFound).toBe(true);
    expect(advNoMatch.json().citations).toEqual([]);

    // 6. Sustainable metrics summary
    const metricsRes = await app.inject({ method: 'GET', url: '/api/metrics' });
    expect(metricsRes.statusCode).toBe(200);
    const metrics = metricsRes.json();
    expect(metrics.totalRequests).toBe(6);
    expect(metrics.cacheHitsCount).toBe(2);
    expect(metrics.rulesHandledCount).toBe(2);
    expect(metrics.withoutLlmPercent).toBe(100);

    await app.close();
  });

  it('uses configured LLM for unindexed food queries while refusing non-food queries', async () => {
    const fakeProvider: LLMProvider = {
      name: 'fake-configured-llm',
      model: 'gpt-4o-mini',
      isConfigured: () => true,
      async generate(req) {
        return {
          text: `General AI guidance for: ${req.userPrompt}`,
          model: 'gpt-4o-mini',
          provider: 'fake-configured-llm',
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          latencyMs: 12,
        };
      },
    };

    const orchestrator = new AssistantOrchestrator({
      rag: new RagService(0.65),
      cache: new ResponseCache(300),
      metrics: new MetricsStore(),
      provider: fakeProvider,
    });
    const profile = createDemoProfile();

    const foodRes = await orchestrator.answerAdvice(
      'How can I keep cut avocado from browning in the fridge?',
      [],
      profile
    );
    expect(foodRes.resolutionTier).toBe('rag_llm');
    expect(foodRes.provider).toBe('fake-configured-llm');
    expect(foodRes.answer).toContain('General AI guidance');

    const offTopicRes = await orchestrator.answerAdvice(
      'What is the voltage of an electric car battery?',
      [],
      profile
    );
    expect(offTopicRes.resolutionTier).toBe('rag_offline');
    expect(offTopicRes.provider).toBe('rag-honesty-gate');
    expect(offTopicRes.noMatchFound).toBe(true);
  });
});
