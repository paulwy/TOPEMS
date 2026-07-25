/**
 * V41.0 Track D: 查询自动分片工具
 *
 * 功能:
 * - 判断是否需要分片（基于成本分析和预估数据量）
 * - 生成分片查询计划（时间范围/ID范围/分页偏移）
 * - 执行分片查询（并发/顺序、合并结果、进度回调、失败重试）
 */

import { analyzeQueryCost } from './query-cost-analyzer';
import { logger } from './logger';

const shardLogger = logger.child({ prefix: 'QuerySharding' });

export type ShardStrategy = 'time' | 'id_range' | 'offset';

export interface ShardInfo {
  index: number;
  variables: Record<string, unknown>;
  estimatedSize: number;
}

export interface ShardPlan {
  shards: ShardInfo[];
  strategy: ShardStrategy;
  totalEstimatedRecords: number;
}

export interface ShardOptions {
  maxConcurrency?: number;
  retryAttempts?: number;
  onProgress?: (progress: number, completed: number, total: number) => void;
  maxRecordsPerShard?: number;
  preferredStrategy?: ShardStrategy;
}

export interface ShardExecuteResult<T> {
  data: T[];
  errors: Array<{ shardIndex: number; error: Error }>;
  completedCount: number;
  totalCount: number;
}

const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_MAX_RECORDS_PER_SHARD = 500;
const SHARD_THRESHOLD_SCORE = 200;
const SHARD_THRESHOLD_ESTIMATED_RECORDS = 1000;

function estimateTotalRecords(query: string, variables?: Record<string, unknown>): number {
  const analysis = analyzeQueryCost(query, variables);
  const estimatedFromFields = analysis.fieldCount * 10;
  const estimatedFromSize = analysis.estimatedSizeKB * 4;
  return Math.max(estimatedFromFields, estimatedFromSize, 100);
}

export function shouldShard(
  query: string,
  variables?: Record<string, unknown>,
  options?: ShardOptions
): { shouldShard: boolean; reason: string; estimatedRecords: number; score: number } {
  const analysis = analyzeQueryCost(query, variables);
  const estimatedRecords = estimateTotalRecords(query, variables);
  const maxRecords = options?.maxRecordsPerShard ?? DEFAULT_MAX_RECORDS_PER_SHARD;

  if (analysis.score >= SHARD_THRESHOLD_SCORE) {
    return {
      shouldShard: true,
      reason: `查询成本过高(${analysis.score}分)，建议分片`,
      estimatedRecords,
      score: analysis.score,
    };
  }

  if (estimatedRecords >= SHARD_THRESHOLD_ESTIMATED_RECORDS) {
    return {
      shouldShard: true,
      reason: `预估数据量过大(${estimatedRecords}条)，建议分片`,
      estimatedRecords,
      score: analysis.score,
    };
  }

  if (variables?.total && typeof variables.total === 'number' && variables.total > maxRecords) {
    return {
      shouldShard: true,
      reason: `总记录数(${variables.total})超过单分片限制(${maxRecords})`,
      estimatedRecords: variables.total,
      score: analysis.score,
    };
  }

  return {
    shouldShard: false,
    reason: '查询成本在可接受范围内，无需分片',
    estimatedRecords,
    score: analysis.score,
  };
}

export function shardQuery(
  query: string,
  variables: Record<string, unknown> = {},
  options: ShardOptions = {}
): ShardPlan {
  const maxRecordsPerShard = options.maxRecordsPerShard ?? DEFAULT_MAX_RECORDS_PER_SHARD;
  const estimatedTotal = estimateTotalRecords(query, variables);
  const strategy = determineStrategy(query, variables, options);

  const totalRecords = (variables.total as number) || (variables.count as number) || estimatedTotal;

  const shardCount = Math.max(1, Math.ceil(totalRecords / maxRecordsPerShard));

  const shards: ShardInfo[] = [];

  for (let i = 0; i < shardCount; i++) {
    const shardVariables = generateShardVariables(
      variables,
      strategy,
      i,
      shardCount,
      maxRecordsPerShard,
      totalRecords
    );

    const estimatedShardRecords = Math.min(
      maxRecordsPerShard,
      totalRecords - i * maxRecordsPerShard
    );

    shards.push({
      index: i,
      variables: shardVariables,
      estimatedSize: estimatedShardRecords,
    });
  }

  return {
    shards,
    strategy,
    totalEstimatedRecords: totalRecords,
  };
}

function determineStrategy(
  query: string,
  variables: Record<string, unknown>,
  options: ShardOptions
): ShardStrategy {
  if (options.preferredStrategy) return options.preferredStrategy;

  const hasTimeRange =
    variables.startDate ||
    variables.endDate ||
    variables.startTime ||
    variables.endTime ||
    variables.from ||
    variables.to;

  if (hasTimeRange) return 'time';

  const hasIdRange = variables.startId || variables.endId || variables.after || variables.before;

  if (hasIdRange) return 'id_range';

  return 'offset';
}

