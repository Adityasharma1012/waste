import { describe, expect, it } from 'vitest';
import { RagService } from '../src/rag/ragService';

describe('BM25 RAG Service', () => {
  it('loads verified passages and strictly excludes unverified placeholders', () => {
    const rag = new RagService(0.65);
    expect(rag.verifiedPassages.length).toBeGreaterThanOrEqual(10);
    expect(rag.excludedPlaceholderCount).toBe(1);
    expect(
      rag.verifiedPassages.some((p) => p.id === 'kb-placeholder-unverified')
    ).toBe(false);
  });

  it('retrieves relevant USDA/FoodSafety passages for leftovers and date label queries', () => {
    const rag = new RagService(0.65);

    const leftoversRes = rag.retrieve('How long can cooked leftovers stay in the fridge?', 3);
    expect(leftoversRes.noMatchFound).toBe(false);
    expect(leftoversRes.citations.length).toBeGreaterThan(0);
    expect(leftoversRes.citations[0].url).toMatch(/^https:\/\//);

    const datingRes = rag.retrieve('difference between use by and best before date labels', 3);
    expect(datingRes.noMatchFound).toBe(false);
    expect(
      datingRes.citations.some((c) => c.id.includes('dating') || c.id.includes('wrap'))
    ).toBe(true);
  });

  it('never matches the excluded placeholder even if queried directly', () => {
    const rag = new RagService(0.1);
    const res = rag.retrieve('placeholder unverified passage', 5);
    expect(res.citations.some((c) => c.id === 'kb-placeholder-unverified')).toBe(false);
  });

  it('handles unmatched queries honestly by returning noMatchFound = true', () => {
    const rag = new RagService(0.65);
    const res1 = rag.retrieve('orbital mechanics trajectory of Jupiter moons', 3);
    expect(res1.noMatchFound).toBe(true);
    expect(res1.citations).toEqual([]);

    const res2 = rag.retrieve('What is the interest rate on a 30 year mortgage?', 3);
    expect(res2.noMatchFound).toBe(true);
    expect(res2.citations).toEqual([]);
  });
});
