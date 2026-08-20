/**
 * Domain layer - 领域能力层
 *
 * 通用业务抽象（CRUD、列表页状态、模块数据等）。
 * 依赖规则：可调用 foundation / ui 层；禁止调用 features 层。
 */

// Crud - 来自 shared-hooks
export { useCrud } from '@topems/shared-hooks';
export type { UseCrudOptions, UseCrudResult } from '@topems/shared-hooks';

// CrudMutations
export { useCrudMutations } from '../useCrudMutations';

// CrudQueries
export { useCrudQueries, useModuleQueries, useCrudOperations } from '../useCrudQueries';
export type {
  UseCrudQueriesResult,
  UseCrudOperationsOptions,
  CrudOperations,
} from '../useCrudQueries';

// CrudForm
export type { UseCrudFormResult } from '../useCrudForm';

// ListPageState
export { useListPageState } from '../useListPageState';

// ModuleData

// ResourceCRUD
export { useResourceCRUD } from '../useResourceCRUD';
