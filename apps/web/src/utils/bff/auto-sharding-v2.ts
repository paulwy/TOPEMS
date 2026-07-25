/**
 * V44.0 Track D: 自动分片增强 v2
 *
 * 增强功能:
 * - SmartShardingDecider: 智能分片决策（基于历史数据/查询复杂度/数据量）
 * - ProgressiveLoader: 渐进式加载（先加载首屏，再后台加载剩余）
 * - ShardMetrics: 分片性能指标收集
 * - 新增分片策略: cursor-based / keyset / parallel-cursor
 * - 失败自动重试 + 指数退避算法
 */

import { bffGraphQL } from '@/api/bff';
import { logger } from '@/utils/logger';

const shardV2Logger = logger.child({ prefix: 'AutoShardingV2' });

// ============ 类型定义 ============

export type ShardStrategyV2 =
  'time' | 'id_range' | 'offset' | 'cursor' | 'keyset' | 'parallel_cursor';

export interface ShardInfoV2 {
  index: number;
  variables: Record<string, unknown>;
  estimatedSize: number;
  cursor?: string;
  status: 'pending' | 'loading' | 'success' | 'failed' | 'retrying';
  retryCount: number;
  startTime?: number;
  endTime?: number;
  duration?: number;
}

export interface ShardMetrics {
  shard_count: number;
  total_time: number;
  avg_shard_time: number;
  failed_shards: number;
  retry_count: number;
  success_rate: number;
  throughput: number;
}

export interface ShardPlanV2 {
  shards: ShardInfoV2[];
  strategy: ShardStrategyV2;
  totalEstimatedRecords: number;
  optimalPageSize: number;
}

export interface ShardDeciderOptions {
  maxRecordsPerShard?: number;
  preferredStrategy?: ShardStrategyV2;
  maxConcurrency?: number;
  minShardSize?: number;
  maxShards?: number;
  historicalData?: ShardMetrics[];
}

export interface ProgressiveLoadOptions {
  initialPageSize?: number;
  backgroundConcurrency?: number;
  priorityOrder?: 'first' | 'last' | 'middle-out';
  onProgress?: (progress: number, loaded: number, total: number) => void;
  onShardComplete?: (shardIndex: number, data: unknown) => void;
  onComplete?: (allData: unknown[]) => void;
  onError?: (shardIndex: number, error: Error) => void;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface ShardExecuteResultV2<T> {
  data: T[];
  errors: Array<{ shardIndex: number; error: Error; attempt: number }>;
  completedCount: number;
  totalCount: number;
  metrics: ShardMetrics;
}

// ============ 默认配置 ============

const DEFAULT_MAX_RECORDS_PER_SHARD = 500;
const DEFAULT_MIN_SHARD_SIZE = 100;
const DEFAULT_MAX_SHARDS = 20;
const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  jitter: true,
};

// ============ 工具函数 ============

function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffFactor, attempt),
    config.maxDelayMs
  );
  if (config.jitter) {
    return delay * (0.5 + Math.random() * 0.5);
  }
  return delay;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ SmartShardingDecider: 智能分片决策 ============

export class SmartShardingDecider {
  private options: Required<ShardDeciderOptions>;

  constructor(options: ShardDeciderOptions = {}) {
    this.options = {
      maxRecordsPerShard: options.maxRecordsPerShard ?? DEFAULT_MAX_RECORDS_PER_SHARD,
      preferredStrategy: options.preferredStrategy ?? 'offset',
      maxConcurrency: options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
      minShardSize: options.minShardSize ?? DEFAULT_MIN_SHARD_SIZE,
      maxShards: options.maxShards ?? DEFAULT_MAX_SHARDS,
      historicalData: options.historicalData ?? [],
    };
  }

  shouldShard(
    estimatedRecords: number,
    queryComplexityScore: number = 0,
    fieldCount: number = 10
  ): { shouldShard: boolean; reason: string; confidence: number } {
    const { maxRecordsPerShard, minShardSize } = this.options;

    if (estimatedRecords < minShardSize) {
      return { shouldShard: false, reason: '数据量太小，无需分片', confidence: 0.95 };
    }

    if (estimatedRecords > maxRecordsPerShard) {
      return {
        shouldShard: true,
        reason: `预估数据量(${estimatedRecords})超过单分片上限(${maxRecordsPerShard})`,
        confidence: 0.9,
      };
    }

    if (queryComplexityScore > 300) {
      return {
        shouldShard: true,
        reason: `查询复杂度过高(${queryComplexityScore}分)，建议分片降低单次压力`,
        confidence: 0.75,
      };
    }

    if (fieldCount > 30) {
      return {
        shouldShard: true,
        reason: `查询字段过多(${fieldCount}个)，建议分片减少单条数据体积`,
        confidence: 0.6,
      };
    }

    return {
      shouldShard: false,
      reason: '数据量和查询复杂度在可接受范围内',
      confidence: 0.8,
    };
  }

