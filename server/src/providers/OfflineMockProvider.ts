import type { LLMGenerateRequest, LLMGenerateResponse, LLMProvider } from './types';

export class OfflineMockProvider implements LLMProvider {
  readonly name = 'mock-offline';
  readonly model = 'deterministic-rag-synthesizer';

  isConfigured(): boolean {
    return false;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    const started = Date.now();

    if (request.citations.length === 0) {
      return {
        text:
          'No verified passages in the local WasteLess knowledge base matched your question cleanly. Rather than guessing, please consult official USDA FoodKeeper or FoodSafety.gov guidance — and remember: when in doubt, throw it out.',
        model: this.model,
        provider: this.name,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        latencyMs: Math.max(1, Date.now() - started),
      };
    }

    const bulletLines = request.citations.map(
      (c) => `• ${c.snippet} (${c.sourceName})`
    );

    const text = [
      'Based strictly on verified food-safety & sustainability guidance:',
      '',
      ...bulletLines,
      '',
      'Safety Reminder: Never judge perishable food safety from appearance or smell alone — when in doubt, throw it out.',
    ].join('\n');

    return {
      text,
      model: this.model,
      provider: this.name,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      latencyMs: Math.max(1, Date.now() - started),
    };
  }
}
