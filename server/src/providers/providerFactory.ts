import type { ServerEnv } from '../config/env';
import { AnthropicProvider } from './AnthropicProvider';
import { GeminiProvider } from './GeminiProvider';
import { OfflineMockProvider } from './OfflineMockProvider';
import { OpenAIProvider } from './OpenAIProvider';
import type { LLMProvider } from './types';

export interface ProviderRegistry {
  active: LLMProvider;
  allStatuses: Array<{
    name: string;
    model: string;
    configured: boolean;
    active: boolean;
  }>;
}

export function createProviderRegistry(env: ServerEnv): ProviderRegistry {
  const anthropic = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  const openai = new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  const gemini = new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  const mock = new OfflineMockProvider();

  let active: LLMProvider = mock;
  if (env.LLM_PROVIDER === 'anthropic' && anthropic.isConfigured()) {
    active = anthropic;
  } else if (env.LLM_PROVIDER === 'openai' && openai.isConfigured()) {
    active = openai;
  } else if (env.LLM_PROVIDER === 'gemini' && gemini.isConfigured()) {
    active = gemini;
  } else if (env.LLM_PROVIDER === 'auto') {
    if (anthropic.isConfigured()) active = anthropic;
    else if (openai.isConfigured()) active = openai;
    else if (gemini.isConfigured()) active = gemini;
    else active = mock;
  }

  return {
    active,
    allStatuses: [
      {
        name: anthropic.name,
        model: anthropic.model,
        configured: anthropic.isConfigured(),
        active: active.name === anthropic.name,
      },
      {
        name: openai.name,
        model: openai.model,
        configured: openai.isConfigured(),
        active: active.name === openai.name,
      },
      {
        name: gemini.name,
        model: gemini.model,
        configured: gemini.isConfigured(),
        active: active.name === gemini.name,
      },
      {
        name: mock.name,
        model: mock.model,
        configured: true,
        active: active.name === mock.name,
      },
    ],
  };
}
