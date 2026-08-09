import { describe, it, expect } from 'vitest';
import {
  shouldShard,
  shardQuery,
  mergePaginatedResults,
  mergeArrayResults,
} from '@/utils/query-sharding';

describe('utils/query-sharding - shouldShard', () => {
  it('简单查询在阈值内 → 不分片', () => {
    const r = shouldShard('{ id name }', {});
    expect(typeof r.shouldShard).toBe('boolean');
    expect(typeof r.reason).toBe('string');
    expect(typeof r.score).toBe('number');
    expect(r.estimatedRecords).toBeGreaterThanOrEqual(1);
  });

  it('variables.total > maxRecordsPerShard → 建议分片', () => {
    const r = shouldShard('{ items }', { total: 10000 }, { maxRecordsPerShard: 500 });
    expect(r.shouldShard).toBe(true);
    expect(r.estimatedRecords).toBe(10000);
  });
});

describe('utils/query-sharding - shardQuery', () => {
  it('根据总记录数/每页生成 >=1 个 shards', () => {
    const plan = shardQuery('{ list }', { total: 1200 }, { maxRecordsPerShard: 500 });
    expect(plan.shards.length).toBeGreaterThanOrEqual(1);
    expect(plan.shards.length).toBe(Math.ceil(1200 / 500));
    expect(plan.totalEstimatedRecords).toBe(1200);
    expect(['time', 'id_range', 'offset']).toContain(plan.strategy);
  });

  it('offset 策略 shards 的变量应含 page/offset/limit', () => {
    const plan = shardQuery('{ list }', { total: 1500 }, { preferredStrategy: 'offset' });
    expect(plan.strategy).toBe('offset');
    expect(plan.shards[0].variables.page).toBe(1);
    expect(typeof plan.shards[0].variables.offset).toBe('number');
    expect(typeof plan.shards[0].variables.limit).toBe('number');
  });

  it('time 策略检测 startDate/endDate', () => {
    const plan = shardQuery(
      '{ list }',
      { startDate: '2024-01-01', endDate: '2024-12-31', total: 3000 },
      { preferredStrategy: 'time' }
    );
    expect(plan.strategy).toBe('time');
    expect(typeof plan.shards[0].variables.startDate).toBe('string');
    expect(typeof plan.shards[0].variables.endDate).toBe('string');
  });

  it('id_range 策略检测 startId/endId', () => {
    const plan = shardQuery(
      '{ list }',
      { startId: 'a', endId: 'z', total: 5000 },
      { preferredStrategy: 'id_range' }
    );
    expect(plan.strategy).toBe('id_range');
    expect(typeof plan.shards[0].variables.startId).toBe('string');
  });
});

describe('utils/query-sharding - mergePaginatedResults', () => {
  it('合并 items 数组，total 取最大值', () => {
    const r = mergePaginatedResults([
      { items: [1, 2], total: 10 },
      { items: [3, 4, 5], total: 100 },
    ]);
    expect(r.items).toEqual([1, 2, 3, 4, 5]);
    expect(r.total).toBe(100);
    expect(r.mergedFrom).toBe(2);
  });

  it('缺 total 时 fallback 到 items.length', () => {
    const r = mergePaginatedResults([{ items: [1, 2, 3] }]);
    expect(r.total).toBe(3);
  });
});

describe('utils/query-sharding - mergeArrayResults', () => {
  it('二维数组扁平化', () => {
    expect(mergeArrayResults([[1, 2], [3], [4, 5, 6]])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(mergeArrayResults([[], []])).toEqual([]);
  });
});
