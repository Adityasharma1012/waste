import type { KnowledgeCitation } from '@wasteless/core';
import { BM25Retriever } from './bm25';
import { loadKnowledgeBase, type KnowledgePassage } from './knowledgeLoader';

export interface RagQueryResult {
  citations: KnowledgeCitation[];
  noMatchFound: boolean;
}

export class RagService {
  readonly verifiedPassages: KnowledgePassage[];
  readonly excludedPlaceholderCount: number;
  private readonly retriever: BM25Retriever;
  private readonly minScore: number;

  constructor(minScore = 0.65, filePath?: string) {
    const loaded = loadKnowledgeBase(filePath);
    this.verifiedPassages = loaded.verifiedPassages;
    this.excludedPlaceholderCount = loaded.excludedPlaceholderCount;
    this.minScore = minScore;
    this.retriever = new BM25Retriever(this.verifiedPassages);
  }

  retrieve(query: string, topK = 3): RagQueryResult {
    const matches = this.retriever.search(query, topK, this.minScore);
    if (matches.length === 0) {
      return { citations: [], noMatchFound: true };
    }

    const citations: KnowledgeCitation[] = matches.map(({ passage, score }) => ({
      id: passage.id,
      title: passage.title,
      sourceName: passage.sourceName,
      url: passage.url,
      retrievalDate: passage.retrievalDate,
      snippet: passage.content,
      score,
    }));

    return { citations, noMatchFound: false };
  }

  listAllVerifiedSources(): KnowledgeCitation[] {
    return this.verifiedPassages.map((p) => ({
      id: p.id,
      title: p.title,
      sourceName: p.sourceName,
      url: p.url,
      retrievalDate: p.retrievalDate,
      snippet: p.content,
    }));
  }
}
