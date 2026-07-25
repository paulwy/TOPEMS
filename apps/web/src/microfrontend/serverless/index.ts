/**
 * V48.0 Track Serverless: 无服务器架构 — Serverless 模块统一导出
 *
 * 导出微前端的无服务器架构核心能力：
 * - edge-renderer: 边缘渲染引擎（SSR/SSG/ISR + 多级缓存 + 地理路由）
 * - function-as-module: 函数即模块（函数注册 + 依赖编排 + 结果缓存 + 可观测性）
 * - on-demand-loader: 按需加载引擎（智能预加载 + 懒加载 + 条件加载 + 优先级调度）
 *
 * @example
 * import {
 *   edgeRenderer,
 *   faas,
 *   onDemandLoader,
 * } from '@/microfrontend/serverless';
 *
 * // 边缘渲染
 * const html = await edgeRenderer.render('/dashboard', { mode: 'ssr' });
 *
 * // 函数即模块
 * faas.register('getUser', async (ctx) => fetchUser(ctx.params.id));
 * const user = await faas.invoke('getUser', { params: { id: '1' } });
 *
 * // 按需加载
 * onDemandLoader.register('dashboard', () => import('./pages/dashboard'));
 * const mod = await onDemandLoader.load('dashboard');
 */

// ==================== 边缘渲染引擎 ====================
export {
  edgeRenderer,
  EdgeRenderer,
  type RenderMode,
  type CacheTier,
  type RenderStatus,
  type RenderRequest,
  type RenderResult,
  type RenderedPage,
  type RenderStats,
  type RendererConfig,
  type RenderCallback,
} from './edge-renderer';

// ==================== 函数即模块引擎 ====================
export {
  faas,
  FunctionAsModule,
  type FunctionStatus,
  type ExecStatus,
  type FunctionDefinition,
  type InvokeContext,
  type InvokeOptions,
  type InvokeResult,
  type ExecutionTrace,
  type FaasStats,
  type FaasConfig,
  type FunctionMiddleware,
  type FaasCallback,
} from './function-as-module';

// ==================== 按需加载引擎 ====================
export {
  onDemandLoader,
  OnDemandLoader,
  type LoadPriority,
  type PreloadStrategy,
  type LoadStatus,
  type LoadCondition,
  type OnDemandModule,
  type LoadRequest,
  type LoadResult,
  type AccessRecord,
  type LoadPredictionResult,
  type LoaderStats,
  type LoaderConfig,
  type OnDemandCallback,
} from './on-demand-loader';
