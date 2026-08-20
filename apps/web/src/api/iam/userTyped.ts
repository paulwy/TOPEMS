/**
 * 类型安全 API 客户端试点 — IAM User
 *
 * 展示如何用 createTypedApiClient 替代手写 API 方法。
 * 与 WMS warehouseTyped.ts 同样的模式，但保持最小化（类型别名 + adapter 函数）。
 *
 * 使用方式：
 *   import { typedUserApi } from './userTyped';
 *   const res = await typedUserApi.list({ page: 1 });
 *   if (res.success) { console.log(res.data.items); }
 */

import apiClient from '../client';
import { createTypedApiClient, defineApiSchema } from '@topems/shared-types';
import type { User, UpdateUserRequest } from './types';
import type { IamTypes } from '@topems/shared-types';

// 生成类型别名（从 OpenAPI 规范生成，作为类型源真相参考）
export type GeneratedUser = IamTypes.User;

// 定义 User 实体与 OpenAPI 生成类型的映射
const userApiSchema = defineApiSchema({
  entity: 'User',
});

// 类型安全的 User API 客户端（一行替代多个手写方法）
// create 入参默认 Partial<User>，update 入参使用手写 UpdateUserRequest
const typedUserApi = createTypedApiClient<User, Partial<User>, UpdateUserRequest>(
  apiClient.iam,
  '/users'
);

export default typedUserApi;
