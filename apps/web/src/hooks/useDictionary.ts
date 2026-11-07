/**
 * useDictionary —— 统一字典读取层（最小实现）
 *
 * 背景：项目此前没有 useDict / useDictionary / dictStore 等消费层 hook
 * （只有 admin/DictionaryManagementPage.tsx 字典管理页）。本模块在没有现成轮子的
 * 情况下，提供一个最小、可复用的字典读取能力，避免每个页面各自发请求。
 *
 * 能力：
 *   - useDictionary(resourceKey) → { items, loading, error, getNameZh, fromSourceValue }
 *   - 同一 resourceKey 在一次会话内只请求一次（React Query 缓存 + 模块级同步缓存）
 *   - 失败优雅降级：字典接口失败时 items 为空，getNameZh/fromSourceValue 回退原值，页面不崩
 *
 * 同步读取（供 schema.renderCell 等非 React 上下文使用）：
 *   - getNameZhSync(resourceKey, code)
 *   - fromSourceValueSync(resourceKey, sourceValue)
 *
 * 已注册字典：
 *   - 'supplierCategory' → GET /api/master-data/supplier-categories
 */
import { useQuery } from '@tanstack/react-query';
import { apiLogger } from '../utils/logger';
import {
  masterDataSupplierCategoriesApi,
  type MasterDataSupplierCategory,
} from '../api/master-data/supplierCategories';

// ============ 字典 loader 注册表 ============

type DictionaryItem = {
  code: string;
  name_zh: string;
  name_en?: string | null;
  source_values?: Record<string, string> | null;
};

type DictionaryLoader = () => Promise<DictionaryItem[]>;

const DICTIONARY_LOADERS: Record<string, DictionaryLoader> = {
  /**
   * 供应商类别字典。
   * 字典项示例：{ code: 'raw_material', name_zh: '原材料',
   *   source_values: { scm: 'raw_material', srm: '原材料' } }
   */
  supplierCategory: async () => {
    const res = await masterDataSupplierCategoriesApi.list();
    if (!res.success || !Array.isArray(res.data)) {
      throw new Error(res.message || 'Failed to load supplier category dictionary');
    }
    return res.data as MasterDataSupplierCategory[];
  },
};

// ============ 模块级同步缓存（供 renderCell 等非 React 上下文读取） ============

/**
 * resourceKey → 字典项数组。
 * hook 拉到数据后写入此处；renderCell 里的同步函数直接读这里。
 * 会话级缓存，不持久化。
 */
const dictionaryCache = new Map<string, DictionaryItem[]>();

/** 登记未映射的 code（用于回归报告，不影响渲染） */
const unmappedCodes = new Map<string, Set<string>>();

function recordUnmapped(resourceKey: string, value: string): void {
  let set = unmappedCodes.get(resourceKey);
  if (!set) {
    set = new Set<string>();
    unmappedCodes.set(resourceKey, set);
  }
  if (!set.has(value)) {
    set.add(value);
    apiLogger.warn(
      `[useDictionary] ${resourceKey} unmapped value: "${value}", falling back to raw value`
    );
  }
}

/** 获取未映射值计数（供回归报告） */
export function getUnmappedCount(resourceKey?: string): number {
  if (resourceKey) return unmappedCodes.get(resourceKey)?.size ?? 0;
  let total = 0;
  unmappedCodes.forEach((s) => (total += s.size));
  return total;
}

// ============ 同步查询函数（供 schema.renderCell 等非 React 上下文使用） ============

/** 按 code 取中文名；code 为空或未命中时回退 fallback（默认空串，调用方可传原值） */
export function getNameZhSync(resourceKey: string, code: unknown, fallback = ''): string {
  if (code === null || code === undefined || code === '') return fallback;
  const items = dictionaryCache.get(resourceKey);
  if (!items || items.length === 0) return fallback || String(code);
  const hit = items.find((it) => it.code === code);
  if (hit) return hit.name_zh;
  recordUnmapped(resourceKey, String(code));
  return fallback || String(code);
}