  decideStrategy(
    query: string,
    variables: Record<string, unknown>,
    estimatedRecords: number
  ): ShardStrategyV2 {
    const { preferredStrategy } = this.options;

    if (preferredStrategy && preferredStrategy !== 'offset') {
      return preferredStrategy;
    }

    const hasTimeFilter =
      query.includes('created_at') ||
      query.includes('updated_at') ||
      variables.start_date ||
      variables.end_date ||
      variables.startDate ||
      variables.endDate;

    if (hasTimeFilter && estimatedRecords > 2000) {
      return 'time';
    }

    const hasIdField = query.includes('id') && !query.includes('offset');
    if (hasIdField && estimatedRecords > 1000) {
      return 'cursor';
    }

    const hasSorting = query.includes('sort') || query.includes('order');
    if (hasSorting && estimatedRecords > 5000) {
      return 'keyset';
    }

    return 'offset';
  }

  estimateChunkCount(
    estimatedRecords: number,
    strategy: ShardStrategyV2
  ): { shardCount: number; pageSize: number } {
    const { maxRecordsPerShard, maxShards, minShardSize, maxConcurrency } = this.options;

    let optimalPageSize = maxRecordsPerShard;

    if (strategy === 'cursor' || strategy === 'keyset') {
      optimalPageSize = Math.floor(maxRecordsPerShard * 1.5);
    }

    if (strategy === 'parallel_cursor') {
      optimalPageSize = Math.floor(maxRecordsPerShard / 2);
    }

    let shardCount = Math.ceil(estimatedRecords / optimalPageSize);
    shardCount = Math.max(1, Math.min(shardCount, maxShards));

    if (shardCount < maxConcurrency && estimatedRecords > minShardSize) {
      const adjustedCount = Math.min(maxConcurrency, maxShards);
      if (adjustedCount > shardCount) {
        shardCount = adjustedCount;
        optimalPageSize = Math.ceil(estimatedRecords / shardCount);
      }
    }

    return { shardCount, pageSize: optimalPageSize };
  }

  calculateOptimalPageSize(
    estimatedRecords: number,
    strategy: ShardStrategyV2,
    targetShardCount?: number
  ): number {
    const { maxRecordsPerShard, minShardSize, maxShards } = this.options;

    if (targetShardCount) {
      const targetSize = Math.ceil(estimatedRecords / targetShardCount);
      return Math.max(minShardSize, Math.min(targetSize, maxRecordsPerShard * 2));
    }

    const { pageSize } = this.estimateChunkCount(estimatedRecords, strategy);
    return pageSize;
  }

  createPlan(
    query: string,
    variables: Record<string, unknown>,
    estimatedRecords: number
  ): ShardPlanV2 {
    const strategy = this.decideStrategy(query, variables, estimatedRecords);
    const { shardCount, pageSize } = this.estimateChunkCount(estimatedRecords, strategy);

    const shards: ShardInfoV2[] = [];

    for (let i = 0; i < shardCount; i++) {
      const shardVariables = this.generateShardVariables(
        variables,
        strategy,
        i,
        shardCount,
        pageSize,
        estimatedRecords
      );
      const estimatedShardRecords = Math.min(pageSize, estimatedRecords - i * pageSize);

      shards.push({
        index: i,
        variables: shardVariables,
        estimatedSize: estimatedShardRecords,
        status: 'pending',
        retryCount: 0,
      });
    }

    return {
      shards,
      strategy,
      totalEstimatedRecords: estimatedRecords,
      optimalPageSize: pageSize,
    };
  }

  private generateShardVariables(
    baseVariables: Record<string, unknown>,
    strategy: ShardStrategyV2,
    shardIndex: number,
    totalShards: number,
    pageSize: number,
    totalRecords: number
  ): Record<string, unknown> {
    const variables = { ...baseVariables };

    switch (strategy) {
      case 'offset':
        variables.page = shardIndex + 1;
        variables.pageSize = pageSize;
        variables.offset = shardIndex * pageSize;
        variables.limit = pageSize;
        break;

      case 'time': {
        const startDate = baseVariables.start_date
          ? new Date(baseVariables.start_date as string)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = baseVariables.end_date
          ? new Date(baseVariables.end_date as string)
          : new Date();
        const totalMs = endDate.getTime() - startDate.getTime();
        const shardMs = totalMs / totalShards;
        const shardStart = new Date(startDate.getTime() + shardIndex * shardMs);
        const shardEnd = new Date(startDate.getTime() + (shardIndex + 1) * shardMs);
        variables.start_date = shardStart.toISOString();
        variables.end_date = shardEnd.toISOString();
        break;
      }

      case 'id_range':
      case 'cursor':
      case 'keyset':
        variables.page = shardIndex + 1;
        variables.pageSize = pageSize;
        if (shardIndex > 0) {
          variables.cursor = `cursor_${shardIndex}`;
        }
        break;

      case 'parallel_cursor':
        variables.page = shardIndex + 1;
        variables.pageSize = pageSize;
        variables.parallel_index = shardIndex;
        variables.parallel_total = totalShards;
        break;
    }

    return variables;
  }
}