function generateShardVariables(
  baseVariables: Record<string, unknown>,
  strategy: ShardStrategy,
  shardIndex: number,
  shardCount: number,
  pageSize: number,
  totalRecords: number
): Record<string, unknown> {
  const variables = { ...baseVariables };

  switch (strategy) {
    case 'time':
      return generateTimeShardVariables(variables, shardIndex, shardCount);

    case 'id_range':
      return generateIdRangeShardVariables(variables, shardIndex, shardCount);

    case 'offset':
    default:
      variables.page = shardIndex + 1;
      variables.pageSize = pageSize;
      variables.offset = shardIndex * pageSize;
      variables.limit = pageSize;
      variables.first = pageSize;
      variables.skip = shardIndex * pageSize;
      return variables;
  }
}

function generateTimeShardVariables(
  variables: Record<string, unknown>,
  shardIndex: number,
  shardCount: number
): Record<string, unknown> {
  const result = { ...variables };

  const startDate = variables.startDate || variables.startTime || variables.from;
  const endDate = variables.endDate || variables.endTime || variables.to;

  if (startDate && endDate) {
    const start = new Date(startDate as string).getTime();
    const end = new Date(endDate as string).getTime();
    const chunk = (end - start) / shardCount;

    const shardStart = new Date(start + chunk * shardIndex);
    const shardEnd = new Date(start + chunk * (shardIndex + 1));

    result.startDate = shardStart.toISOString();
    result.endDate = shardEnd.toISOString();
    result.from = shardStart.toISOString();
    result.to = shardEnd.toISOString();
  }

  return result;
}

function generateIdRangeShardVariables(
  variables: Record<string, unknown>,
  shardIndex: number,
  shardCount: number
): Record<string, unknown> {
  const result = { ...variables };

  const startId = variables.startId || (variables.after as string) || '0';
  const endId = variables.endId || (variables.before as string) || 'ffffffff';

  if (shardCount > 1) {
    const startNum = parseInt(String(startId), 36) || 0;
    const endNum = parseInt(String(endId), 36) || Number.MAX_SAFE_INTEGER;
    const range = endNum - startNum;
    const chunk = Math.floor(range / shardCount);

    result.startId = (startNum + chunk * shardIndex).toString(36);
    result.endId = (startNum + chunk * (shardIndex + 1)).toString(36);
    result.after = result.startId;
    result.before = result.endId;
  }

  return result;
}

async function executeWithRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts) {
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Unknown error');
}

export async function executeShardedQuery<T>(
  executeFn: (variables: Record<string, unknown>) => Promise<T>,
  shardPlan: ShardPlan,
  options: ShardOptions = {}
): Promise<ShardExecuteResult<T>> {
  const {
    maxConcurrency = DEFAULT_MAX_CONCURRENCY,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    onProgress,
  } = options;

  const results: T[] = [];
  const errors: Array<{ shardIndex: number; error: Error }> = [];
  let completedCount = 0;
  const totalCount = shardPlan.shards.length;

  shardLogger.info(
    `开始执行分片查询: ${totalCount}个分片, 策略: ${shardPlan.strategy}, 最大并发: ${maxConcurrency}`
  );

  const shards = [...shardPlan.shards];

  async function processNext(): Promise<void> {
    while (shards.length > 0) {
      const shard = shards.shift();
      if (!shard) break;

      try {
        const result = await executeWithRetry(() => executeFn(shard.variables), retryAttempts);
        results[shard.index] = result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ shardIndex: shard.index, error: err });
        shardLogger.error(`分片 ${shard.index} 执行失败: ${err.message}`);
      } finally {
        completedCount++;
        const progress = (completedCount / totalCount) * 100;
        onProgress?.(progress, completedCount, totalCount);
      }
    }
  }

  const concurrency = Math.min(maxConcurrency, totalCount);
  const workers: Promise<void>[] = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);

  const successCount = totalCount - errors.length;
  shardLogger.info(`分片查询完成: 成功${successCount}/${totalCount}, 失败${errors.length}`);

  return {
    data: results.filter((r): r is T => r !== undefined),
    errors,
    completedCount: successCount,
    totalCount,
  };
}

export function mergePaginatedResults<T>(
  results: Array<{ items: T[]; total?: number; [key: string]: unknown }>
): { items: T[]; total: number; mergedFrom: number } {
  const allItems: T[] = [];
  let total = 0;

  for (const result of results) {
    if (result.items) {
      allItems.push(...result.items);
    }
    if (result.total && result.total > total) {
      total = result.total;
    }
  }

  return {
    items: allItems,
    total: total || allItems.length,
    mergedFrom: results.length,
  };
}

export function mergeArrayResults<T>(results: T[][]): T[] {
  return results.flat();
}

export default {
  shouldShard,
  shardQuery,
  executeShardedQuery,
  mergePaginatedResults,
  mergeArrayResults,
};
