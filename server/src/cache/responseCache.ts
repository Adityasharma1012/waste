import crypto from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ResponseCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlSeconds = 300, maxEntries = 200) {
    this.ttlMs = Math.max(0, ttlSeconds) * 1000;
    this.maxEntries = maxEntries;
  }

  static makeKey(namespace: string, payload: unknown): string {
    const raw = JSON.stringify({ namespace, payload });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  get(key: string): T | null {
    if (this.ttlMs === 0) return null;
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh insertion order for simple LRU behavior
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.ttlMs === 0) return;
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
