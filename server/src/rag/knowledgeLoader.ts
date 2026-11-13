import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const PassageSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceName: z.string(),
  url: z.string().url(),
  retrievalDate: z.string(),
  verified: z.boolean(),
  tags: z.array(z.string()).default([]),
  content: z.string(),
});

export type KnowledgePassage = z.infer<typeof PassageSchema>;

export interface LoadedKnowledgeBase {
  verifiedPassages: KnowledgePassage[];
  excludedPlaceholderCount: number;
}

export function resolveKnowledgePath(): string {
  const candidates = [
    path.resolve(__dirname, '../../../knowledge/passages.json'),
    path.resolve(__dirname, '../../../../knowledge/passages.json'),
    path.resolve(process.cwd(), 'knowledge/passages.json'),
    path.resolve(process.cwd(), '../knowledge/passages.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not locate knowledge/passages.json in: ${candidates.join(', ')}`);
}

export function loadKnowledgeBase(filePath: string = resolveKnowledgePath()): LoadedKnowledgeBase {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = z.array(PassageSchema).parse(JSON.parse(raw));

  const verifiedPassages = parsed.filter((p) => p.verified === true);
  const excludedPlaceholderCount = parsed.length - verifiedPassages.length;

  return { verifiedPassages, excludedPlaceholderCount };
}
