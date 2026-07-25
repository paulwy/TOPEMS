/**
 * OpenAPI 自动生成类型 — 命名空间导出
 *
 * 使用方式：
 *   import type { ApiPaths, ApiComponents } from '@topems/shared-types';
 *   type User = ApiComponents['schemas']['User'];
 *   type LoginPath = ApiPaths['/api/core/iam/auth/login']['post'];
 *
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 */

export type { paths as ApiPaths } from './openapi';
export type { components as ApiComponents } from './openapi';
export type { operations as ApiOperations } from './openapi';

export type { IamTypes, FinanceTypes, MasterDataTypes, QmsTypes, MesTypes, CommonTypes } from './api-types';
