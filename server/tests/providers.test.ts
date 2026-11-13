import { describe, expect, it } from 'vitest';
import { loadServerEnv } from '../src/config/env';
import { AnthropicProvider } from '../src/providers/AnthropicProvider';
import { GeminiProvider } from '../src/providers/GeminiProvider';
import { OfflineMockProvider } from '../src/providers/OfflineMockProvider';
import { OpenAIProvider } from '../src/providers/OpenAIProvider';
import { createProviderRegistry } from '../src/providers/providerFactory';

describe('LLM Provider Interface & Factory', () => {
  it('selects mock-offline when no API keys are provided', () => {
    const env = loadServerEnv({
      LLM_PROVIDER: 'auto',
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
    });
    const registry = createProviderRegistry(env);
    expect(registry.active.name).toBe('mock-offline');
    expect(registry.active.isConfigured()).toBe(false);
  });

  it('selects anthropic, openai, or gemini when keys exist in server env', () => {
    const envAnthropic = loadServerEnv({
      LLM_PROVIDER: 'auto',
      ANTHROPIC_API_KEY: 'sk-ant-test-placeholder',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
    });
    expect(createProviderRegistry(envAnthropic).active.name).toBe('anthropic');

    const envOpenAI = loadServerEnv({
      LLM_PROVIDER: 'openai',
      ANTHROPIC_API_KEY: 'sk-ant-test-placeholder',
      OPENAI_API_KEY: 'sk-openai-test-placeholder',
      GEMINI_API_KEY: '',
    });
    expect(createProviderRegistry(envOpenAI).active.name).toBe('openai');

    const envGemini = loadServerEnv({
      LLM_PROVIDER: 'gemini',
      ANTHROPIC_API_KEY: '',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: 'gemini-test-placeholder',
    });
    expect(createProviderRegistry(envGemini).active.name).toBe('gemini');
  });

  it('Anthropic, OpenAI & Gemini adapters report unconfigured without keys and OfflineMockProvider stays grounded', async () => {
    expect(new AnthropicProvider('').isConfigured()).toBe(false);
    expect(new OpenAIProvider('').isConfigured()).toBe(false);
    expect(new GeminiProvider('').isConfigured()).toBe(false);

    const mock = new OfflineMockProvider();
    const emptyRes = await mock.generate({
      systemPrompt: 'sys',
      userPrompt: 'test',
      citations: [],
    });
    expect(emptyRes.text.toLowerCase()).toContain('when in doubt, throw it out');

    const groundedRes = await mock.generate({
      systemPrompt: 'sys',
      userPrompt: 'leftovers?',
      citations: [
        {
          id: 'kb-1',
          title: 'Leftovers',
          sourceName: 'USDA FSIS',
          url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety',
          retrievalDate: '2026-11-12',
          snippet: 'Refrigerate leftovers within 2 hours and eat within 3 to 4 days.',
        },
      ],
    });
    expect(groundedRes.text).toContain('USDA FSIS');
    expect(groundedRes.usage.totalTokens).toBe(0);
  });
});
