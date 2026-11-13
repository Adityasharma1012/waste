import type { KnowledgePassage } from './knowledgeLoader';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
  'how', 'i', 'if', 'in', 'is', 'it', 'long', 'me', 'my', 'of', 'on', 'or',
  'should', 'so', 'that', 'the', 'their', 'this', 'to', 'what', 'when', 'where',
  'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

function normalizeToken(tok: string): string {
  const aliases: Record<string, string> = {
    store: 'storage',
    stored: 'storage',
    storing: 'storage',
    storage: 'storage',
    freeze: 'freez',
    freezing: 'freez',
    frozen: 'freez',
    freezer: 'freezer',
    longer: 'long',
    longest: 'long',
    expire: 'expir',
    expired: 'expir',
    expiring: 'expir',
    expiry: 'expir',
    cakes: 'cake',
    breads: 'bread',
    foods: 'food',
    leftovers: 'leftover',
    cooked: 'cook',
    cooking: 'cook',
    reheat: 'reheat',
    reheating: 'reheat',
    thaw: 'thaw',
    thawing: 'thaw',
    defrost: 'defrost',
    defrosting: 'defrost',
    keeping: 'keep',
    keeps: 'keep',
  };
  if (aliases[tok]) return aliases[tok];
  if (tok.length > 4 && tok.endsWith('ing')) return tok.slice(0, -3);
  if (tok.length > 4 && tok.endsWith('ies')) return `${tok.slice(0, -3)}y`;
  if (tok.length > 3 && tok.endsWith('s') && !tok.endsWith('ss')) return tok.slice(0, -1);
  return tok;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length > 1 && !STOPWORDS.has(tok))
    .map(normalizeToken);
}

export interface BM25Match {
  passage: KnowledgePassage;
  score: number;
}

export class BM25Retriever {
  private readonly passages: KnowledgePassage[];
  private readonly docTermFreqs: Array<Map<string, number>> = [];
  private readonly docLengths: number[] = [];
  private readonly idf = new Map<string, number>();
  private readonly avgDocLen: number;
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  constructor(passages: KnowledgePassage[]) {
    this.passages = passages;
    const df = new Map<string, number>();
    let totalLen = 0;

    for (const p of passages) {
      const combined = `${p.title} ${p.tags.join(' ')} ${p.content}`;
      const tokens = tokenize(combined);
      const tf = new Map<string, number>();
      for (const tok of tokens) {
        tf.set(tok, (tf.get(tok) ?? 0) + 1);
      }
      this.docTermFreqs.push(tf);
      this.docLengths.push(tokens.length);
      totalLen += tokens.length;

      for (const term of tf.keys()) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    this.avgDocLen = passages.length > 0 ? totalLen / passages.length : 1;
    const N = passages.length;
    for (const [term, docFreq] of df.entries()) {
      const idfVal = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      this.idf.set(term, idfVal);
    }
  }

  search(query: string, topK = 3, minScore = 0.65): BM25Match[] {
    const queryTokens = Array.from(new Set(tokenize(query)));
    if (queryTokens.length === 0 || this.passages.length === 0) {
      return [];
    }

    const scored: BM25Match[] = [];

    for (let i = 0; i < this.passages.length; i += 1) {
      const tfMap = this.docTermFreqs[i];
      const docLen = this.docLengths[i];
      let score = 0;
      let matchedTerms = 0;

      for (const term of queryTokens) {
        const tf = tfMap.get(term) ?? 0;
        if (tf === 0) continue;
        matchedTerms += 1;
        const termIdf = this.idf.get(term) ?? 0;
        const denom = tf + this.k1 * (1 - this.b + (this.b * docLen) / this.avgDocLen);
        score += termIdf * ((tf * (this.k1 + 1)) / denom);
      }

      // Require at least 2 distinct matched terms for multi-word queries so a single incidental token
      // (e.g. "30" in "30 year mortgage") cannot trigger a false positive match.
      const minTermsRequired = queryTokens.length >= 3 ? 2 : 1;
      if (score >= minScore && matchedTerms >= minTermsRequired) {
        scored.push({
          passage: this.passages[i],
          score: Math.round(score * 1000) / 1000,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}
