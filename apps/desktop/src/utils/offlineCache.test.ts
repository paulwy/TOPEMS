import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineCache } from './offlineCache';

describe('offlineCache', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineCache.reset();
  });

  afterEach(() => {
    localStorage.clear();
    offlineCache.reset();
  });

  it('should return null for non-existent key', async () => {
    const result = await offlineCache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should store and retrieve data', async () => {
    await offlineCache.set('test_key', 'test_value');
    const result = await offlineCache.get('test_key');
    expect(result).toBe('test_value');
  });

  it('should expire data after TTL', async () => {
    await offlineCache.set('temp_key', 'temp_value', 1);
    
    await new Promise(resolve => setTimeout(resolve, 5));
    
    const result = await offlineCache.get('temp_key');
    expect(result).toBeNull();
  });

  it('should delete data', async () => {
    await offlineCache.set('delete_key', 'delete_value');
    await offlineCache.delete('delete_key');
    
    const result = await offlineCache.get('delete_key');
    expect(result).toBeNull();
  });

  it('should clear all cache', async () => {
    await offlineCache.set('key1', 'value1');
    await offlineCache.set('key2', 'value2');
    
    await offlineCache.clear();
    
    const result1 = await offlineCache.get('key1');
    const result2 = await offlineCache.get('key2');
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('should clean up expired entries', async () => {
    const expiredKey = 'topems_cache_expired_key';
    const expiredEntry = {
      data: 'expired',
      timestamp: Date.now() - 100000,
      expiresAt: Date.now() - 1000,
    };
    localStorage.setItem(expiredKey, JSON.stringify(expiredEntry));
    
    await offlineCache.init();
    
    const result = await offlineCache.get('expired_key');
    expect(result).toBeNull();
  });

  it('should sanitize keys with special characters', () => {
    const dirtyKey = '/path/to/file?query=1&other=2';
    const sanitized = offlineCache.sanitizeKey(dirtyKey);
    
    expect(sanitized).not.toMatch(/[\\/:*?"<>|]/);
    expect(sanitized.length).toBeLessThanOrEqual(200);
  });

  it('should return stats', () => {
    const stats = offlineCache.getStats();
    expect(stats).toHaveProperty('used');
    expect(stats).toHaveProperty('count');
    expect(typeof stats.used).toBe('number');
    expect(typeof stats.count).toBe('number');
  });

  it('should increment stats on set', async () => {
    await offlineCache.clear();
    await offlineCache.reset();
    
    const initialStats = offlineCache.getStats();
    expect(initialStats.count).toBe(0);
    
    await offlineCache.set('stat_key', 'stat_value');
    
    const afterStats = offlineCache.getStats();
    expect(afterStats.count).toBe(1);
    expect(afterStats.used).toBeGreaterThan(0);
  });

  it('should decrement stats on delete', async () => {
    await offlineCache.clear();
    await offlineCache.reset();
    
    await offlineCache.set('stat_del_key', 'stat_del_value');
    
    const initialStats = offlineCache.getStats();
    expect(initialStats.count).toBe(1);
    
    await offlineCache.delete('stat_del_key');
    
    const afterStats = offlineCache.getStats();
    expect(afterStats.count).toBe(0);
  });

  it('should handle JSON data', async () => {
    const obj = { name: 'test', value: 123, nested: { key: 'value' } };
    await offlineCache.set('json_key', JSON.stringify(obj));
    
    const result = await offlineCache.get('json_key');
    expect(JSON.parse(result!)).toEqual(obj);
  });

  it('should handle empty string', async () => {
    await offlineCache.set('empty_key', '');
    
    const result = await offlineCache.get('empty_key');
    expect(result).toBe('');
  });

  it('should handle large data', async () => {
    const largeData = 'x'.repeat(10000);
    await offlineCache.set('large_key', largeData);
    
    const result = await offlineCache.get('large_key');
    expect(result).toBe(largeData);
  });
});