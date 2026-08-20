/**
 * Store 分层架构
 *
 * 1. Server State (server/) - 服务端数据，待迁移到 React Query
 * 2. Domain Store (domain/) - 业务领域状态
 * 3. UI Store (ui/) - 界面状态
 *
 * 依赖方向：ui → domain → server
 *
 * 详细架构说明见 ./ARCHITECTURE.md
 */

// Domain Store
export * from './domain';

// UI Store
export * from './ui';

// Server State (待迁移到 React Query)
export * from './server';

// Error handling utilities
export { classifyError } from '../utils/errorHandler';