// ============ ProgressiveLoader: 渐进式加载 ============

export class ProgressiveLoader<T = unknown> {
  private query: string;
  private plan: ShardPlanV2;
  private options: Required<ProgressiveLoadOptions>;
  private retryConfig: RetryConfig;
  private results: Map<number, T> = new Map();
  private errors: Map<number, Error> = new Map();
  private isCancelled = false;
  private activePromises: Map<number, Promise<void>> = new Map();

  constructor(
    query: string,
    plan: ShardPlanV2,
    options: ProgressiveLoadOptions = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.query = query;
    this.plan = plan;
    this.options = {
      initialPageSize: options.initialPageSize ?? 1,
      backgroundConcurrency: options.backgroundConcurrency ?? 3,
      priorityOrder: options.priorityOrder ?? 'first',
      onProgress: options.onProgress ?? (() => {}),
      onShardComplete: options.onShardComplete ?? (() => {}),
      onComplete: options.onComplete ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async loadProgressively(): Promise<T[]> {
    const { priorityOrder, initialPageSize } = this.options;

    const orderedShards = this.orderShardsByPriority(this.plan.shards, priorityOrder);

    const initialShards = orderedShards.slice(0, initialPageSize);
    const backgroundShards = orderedShards.slice(initialPageSize);

    await this.loadInitialShards(initialShards);

    if (!this.isCancelled && backgroundShards.length > 0) {
      this.loadBackgroundShards(backgroundShards).catch((err) => {
        shardV2Logger.error('后台分片加载失败:', err);
      });
    }

    return this.getSortedResults();
  }

  private orderShardsByPriority(
    shards: ShardInfoV2[],
    order: ProgressiveLoadOptions['priorityOrder']
  ): ShardInfoV2[] {
    const copy = [...shards];
    switch (order) {
      case 'first':
        return copy.sort((a, b) => a.index - b.index);
      case 'last':
        return copy.sort((a, b) => b.index - a.index);
      case 'middle-out': {
        const mid = Math.floor(copy.length / 2);
        const result: ShardInfoV2[] = [];
        for (let i = 0; i <= mid; i++) {
          if (mid - i >= 0) result.push(copy[mid - i]);
          if (i !== 0 && mid + i < copy.length) result.push(copy[mid + i]);
        }
        return result;
      }
      default:
        return copy;
    }
  }

  private async loadInitialShards(shards: ShardInfoV2[]): Promise<void> {
    await Promise.all(shards.map((shard) => this.executeShard(shard)));
    this.notifyProgress();
  }

  private async loadBackgroundShards(shards: ShardInfoV2[]): Promise<void> {
    const { backgroundConcurrency } = this.options;
    let index = 0;

    while (index < shards.length && !this.isCancelled) {
      const batch = shards.slice(index, index + backgroundConcurrency);
      await Promise.all(batch.map((shard) => this.executeShard(shard)));
      this.notifyProgress();
      index += backgroundConcurrency;
    }

    if (!this.isCancelled) {
      this.options.onComplete(this.getSortedResults());
    }
  }

  private async executeShard(shard: ShardInfoV2): Promise<void> {
    if (this.isCancelled) return;

    shard.status = 'loading';
    shard.startTime = Date.now();

    const executeWithRetry = async (attempt: number): Promise<void> => {
      if (this.isCancelled) return;

      try {
        const result = await bffGraphQL<T>(this.query, shard.variables);
        shard.status = 'success';
        shard.endTime = Date.now();
        shard.duration = shard.endTime - shard.startTime!;
        this.results.set(shard.index, result);
        this.options.onShardComplete(shard.index, result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        shard.retryCount = attempt;

        if (attempt < this.retryConfig.maxAttempts) {
          shard.status = 'retrying';
          const delay = calculateBackoffDelay(attempt, this.retryConfig);
          await sleep(delay);
          return executeWithRetry(attempt + 1);
        }

        shard.status = 'failed';
        shard.endTime = Date.now();
        shard.duration = shard.endTime - shard.startTime!;
        this.errors.set(shard.index, error);
        this.options.onError(shard.index, error);
      }
    };

    const promise = executeWithRetry(0);
    this.activePromises.set(shard.index, promise);
    await promise;
    this.activePromises.delete(shard.index);
  }

  private notifyProgress(): void {
    const total = this.plan.shards.length;
    const completed = this.results.size + this.errors.size;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    this.options.onProgress(progress, completed, total);
  }

  getSortedResults(): T[] {
    return Array.from(this.results.entries())
      .sort(([a], [b]) => a - b)
      .map(([, data]) => data);
  }

  getMetrics(): ShardMetrics {
    const totalShards = this.plan.shards.length;
    const successCount = this.results.size;
    const failedCount = this.errors.size;
    const totalRetryCount = this.plan.shards.reduce((sum, s) => sum + s.retryCount, 0);

    const durations = this.plan.shards
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration!);
    const totalTime = durations.length > 0 ? Math.max(...durations) : 0;
    const avgTime =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const totalRecords = this.plan.totalEstimatedRecords;
    const throughput = totalTime > 0 ? (totalRecords / totalTime) * 1000 : 0;

    return {
      shard_count: totalShards,
      total_time: totalTime,
      avg_shard_time: avgTime,
      failed_shards: failedCount,
      retry_count: totalRetryCount,
      success_rate: totalShards > 0 ? successCount / totalShards : 0,
      throughput,
    };
  }

  cancel(): void {
    this.isCancelled = true;
    shardV2Logger.info('渐进式加载已取消');
  }

  get isCompleted(): boolean {
    return this.results.size + this.errors.size >= this.plan.shards.length;
  }
}

// ============ 并行分片执行 ============

export async function executeParallelShards<T>(
  query: string,
  plan: ShardPlanV2,
  options: {
    maxConcurrency?: number;
    retryConfig?: Partial<RetryConfig>;
    onProgress?: (progress: number, completed: number, total: number) => void;
  } = {}
): Promise<ShardExecuteResultV2<T>> {
  const { maxConcurrency = DEFAULT_MAX_CONCURRENCY, retryConfig: retryOpts, onProgress } = options;
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryOpts };

  const results: Map<number, T> = new Map();
  const errors: Array<{ shardIndex: number; error: Error; attempt: number }> = [];
  const shards = [...plan.shards];
  let completed = 0;

  const executeShard = async (shard: ShardInfoV2): Promise<void> => {
    shard.status = 'loading';
    shard.startTime = Date.now();

    for (let attempt = 0; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await bffGraphQL<T>(query, shard.variables);
        shard.status = 'success';
        shard.endTime = Date.now();
        shard.duration = shard.endTime - shard.startTime!;
        results.set(shard.index, result);
        break;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        shard.retryCount = attempt;

        if (attempt < retryConfig.maxAttempts) {
          shard.status = 'retrying';
          const delay = calculateBackoffDelay(attempt, retryConfig);
          await sleep(delay);
        } else {
          shard.status = 'failed';
          shard.endTime = Date.now();
          shard.duration = shard.endTime - shard.startTime!;
          errors.push({ shardIndex: shard.index, error, attempt });
        }
      }
    }

    completed++;
    onProgress?.((completed / shards.length) * 100, completed, shards.length);
  };

