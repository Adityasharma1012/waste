import type { KnowledgeCitation } from '@wasteless/core';

export interface LLMGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  citations: KnowledgeCitation[];
  maxTokens?: number;
}

export interface LLMTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface LLMGenerateResponse {
  text: string;
  model: string;
  provider: string;
  usage: LLMTokenUsage;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  generate(request: LLMGenerateRequest): Promise<LLMGenerateResponse>;
}
