import type { LLMGenerateRequest, LLMGenerateResponse, LLMProvider } from './types';

interface GeminiStepContent {
  type?: string;
  text?: string;
}

interface GeminiStep {
  type?: string;
  content?: GeminiStepContent[];
}

interface GeminiInteractionResponse {
  status?: string;
  steps?: GeminiStep[];
  usage?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_tokens?: number;
  };
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = 'gemini-3.5-flash-lite') {
    this.apiKey = apiKey.trim();
    this.model = model;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse> {
    if (!this.isConfigured()) {
      throw new Error('GeminiProvider is not configured (missing GEMINI_API_KEY).');
    }

    const started = Date.now();
    const payload = JSON.stringify({
      model: this.model,
      system_instruction: request.systemPrompt,
      input: request.userPrompt,
      store: false,
      generation_config: {
        max_output_tokens: Math.max(request.maxTokens ?? 1024, 1024),
        temperature: 0.2,
        thinking_level: 'low',
      },
    });

    let res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': this.apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: payload,
    });

    if (res.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.apiKey,
          'Api-Revision': '2026-05-20',
        },
        body: payload,
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as GeminiInteractionResponse;

    const text = (data.steps ?? [])
      .filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('\n')
      .trim();

    const inputTokens = data.usage?.total_input_tokens ?? 0;
    const outputTokens = data.usage?.total_output_tokens ?? 0;

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