  const workers = Math.min(maxConcurrency, shards.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < shards.length) {
      const shardIndex = currentIndex++;
      await executeShard(shards[shardIndex]);
    }
  };

  const workerPromises = Array.from({ length: workers }, () => worker());
  await Promise.all(workerPromises);

  const sortedResults = Array.from(results.entries())
    .sort(([a], [b]) => a - b)
    .map(([, data]) => data);

  const durations = shards.filter((s) => s.duration !== undefined).map((s) => s.duration!);
  const totalTime = durations.length > 0 ? Math.max(...durations) : 0;
  const avgTime =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const totalRetryCount = shards.reduce((sum, s) => sum + s.retryCount, 0);
  const successRate = shards.length > 0 ? results.size / shards.length : 0;
  const throughput = totalTime > 0 ? (plan.totalEstimatedRecords / totalTime) * 1000 : 0;

  return {
    data: sortedResults,
    errors,
    completedCount: results.size,
    totalCount: shards.length,
    metrics: {
      shard_count: shards.length,
      total_time: totalTime,
      avg_shard_time: avgTime,
      failed_shards: errors.length,
      retry_count: totalRetryCount,
      success_rate: successRate,
      throughput,
    },
  };
}

export default {
  SmartShardingDecider,
  ProgressiveLoader,
  executeParallelShards,
};
