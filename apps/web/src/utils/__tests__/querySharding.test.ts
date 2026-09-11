import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  shouldShard,
  shardQuery,
  executeShardedQuery,
  mergePaginatedResults,
  mergeArrayResults,
  type ShardPlan,
} from '../querySharding';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

// Mock queryCostAnalyzer to control cost analysis results
const mockAnalyzeQueryCost = vi.fn();
vi.mock('../queryCostAnalyzer.ts', () => ({
  analyzeQueryCost: (...args: unknown[]) => mockAnalyzeQueryCost(...args),
}));

describe('querySharding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: low cost query
    mockAnalyzeQueryCost.mockReturnValue({
      score: 50,
      fieldCount: 5,
      depth: 2,
      estimatedSizeKB: 10,
      level: 'low',
      suggestions: [],
    });
  });

  describe('shouldShard', () => {
    it('should return false for low-cost, small-query', () => {
      const result = shouldShard('query GetUser { user { id } }', {});
      expect(result.shouldShard).toBe(false);
      expect(result.estimatedRecords).toBeGreaterThan(0);
    });

    it('should return true when cost score >= 200', () => {
      mockAnalyzeQueryCost.mockReturnValue({
        score: 250,
        fieldCount: 50,
        depth: 5,
        estimatedSizeKB: 100,
        level: 'high',
        suggestions: [],
      });
      const result = shouldShard('query Complex { ... }', {});
      expect(result.shouldShard).toBe(true);
      expect(result.score).toBe(250);
    });

    it('should return true when estimated records >= 1000', () => {
      mockAnalyzeQueryCost.mockReturnValue({
        score: 50,
        fieldCount: 100,
        depth: 3,
        estimatedSizeKB: 400, // 400 * 4 = 1600 records
        level: 'medium',
        suggestions: [],
      });
      const result = shouldShard('query List { ... }', {});
      expect(result.shouldShard).toBe(true);
    });

    it('should return true when variables.total exceeds maxRecords', () => {
      const result = shouldShard('query { ... }', { total: 2000 }, { maxRecordsPerShard: 500 });
      expect(result.shouldShard).toBe(true);
      expect(result.estimatedRecords).toBe(2000);
    });

    it('should return false when variables.total is within limit', () => {
      const result = shouldShard('query { ... }', { total: 100 }, { maxRecordsPerShard: 500 });
      expect(result.shouldShard).toBe(false);
    });
  });

  describe('shardQuery (offset strategy)', () => {
    it('should generate offset-based shards by default', () => {
      const plan = shardQuery('query { ... }', { total: 1500 }, { maxRecordsPerShard: 500 });
      expect(plan.strategy).toBe('offset');
      expect(plan.shards).toHaveLength(3);
      expect(plan.shards[0].variables).toMatchObject({
        page: 1,
        pageSize: 500,
        offset: 0,
        limit: 500,
      });
      expect(plan.shards[1].variables.offset).toBe(500);
      expect(plan.shards[2].variables.offset).toBe(1000);
    });

    it('should create at least 1 shard even for small result sets', () => {
      const plan = shardQuery('query { ... }', { total: 10 });
      expect(plan.shards).toHaveLength(1);
      expect(plan.strategy).toBe('offset');
    });

    it('should respect preferred strategy', () => {
      const plan = shardQuery('query { ... }', {}, { preferredStrategy: 'time' });
      expect(plan.strategy).toBe('time');
    });
  });

  describe('shardQuery (time strategy)', () => {
    it('should detect time range from variables', () => {
      const plan = shardQuery(
        'query { ... }',
        {
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
          total: 3000,
        },
        { maxRecordsPerShard: 1000 }
      );
      expect(plan.strategy).toBe('time');
      expect(plan.shards).toHaveLength(3);
      // Each shard should have split startDate/endDate
      expect(plan.shards[0].variables.startDate).toBeDefined();
      expect(plan.shards[1].variables.startDate).not.toBe(plan.shards[0].variables.startDate);
    });

    it('should detect time range from startTime/endTime', () => {
      const plan = shardQuery(
        'query { ... }',
        { startTime: '2025-01-01', endTime: '2025-02-01' },
        {}
      );
      expect(plan.strategy).toBe('time');
    });
  });

  describe('shardQuery (id_range strategy)', () => {
    it('should detect id range from startId/endId', () => {
      const plan = shardQuery(
        'query { ... }',
        { startId: 'a', endId: 'z', total: 2000 },
        { maxRecordsPerShard: 1000 }
      );
      expect(plan.strategy).toBe('id_range');
      expect(plan.shards).toHaveLength(2);
    });

    it('should detect id range from after/before', () => {
      const plan = shardQuery('query { ... }', { after: '100', before: '999' });
      expect(plan.strategy).toBe('id_range');
    });
  });

  describe('executeShardedQuery', () => {
    it('should execute shards concurrently and merge results', async () => {
      const plan: ShardPlan = {
        strategy: 'offset',
        totalEstimatedRecords: 100,
        shards: [
          { index: 0, variables: { offset: 0 }, estimatedSize: 50 },
          { index: 1, variables: { offset: 50 }, estimatedSize: 50 },
        ],
      };

      const executeFn = vi.fn(async (vars: Record<string, unknown>) => {
        return [{ offset: vars.offset }];
      });

      const result = await executeShardedQuery(executeFn, plan, { maxConcurrency: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.completedCount).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(executeFn).toHaveBeenCalledTimes(2);
    });

    it('should collect errors from failed shards', async () => {
      const plan: ShardPlan = {
        strategy: 'offset',
        totalEstimatedRecords: 100,
        shards: [
          { index: 0, variables: { offset: 0 }, estimatedSize: 50 },
          { index: 1, variables: { offset: 50 }, estimatedSize: 50 },
        ],
      };

      const executeFn = vi.fn(async (vars: Record<string, unknown>) => {
        if (vars.offset === 50) throw new Error('Shard failed');
        return ['ok'];
      });

      const result = await executeShardedQuery(executeFn, plan, { retryAttempts: 0 });
      expect(result.data).toHaveLength(1);
      expect(result.completedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].shardIndex).toBe(1);
    });

    it('should call onProgress callback', async () => {
      const plan: ShardPlan = {
        strategy: 'offset',
        totalEstimatedRecords: 100,
        shards: [
          { index: 0, variables: { offset: 0 }, estimatedSize: 50 },
          { index: 1, variables: { offset: 50 }, estimatedSize: 50 },
        ],
      };

      const onProgress = vi.fn();
      await executeShardedQuery(async () => 'data', plan, {
        onProgress,
        maxConcurrency: 1,
        retryAttempts: 0,
      });

      expect(onProgress).toHaveBeenCalled();
      // Should be called 2 times (one per shard)
      expect(onProgress).toHaveBeenCalledTimes(2);
      // Final progress should be 100
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0]).toBe(100);
    });
  });

  describe('mergePaginatedResults', () => {
    it('should merge items from multiple pages', () => {
      const results = [
        { items: [1, 2], total: 5 },
        { items: [3, 4], total: 5 },
        { items: [5], total: 5 },
      ];
      const merged = mergePaginatedResults(results);
      expect(merged.items).toEqual([1, 2, 3, 4, 5]);
      expect(merged.total).toBe(5);
      expect(merged.mergedFrom).toBe(3);
    });

    it('should use max total across pages', () => {
      const results = [
        { items: [1], total: 10 },
        { items: [2], total: 25 },
      ];
      const merged = mergePaginatedResults(results);
      expect(merged.total).toBe(25);
    });

    it('should fall back to items length when no total', () => {
      const results = [{ items: ['a', 'b', 'c'] }];
      const merged = mergePaginatedResults(results);
      expect(merged.total).toBe(3);
    });

    it('should handle empty results', () => {
      const merged = mergePaginatedResults([]);
      expect(merged.items).toEqual([]);
      expect(merged.total).toBe(0);
      expect(merged.mergedFrom).toBe(0);
    });
  });

  describe('mergeArrayResults', () => {
    it('should flatten arrays', () => {
      const result = mergeArrayResults([[1, 2], [3, 4], [5]]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty input', () => {
      expect(mergeArrayResults([])).toEqual([]);
    });
  });
});
