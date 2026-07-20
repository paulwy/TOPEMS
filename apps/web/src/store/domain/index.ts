/**
 * Domain Store 层
 *
 * 业务领域状态：与具体业务领域强相关的状态。
 * 这些 store 通常包含业务实体、业务规则与领域操作，
 * 可被 UI Store 调用，也可依赖 Server State 层获取服务端数据。
 *
 * 当前包含：
 * - useAuthStore：用户认证、权限管理
 * - useWorkflowStore：工作流状态
 */

export * from '../authStore';
export * from '../workflowStore';
