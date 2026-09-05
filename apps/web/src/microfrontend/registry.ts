/**
 * 微前端模块注册表
 *
 * 运行时动态注册和卸载微前端模块。
 * 用于支持插件市场按需安装模块。
 */

import type { RemoteModuleConfig } from './config';

type ModuleStatus = 'registered' | 'loaded' | 'error' | 'unloaded';

interface RegisteredModule {
  config: RemoteModuleConfig;
  status: ModuleStatus;
  loadedAt?: Date;
  error?: string;
}

export type { RegisteredModule, ModuleStatus };
