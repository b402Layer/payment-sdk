interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  ttl: number;
  maxSize: number;
}

/**
 * In-memory cache service with TTL and size limits
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions) {
    this.ttl = options.ttl;
    this.maxSize = options.maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const expiresAt = Date.now() + (ttl || this.ttl);
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
