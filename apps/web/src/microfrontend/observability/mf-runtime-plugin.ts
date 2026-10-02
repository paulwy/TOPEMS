/**
 * MF 运行时可观测性埋点插件（已随 D4 决策停用）
 *
 * 历史背景：此文件曾通过 @module-federation/runtime 的 registerGlobalPlugins API
 * 注册 ModuleFederationRuntimePlugin，在远程模块 loadShare/loadEntry/loadRemote
 * 等生命周期钩子里埋点。D4 决策回归模块化单体前端后，@module-federation/runtime
 * 已从依赖中移除，运行时不再有任何远程模块加载，这些钩子无对象可挂。
 *
 * initMFObservability() 保留为 no-op：main.tsx 启动时仍调用它，
 * 以保持启动序列与调用点不变；原插件/错误分类逻辑随 MF 一并归档。
 * （错误追踪能力仍由 ./error-tracker 的 errorTracker 独立提供，不受影响。）
 */

let initialized = false;

/**
 * 初始化 MF 运行时可观测性埋点。
 *
 * D4 后为 no-op：MF 运行时已移除，无需注册全局插件。
 * 保留空实现以兼容 main.tsx 的启动调用。
 */
export function initMFObservability(): void {
  if (initialized) {
    return;
  }
  initialized = true;
}

export default { initMFObservability };
