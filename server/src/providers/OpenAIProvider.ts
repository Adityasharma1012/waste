import type { LLMGenerateRequest, LLMGenerateResponse, LLMProvider } from './types';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey.trim();
    this.model = model;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAIProvider is not configured (missing OPENAI_API_KEY).');
    }
    const started = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 450,
        temperature: 0.2,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      text,
      model: this.model,
      provider: this.name,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: data.usage?.total_tokens ?? inputTokens + outputTokens,
      },
      latencyMs: Math.max(1, Date.now() - started),
    };
  }
}
