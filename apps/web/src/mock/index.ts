/**
 * 集中式 Mock 数据管理
 *
 * 所有开发环境的 mock 数据统一在此目录管理，按模块组织。
 * 使用时通过 `import { ... } from '@/mock'` 导入。
 */

export * as searchMock from './search';
export * as pluginMock from './plugin';
export { pluginMock as default } from './plugin';
