/**
 * Hooks 分层治理入口
 *
 * 共 4 层，依赖方向自上而下：
 *   features → domain → ui → foundation
 *
 * 详见 ./LAYERS.md
 */

// Foundation layer - 基础原语层
export * from './foundation';

// UI layer - UI交互层
export * from './ui';

// Domain layer - 领域能力层
export * from './domain';

// Features layer - 业务特征层
export * from './features';
