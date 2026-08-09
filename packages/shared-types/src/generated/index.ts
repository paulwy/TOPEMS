/**
 * OpenAPI 自动生成类型 — 命名空间导出
 *
 * 使用方式：
 *   import type { ApiPaths, ApiComponents } from '@topems/shared-types';
 *   type User = ApiComponents['schemas']['User'];
 *   type LoginPath = ApiPaths['/api/core/iam/auth/login']['post'];
 *
 * 此文件由 scripts/openapi/gen-types.mjs 自动生成，请勿手动编辑。
 * 注意：'./api-types' 的 re-export 是手写文件，脚本不覆盖；删除会导致 src/index.ts 命名空间导出断裂。
 */

export type { paths as ApiPaths } from './openapi';
export type { components as ApiComponents } from './openapi';
export type { operations as ApiOperations } from './openapi';

// 手写封装层（按模块命名空间导出，方便业务使用）— 由 V71 A3 维护
export type { IamTypes, HrmTypes, FinanceTypes, MasterDataTypes, QmsTypes, MesTypes, CommonTypes } from './api-types';
