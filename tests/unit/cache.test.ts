import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../../src/services/cache';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService({ ttl: 5000, maxSize: 3 });
  });

  describe('get/set/delete operations', () => {
    it('should set and get a value', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');

      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete a value', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      const result = cache.get('key1');

      expect(result).toBeNull();
    });

    it('should handle multiple keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
    });

    it('should handle different data types', () => {
      cache.set('string', 'text');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('text');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      cache = new CacheService({ ttl: 100, maxSize: 10 });
      cache.set('key1', 'value1');

      // Value should exist immediately
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Value should be expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      cache = new CacheService({ ttl: 5000, maxSize: 10 });
      cache.set('key1', 'value1', 100);

      // Value should exist immediately
      expect(cache.get('key1')).toBe('value1');

      // Wait for custom TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Value should be expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL when custom TTL not provided', async () => {
      cache = new CacheService({ ttl: 100, maxSize: 10 });
      cache.set('key1', 'value1');

      // Wait less than TTL
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Value should still exist
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Value should be expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should not return expired entries', async () => {
      cache = new CacheService({ ttl: 50, maxSize: 10 });
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('max size enforcement', () => {
    it('should enforce max size by removing oldest entry', () => {
      cache = new CacheService({ ttl: 5000, maxSize: 3 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should remove oldest entry when cache is full', () => {
      cache = new CacheService({ ttl: 5000, maxSize: 2 });
      
      cache.set('first', 'value1');
      cache.set('second', 'value2');
      cache.set('third', 'value3'); // Should evict 'first'

      expect(cache.get('first')).toBeNull();
      expect(cache.get('second')).toBe('value2');
      expect(cache.get('third')).toBe('value3');
    });

    it('should handle max size of 1', () => {
      cache = new CacheService({ ttl: 5000, maxSize: 1 });
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      cache.set('key2', 'value2');
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should not evict when updating existing key', () => {
      cache = new CacheService({ ttl: 5000, maxSize: 2 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key1', 'updated'); // Update existing key

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('cache hit/miss scenarios', () => {
    it('should return value on cache hit', () => {
      cache.set('key1', 'value1');
      
      const result = cache.get('key1');
      
      expect(result).toBe('value1');
    });

    it('should return null on cache miss', () => {
      const result = cache.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should return null after deletion (cache miss)', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      
      const result = cache.get('key1');
      
      expect(result).toBeNull();
    });

    it('should return null after expiration (cache miss)', async () => {
      cache = new CacheService({ ttl: 50, maxSize: 10 });
      cache.set('key1', 'value1');
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const result = cache.get('key1');
      
      expect(result).toBeNull();
    });

    it('should handle multiple cache hits', () => {
      cache.set('key1', 'value1');
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle mixed hits and misses', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      expect(cache.get('key1')).toBe('value1'); // hit
      expect(cache.get('key3')).toBeNull(); // miss
      expect(cache.get('key2')).toBe('value2'); // hit
      expect(cache.get('key4')).toBeNull(); // miss
    });
  });

  describe('clear operation', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should allow setting values after clear', () => {
      cache.set('key1', 'value1');
      cache.clear();
      cache.set('key2', 'value2');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should clear empty cache without error', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });

  describe('has operation', () => {
    it('should return true for existing key', () => {
      cache.set('key1', 'value1');
      
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for deleted key', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false for expired key', async () => {
      cache = new CacheService({ ttl: 50, maxSize: 10 });
      cache.set('key1', 'value1');
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      expect(cache.has('key1')).toBe(false);
    });

    it('should return true for valid non-expired key', async () => {
      cache = new CacheService({ ttl: 200, maxSize: 10 });
      cache.set('key1', 'value1');
      
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      expect(cache.has('key1')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string as key', () => {
      cache.set('', 'value');
      
      expect(cache.get('')).toBe('value');
      expect(cache.has('')).toBe(true);
    });

    it('should handle null as value', () => {
      cache.set('key1', null);
      
      // Note: get returns null for both missing and null values
      // This is expected behavior
      const result = cache.get('key1');
      expect(result).toBeNull();
    });

    it('should handle undefined as value', () => {
      cache.set('key1', undefined);
      
      const result = cache.get('key1');
      expect(result).toBeUndefined();
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: new Array(1000).fill('test'),
        nested: {
          deep: {
            value: 'test',
          },
        },
      };
      
      cache.set('large', largeObject);
      
      expect(cache.get('large')).toEqual(largeObject);
    });

    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Due to max size, only last 3 should exist
      expect(cache.get('key97')).toBe('value97');
      expect(cache.get('key98')).toBe('value98');
      expect(cache.get('key99')).toBe('value99');
      expect(cache.get('key0')).toBeNull();
    });

    it('should handle zero TTL', () => {
      cache = new CacheService({ ttl: 0, maxSize: 10 });
      cache.set('key1', 'value1');
      
      // With 0 TTL, entry should be immediately expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should handle very large TTL', () => {
      cache = new CacheService({ ttl: Number.MAX_SAFE_INTEGER, maxSize: 10 });
      cache.set('key1', 'value1');
      
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('TypeScript generic support', () => {
    it('should support typed get operations', () => {
      interface User {
        id: string;
        name: string;
      }
      
      const user: User = { id: '123', name: 'John' };
      cache.set('user', user);
      
      const result = cache.get<User>('user');
      
      expect(result).toEqual(user);
      if (result) {
        expect(result.id).toBe('123');
        expect(result.name).toBe('John');
      }
    });

    it('should support different types for different keys', () => {
      cache.set('string', 'text');
      cache.set('number', 42);
      cache.set('object', { key: 'value' });
      
      const str = cache.get<string>('string');
      const num = cache.get<number>('number');
      const obj = cache.get<{ key: string }>('object');
      
      expect(str).toBe('text');
      expect(num).toBe(42);
      expect(obj).toEqual({ key: 'value' });
    });
  });
});
