/**
 * V41.0 Track D: 查询成本分析 Hook
 *
 * 功能:
 * - 自动分析查询成本
 * - 成本变化时回调
 * - 高成本查询自动告警
 * - 验证查询是否在成本限制内
 */

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  analyzeQueryCost,
  validateQuery,
  getCostLevelColor,
  getCostLevelLabel,
  type QueryCostAnalysis,
  type CostLevel,
} from '@/utils/queryCostAnalyzer';
import i18n from '@/i18n';
import { parseQueryName } from '@/utils/graphqlPerformance';
import { logger } from '@/utils/logger';

const costLogger = logger.child({ prefix: 'QueryCost' });

export type HighCostCallback = (analysis: QueryCostAnalysis, queryName: string) => void;

export interface UseQueryCostOptions {
  maxScore?: number;
  warnOnHighCost?: boolean;
  onHighCost?: HighCostCallback;
  autoAnalyze?: boolean;
}

export interface UseQueryCostResult {
  cost: QueryCostAnalysis;
  isHighCost: boolean;
  isCritical: boolean;
  optimizationSuggestions: string[];
  costLevel: CostLevel;
  costColor: string;
  costLabel: string;
  validateQuery: (
    query: string,
    maxScore?: number
  ) => {
    valid: boolean;
    score: number;
    reason: string;
  };
  analyzeQuery: (query: string, variables?: Record<string, unknown>) => QueryCostAnalysis;
  getCostLevelColor: (level: CostLevel) => string;
  getCostLevelLabel: (level: CostLevel) => string;
}

const DEFAULT_MAX_SCORE = 500;
const HIGH_COST_THRESHOLD = 200;
const CRITICAL_COST_THRESHOLD = 500;

const warnedQueries = new Set<string>();

export function useQueryCost(
  query?: string,
  variables?: Record<string, unknown>,
  options: UseQueryCostOptions = {}
): UseQueryCostResult {
  const {
    maxScore = DEFAULT_MAX_SCORE,
    warnOnHighCost = true,
    onHighCost,
    autoAnalyze = true,
  } = options;

  const [analysisCache, setAnalysisCache] = useState<Map<string, QueryCostAnalysis>>(new Map());
  const lastWarnedRef = useRef<Map<string, number>>(new Map());

  const cost = useMemo<QueryCostAnalysis>(() => {
    if (!query || !autoAnalyze) {
      return {
        score: 0,
        level: 'low' as CostLevel,
        fieldCount: 0,
        depth: 0,
        estimatedSizeKB: 0,
        suggestions: [i18n.t('shared.use_query_cost.k0')],
      };
    }

    const cacheKey = query + JSON.stringify(variables || {});
    const cached = analysisCache.get(cacheKey);
    if (cached) return cached;

    const result = analyzeQueryCost(query, variables);

    setAnalysisCache((prev) => {
      const next = new Map(prev);
      next.set(cacheKey, result);
      if (next.size > 100) {
        const firstKey = next.keys().next().value;
        if (firstKey) next.delete(firstKey);
      }
      return next;
    });

    return result;
  }, [query, variables, autoAnalyze, analysisCache]);

  const isHighCost = cost.score > HIGH_COST_THRESHOLD;
  const isCritical = cost.score > CRITICAL_COST_THRESHOLD;
  const optimizationSuggestions = cost.suggestions;
  const costLevel = cost.level;
  const costColor = getCostLevelColor(cost.level);
  const costLabel = getCostLevelLabel(cost.level);

  useEffect(() => {
    if (!query || !warnOnHighCost || !isHighCost) return;

    const queryName = parseQueryName(query);
    const lastWarned = lastWarnedRef.current.get(queryName) || 0;
    const now = Date.now();

    if (now - lastWarned < 60000) return;

    lastWarnedRef.current.set(queryName, now);

    if (!warnedQueries.has(queryName)) {
      warnedQueries.add(queryName);
      costLogger.warn(
        `${i18n.t('shared.use_query_cost.k0')}${queryName}${i18n.t('shared.use_query_cost.k1')}${cost.score}${i18n.t('shared.use_query_cost.k2')}${costLabel}`
      );
    }

    onHighCost?.(cost, queryName);
  }, [query, warnOnHighCost, isHighCost, cost, costLabel, onHighCost]);

  const validateQueryFn = useCallback(
    (queryToValidate: string, customMaxScore?: number) => {
      return validateQuery(queryToValidate, customMaxScore ?? maxScore);
    },
    [maxScore]
  );

  const analyzeQueryFn = useCallback((queryToAnalyze: string, vars?: Record<string, unknown>) => {
    return analyzeQueryCost(queryToAnalyze, vars);
  }, []);

  return {
    cost,
    isHighCost,
    isCritical,
    optimizationSuggestions,
    costLevel,
    costColor,
    costLabel,
    validateQuery: validateQueryFn,
    analyzeQuery: analyzeQueryFn,
    getCostLevelColor,
    getCostLevelLabel,
  };
}

export default useQueryCost;
