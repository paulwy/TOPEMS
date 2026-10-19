import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateBackoffDelay, SmartShardingDecider } from '../bff/autoShardingV2';

vi.mock('@/api/bff', () => ({ bffGraphQL: vi.fn() }));
vi.mock('@/utils/logger', () => ({ logger: { child: () => ({}) } }));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k } }));

const baseRetry = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  jitter: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ==================== calculateBackoffDelay ====================

describe('calculateBackoffDelay 指数退避', () => {
  it('无 jitter 时按 factor 指数增长', () => {
    expect(calculateBackoffDelay(0, baseRetry)).toBe(1000);
    expect(calculateBackoffDelay(1, baseRetry)).toBe(2000);
    expect(calculateBackoffDelay(2, baseRetry)).toBe(4000);
  });

  it('超过 maxDelayMs 时封顶', () => {
    const capped = { ...baseRetry, maxDelayMs: 3000 };
    expect(calculateBackoffDelay(5, capped)).toBe(3000);
    expect(calculateBackoffDelay(20, capped)).toBe(3000);
  });

  it('开启 jitter 时落在 [0.5d, d] 区间', () => {
    // attempt=1 → 无 jitter 基数 d = 1000 * 2 = 2000
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const min = calculateBackoffDelay(1, { ...baseRetry, jitter: true });
    expect(min).toBe(2000 * 0.5); // random=0 → 0.5*d = 1000

    vi.spyOn(Math, 'random').mockReturnValue(1);
    const max = calculateBackoffDelay(1, { ...baseRetry, jitter: true });
    expect(max).toBe(2000); // random→1 → 1.0*d
  });
});

// ==================== SmartShardingDecider.decideStrategy ====================

describe('SmartShardingDecider.decideStrategy', () => {
  it('显式指定非 offset 策略时直接采用', () => {
    const d = new SmartShardingDecider({ preferredStrategy: 'id_range' });
    expect(d.decideStrategy('any', {}, 5000)).toBe('id_range');
  });

  it('带时间过滤且记录数>2000 选 time', () => {
    const d = new SmartShardingDecider();
    expect(d.decideStrategy('where created_at > $start', {}, 3000)).toBe('time');
  });

  it('含 id 且记录数>1000 选 cursor', () => {
    const d = new SmartShardingDecider();
    expect(d.decideStrategy('query by id', {}, 2000)).toBe('cursor');
  });

  it('含排序且记录数>5000 选 keyset', () => {
    const d = new SmartShardingDecider();
    expect(d.decideStrategy('sort by name', {}, 6000)).toBe('keyset');
  });

  it('都不满足回退 offset', () => {
    const d = new SmartShardingDecider();
    expect(d.decideStrategy('plain list', {}, 100)).toBe('offset');
  });
});

// ==================== SmartShardingDecider.estimateChunkCount ====================

describe('SmartShardingDecider.estimateChunkCount', () => {
  it('offset 按 maxRecordsPerShard 均分', () => {
    const d = new SmartShardingDecider();
    const r = d.estimateChunkCount(5000, 'offset');
    expect(r.shardCount).toBe(10);
    expect(r.pageSize).toBe(500);
  });

  it('cursor/keyset 页大小放大 1.5 倍', () => {
    const d = new SmartShardingDecider();
    const r = d.estimateChunkCount(5000, 'cursor');
    expect(r.pageSize).toBe(750);
    expect(r.shardCount).toBe(7);
  });

  it('分片数夹在上限 maxShards 内', () => {
    const d = new SmartShardingDecider();
    const r = d.estimateChunkCount(100000, 'offset');
    expect(r.shardCount).toBeLessThanOrEqual(20);
    expect(r.shardCount).toBe(20);
  });

  it('极少量记录至少 1 片', () => {
    const d = new SmartShardingDecider();
    const r = d.estimateChunkCount(50, 'offset');
    expect(r.shardCount).toBe(1);
  });
});

// ==================== SmartShardingDecider.shouldShard ====================

describe('SmartShardingDecider.shouldShard', () => {
  it('低于 minShardSize 不分片', () => {
    const d = new SmartShardingDecider();
    expect(d.shouldShard(50).shouldShard).toBe(false);
  });

  it('超过 maxRecordsPerShard 应分片', () => {
    const d = new SmartShardingDecider();
    expect(d.shouldShard(5000).shouldShard).toBe(true);
  });
});
