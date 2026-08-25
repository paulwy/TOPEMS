/**
 * 服务端排序/筛选参数规范
 *
 * 提供统一的参数映射层，将前端标准化的列表状态（搜索/筛选/排序/分页）
 * 转换为后端期望的参数格式。支持多种后端风格预设。
 *
 * 后端参数风格约定：
 * - standard (默认)：page, pagesize, keyword, sortBy, sortOrder, 筛选字段平铺
 * - nested : 筛选放在 filters 对象里 { page, pagesize, filters: { ... }, sort: { field, order } }
 * - offset : 用 offset/limit 代替 page/pagesize
 */

type BackendParamStyle = 'standard' | 'nested' | 'offset';

interface ListStateParams {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  filters: Record<string, unknown>;
}

interface ParamMappingOptions {
  /** 后端参数风格，默认 'standard' */
  style?: BackendParamStyle;
  /** 搜索参数名，默认 'keyword' */
  searchParamName?: string;
  /** 排序字段参数名，默认 'sortBy'（standard 风格） */
  sortByParamName?: string;
  /** 排序方向参数名，默认 'sortOrder'（standard 风格） */
  sortOrderParamName?: string;
  /** 分页参数名（当前页），默认 'page' */
  pageParamName?: string;
  /** 每页条数参数名，默认 'pagesize' */
  pageSizeParamName?: string;
  /** 起始偏移参数名（offset 风格），默认 'offset' */
  offsetParamName?: string;
  /** 嵌套筛选的外层 key（nested 风格），默认 'filters' */
  filtersKey?: string;
  /** 嵌套排序的外层 key（nested 风格），默认 'sort' */
  sortKey?: string;
  /** 嵌套排序的字段 key（nested 风格），默认 'field' */
  sortFieldKey?: string;
  /** 嵌套排序的方向 key（nested 风格），默认 'order' */
  sortOrderKey?: string;
  /** 排序方向值映射，默认 { asc: 'asc', desc: 'desc' } */
  sortOrderValues?: { asc: string; desc: string };
  /** 自定义字段名映射（前端字段名 -> 后端字段名） */
  fieldMapping?: Record<string, string>;
}

/**
 * 将前端列表状态转换为后端请求参数
 *
 * @param state 前端列表状态
 * @param options 映射配置
 * @returns 后端可接受的参数对象
 */
export function mapListParamsToBackend(
  state: ListStateParams,
  options: ParamMappingOptions = {}
): Record<string, unknown> {
  const {
    style = 'standard',
    searchParamName = 'keyword',
    sortByParamName = 'sortBy',
    sortOrderParamName = 'sortOrder',
    pageParamName = 'page',
    pageSizeParamName = 'pagesize',
    offsetParamName = 'offset',
    filtersKey = 'filters',
    sortKey = 'sort',
    sortFieldKey = 'field',
    sortOrderKey = 'order',
    sortOrderValues = { asc: 'asc', desc: 'desc' },
    fieldMapping = {},
  } = options;

  const mapField = (field: string): string => fieldMapping[field] ?? field;

  // 处理字段映射
  const mappedFilters: Record<string, unknown> = {};
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      mappedFilters[mapField(key)] = value;
    }
  });

  const mappedSortBy = state.sortBy ? mapField(state.sortBy) : '';
  const mappedSortOrder = sortOrderValues[state.sortOrder] ?? state.sortOrder;

  if (style === 'nested') {
    const params: Record<string, unknown> = {};
    params[pageParamName] = state.page;
    params[pageSizeParamName] = state.pageSize;
    if (state.search) params[searchParamName] = state.search;
    if (Object.keys(mappedFilters).length > 0) {
      params[filtersKey] = mappedFilters;
    }
    if (mappedSortBy) {
      params[sortKey] = {
        [sortFieldKey]: mappedSortBy,
        [sortOrderKey]: mappedSortOrder,
      };
    }
    return params;
  }

  if (style === 'offset') {
    const params: Record<string, unknown> = {};
    params[offsetParamName] = (state.page - 1) * state.pageSize;
    params[pageSizeParamName] = state.pageSize;
    if (state.search) params[searchParamName] = state.search;
    if (mappedSortBy) {
      params[sortByParamName] = mappedSortBy;
      params[sortOrderParamName] = mappedSortOrder;
    }
    Object.assign(params, mappedFilters);
    return params;
  }

  // standard 风格：平铺
  const params: Record<string, unknown> = {};
  params[pageParamName] = state.page;
  params[pageSizeParamName] = state.pageSize;
  if (state.search) params[searchParamName] = state.search;
  if (mappedSortBy) {
    params[sortByParamName] = mappedSortBy;
    params[sortOrderParamName] = mappedSortOrder;
  }
  Object.assign(params, mappedFilters);
  return params;
}

function parsePaginationFromResponse(
  response: Record<string, unknown>,
  _style: BackendParamStyle = 'standard'
): { items: unknown[]; total: number; page: number; pageSize: number } {
  const data = (response.data ?? response) as Record<string, unknown>;
  const total = (data.total as number) ?? 0;
  const page = (data.page as number) ?? (data.current as number) ?? 1;
  const pageSize =
    (data.pagesize as number) ?? (data.size as number) ?? (data.pageSize as number) ?? 10;
  const items = (data.items ?? data.list ?? data.records ?? data.rows ?? []) as unknown[];
  return { items, total, page, pageSize };
}

/**
 * 预设配置：TOPEMS 标准后端
 */
const topemsStandardParams: ParamMappingOptions = {
  style: 'standard',
  searchParamName: 'keyword',
  sortByParamName: 'sortBy',
  sortOrderParamName: 'sortOrder',
  pageParamName: 'page',
  pageSizeParamName: 'pagesize',
  sortOrderValues: { asc: 'asc', desc: 'desc' },
};

/**
 * 预设配置：嵌套筛选风格（如一些 Java 后端）
 */
const nestedFilterParams: ParamMappingOptions = {
  style: 'nested',
  filtersKey: 'filters',
  sortKey: 'sort',
  sortFieldKey: 'field',
  sortOrderKey: 'direction',
  sortOrderValues: { asc: 'ASC', desc: 'DESC' },
};

/**
 * 预设配置：offset 风格（如一些 NoSQL 数据库）
 */
const offsetStyleParams: ParamMappingOptions = {
  style: 'offset',
  offsetParamName: 'offset',
  pageSizeParamName: 'limit',
  sortOrderValues: { asc: '1', desc: '-1' },
};

export default {
  mapListParamsToBackend,
  parsePaginationFromResponse,
  topemsStandardParams,
  nestedFilterParams,
  offsetStyleParams,
};

// ============ 筛选操作符规范 ============

export type FilterOperator =
  | 'eq' // 等于
  | 'ne' // 不等于
  | 'gt' // 大于
  | 'gte' // 大于等于
  | 'lt' // 小于
  | 'lte' // 小于等于
  | 'like' // 模糊匹配
  | 'in' // 包含在数组中
  | 'nin' // 不在数组中
  | 'between' // 在区间内
  | 'null' // 为空
  | 'notnull'; // 不为空

export interface FilterCondition {
  field: string;
  op: FilterOperator;
  value: unknown;
}
