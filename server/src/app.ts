import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  ActionSelector,
  DEFAULT_UTILITY_WEIGHTS,
  RecipePlanner,
  type HouseholdProfile,
  type InventoryItem,
  type UtilityWeights,
} from '@wasteless/core';
import { loadServerEnv, type ServerEnv } from './config/env';
import { ResponseCache } from './cache/responseCache';
import { MetricsStore } from './metrics/metricsStore';
import { createProviderRegistry } from './providers/providerFactory';
import { RagService } from './rag/ragService';
import { AssistantOrchestrator, type AdviceOutput } from './orchestrator/assistantOrchestrator';

const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: z.enum([
    'produce',
    'dairy',
    'meat_poultry',
    'seafood',
    'bakery',
    'pantry_grains',
    'leftovers',
    'beverages',
    'frozen',
    'other',
  ]),
  quantity: z.number().nonnegative(),
  unit: z.enum(['g', 'kg', 'ml', 'L', 'pcs', 'servings', 'oz', 'lb']),
  purchaseDate: z.string(),
  dateType: z.enum(['use_by', 'best_before']),
  expiryDate: z.string(),
  storageLocation: z.enum(['fridge', 'freezer', 'pantry']),
  status: z.enum(['sealed', 'opened', 'cooked']),
  notes: z.string().optional(),
  estimatedValueUsd: z.number().optional(),
  createdAt: z.string().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().optional().default(() => new Date().toISOString()),
});

const ProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  dietaryPreferences: z.array(
    z.enum([
      'omnivore',
      'vegetarian',
      'vegan',
      'dairy_free',
      'gluten_free',
      'nut_free',
      'halal',
      'kosher',
      'pescatarian',
    ])
  ),
  budgetLevel: z.enum(['tight', 'moderate', 'flexible']),
  weeklyBudgetUsd: z.number().nonnegative(),
  availableCookingMinutes: z.number().int().min(5).max(300),
  sustainabilityGoal: z.enum(['minimize_waste', 'cut_emissions', 'save_money', 'balanced']),
  onboardingCompleted: z.boolean().default(true),
});

const WeightsSchema = z
  .object({
    urgency: z.number().min(0).max(1),
    wastePrevented: z.number().min(0).max(1),
    costSavings: z.number().min(0).max(1),
    timeEffort: z.number().min(0).max(1),
    preferenceFit: z.number().min(0).max(1),
  })
  .default(DEFAULT_UTILITY_WEIGHTS);

const PlanRequestSchema = z.object({
  items: z.array(InventoryItemSchema),
  profile: ProfileSchema,
  weights: WeightsSchema.optional(),
});

const AdviceRequestSchema = z.object({
  question: z.string().min(2).max(600),
  items: z.array(InventoryItemSchema).default([]),
  profile: ProfileSchema,
});

export interface AppDependencies {
  env?: ServerEnv;
  knowledgePath?: string;
}

export async function buildServerApp(deps: AppDependencies = {}): Promise<FastifyInstance> {
  const env = deps.env ?? loadServerEnv();
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  });

  const rag = new RagService(env.RAG_MIN_SCORE, deps.knowledgePath);
  const providers = createProviderRegistry(env);
  const metrics = new MetricsStore();
  const adviceCache = new ResponseCache<Omit<AdviceOutput, 'cacheHit' | 'responseTimeMs'>>(
    env.CACHE_TTL_SECONDS
  );
  const planCache = new ResponseCache<ReturnType<ActionSelector['select']>['result']>(
    env.CACHE_TTL_SECONDS
  );
  const orchestrator = new AssistantOrchestrator({
    rag,
    cache: adviceCache,
    metrics,
    provider: providers.active,
  });

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      activeProvider: providers.active.name,
      activeModel: providers.active.model,
      providerConfigured: providers.active.isConfigured(),
      availableProviders: providers.allStatuses.map((p) => p.name),
      knowledgeCount: rag.verifiedPassages.length,
    };
  });

  app.get('/api/providers', async () => {
    return {
      activeProvider: providers.active.name,
      providers: providers.allStatuses,
    };
  });

  app.get('/api/knowledge', async () => {
    return {
      verifiedCount: rag.verifiedPassages.length,
      excludedPlaceholderCount: rag.excludedPlaceholderCount,
      sources: rag.listAllVerifiedSources(),
    };
  });

  app.get('/api/metrics', async () => {
    return metrics.getSummary();
  });

  app.post('/api/plan', async (request, reply) => {
    const parsed = PlanRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid plan payload',
        issues: parsed.error.issues,
      });
    }

    const started = Date.now();
    const items = parsed.data.items as InventoryItem[];
    const profile = parsed.data.profile as HouseholdProfile;
    const weights = (parsed.data.weights ?? DEFAULT_UTILITY_WEIGHTS) as UtilityWeights;

    const cacheKey = ResponseCache.makeKey('plan', { items, profile, weights });
    const cached = planCache.get(cacheKey);
    if (cached) {
      const latency = Math.max(1, Date.now() - started);
      metrics.record({
        endpoint: '/api/plan',
        resolutionTier: 'cache',
        provider: 'rules-engine',
        responseTimeMs: latency,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        cacheHit: true,
        ruleHandled: true,
        ragSourceCount: 0,
      });
      return {
        selection: cached,
        resolutionTier: 'cache' as const,
        responseTimeMs: latency,
      };
    }

    const selector = new ActionSelector();
    const selection = selector.select(items, profile, weights).result;
    planCache.set(cacheKey, selection);
    const latency = Math.max(1, Date.now() - started);

    metrics.record({
      endpoint: '/api/plan',
      resolutionTier: 'rules',
      provider: 'rules-engine+A*',
      responseTimeMs: latency,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      cacheHit: false,
      ruleHandled: true,
      ragSourceCount: 0,
    });

    return {
      selection,
      resolutionTier: 'rules' as const,
      responseTimeMs: latency,
    };
  });

  app.post('/api/recipes/recommend', async (request, reply) => {
    const parsed = PlanRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid recipes payload',
        issues: parsed.error.issues,
      });
    }

    const started = Date.now();
    const items = parsed.data.items as InventoryItem[];
    const profile = parsed.data.profile as HouseholdProfile;
    const weights = (parsed.data.weights ?? DEFAULT_UTILITY_WEIGHTS) as UtilityWeights;

    const planner = new RecipePlanner();
    const bundle = planner.recommendBundle(items, profile, weights).result;
    const ragStorage = rag.retrieve('freezing storage leftovers produce', 2);
    const latency = Math.max(1, Date.now() - started);

    metrics.record({
      endpoint: '/api/recipes/recommend',
      resolutionTier: 'rules',
      provider: 'recipe-planner',
      responseTimeMs: latency,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      cacheHit: false,
      ruleHandled: true,
      ragSourceCount: ragStorage.citations.length,
    });

    return {
      bundle,
      resolutionTier: 'rules' as const,
      citations: ragStorage.citations,
      responseTimeMs: latency,
    };
  });

  app.post('/api/advice', async (request, reply) => {
    const parsed = AdviceRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid advice request',
        issues: parsed.error.issues,
      });
    }

    const result = await orchestrator.answerAdvice(
      parsed.data.question,
      parsed.data.items as InventoryItem[],
      parsed.data.profile as HouseholdProfile
    );
    return result;
  });

  return app;
}
