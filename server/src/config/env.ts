import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  LLM_PROVIDER: z.enum(['auto', 'anthropic', 'openai', 'gemini', 'mock']).default('auto'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  RAG_MIN_SCORE: z.coerce.number().min(0).default(0.65),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

export function loadServerEnv(overrides: Record<string, string | undefined> = {}): ServerEnv {
  return EnvSchema.parse({
    ...process.env,
    ...overrides,
  });
}