/**
 * 历史自由文本 → 标准 code。
 * 遍历字典项的 source_values，找任一上游系统值（scm/srm/raw_material 等）匹配，
 * 同时也直接匹配 code 本身。未命中返回 undefined。
 */
export function fromSourceValueSync(resourceKey: string, sourceValue: unknown): string | undefined {
  if (sourceValue === null || sourceValue === undefined || sourceValue === '') return undefined;
  const v = String(sourceValue);
  const items = dictionaryCache.get(resourceKey);
  if (!items || items.length === 0) return undefined;
  // 1. 直接按 code 匹配
  const byCode = items.find((it) => it.code === v);
  if (byCode) return byCode.code;
  // 2. 按 source_values 反查
  for (const it of items) {
    const sv = it.source_values;
    if (sv && Object.values(sv).includes(v)) return it.code;
  }
  return undefined;
}

// ============ React Hook ============

export interface UseDictionaryResult<T extends DictionaryItem = DictionaryItem> {
  items: T[];
  loading: boolean;
  error: Error | null;
  /** 按 code 取中文名；未命中回退原值 */
  getNameZh: (code: unknown, fallback?: string) => string;
  /** 历史自由文本 → 标准 code；未命中返回 undefined */
  fromSourceValue: (sourceValue: unknown) => string | undefined;
}

/**
 * 统一字典读取 hook。
 *
 * @example
 * ```tsx
 * const { items, getNameZh } = useDictionary('supplierCategory');
 * // items = [{ code: 'raw_material', name_zh: '原材料', ... }]
 * // getNameZh('raw_material') → '原材料'
 * // getNameZh('unknown_code', 'raw_material') → 'raw_material'（回退原值）
 * ```
 */
export function useDictionary<T extends DictionaryItem = DictionaryItem>(
  resourceKey: string
): UseDictionaryResult<T> {
  const loader = DICTIONARY_LOADERS[resourceKey];

  const query = useQuery<DictionaryItem[], Error>({
    queryKey: ['dictionary', resourceKey],
    queryFn: async () => {
      if (!loader) {
        apiLogger.warn(`[useDictionary] unregistered resourceKey: ${resourceKey}`);
        return [];
      }
      try {
        const data = await loader();
        // 写入模块级同步缓存（供 renderCell 使用）
        dictionaryCache.set(resourceKey, data);
        return data;
      } catch (e) {
        // 失败优雅降级：不抛错，items 为空，渲染层回退原值
        apiLogger.warn(
          `[useDictionary] ${resourceKey} load failed, degraded to empty dictionary`,
          e
        );
        // 保留旧缓存（如果有），不覆盖
        if (!dictionaryCache.has(resourceKey)) {
          dictionaryCache.set(resourceKey, []);
        }
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内不重拉
    retry: 1, // 字典失败不重试太多次
    refetchOnWindowFocus: false,
  });

  const items = (query.data ?? []) as unknown as T[];

  const getNameZh = (code: unknown, fallback = ''): string => {
    if (code === null || code === undefined || code === '') return fallback;
    const hit = items.find((it) => it.code === code);
    if (hit) return hit.name_zh;
    recordUnmapped(resourceKey, String(code));
    return fallback || String(code);
  };

  const fromSourceValue = (sourceValue: unknown): string | undefined => {
    if (sourceValue === null || sourceValue === undefined || sourceValue === '') return undefined;
    const v = String(sourceValue);
    const byCode = items.find((it) => it.code === v);
    if (byCode) return byCode.code;
    for (const it of items) {
      const sv = it.source_values;
      if (sv && Object.values(sv).includes(v)) return it.code;
    }
    return undefined;
  };

  return {
    items,
    loading: query.isLoading,
    error: query.error ?? null,
    getNameZh,
    fromSourceValue,
  };
}

export default useDictionary;
