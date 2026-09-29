import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { federation } from '@module-federation/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { promises as fsp } from 'fs';
import zlib from 'zlib';

import type { IncomingMessage, ServerResponse } from 'http';
import type { Plugin, ResolvedConfig } from 'vite';

// ============================================================================
// 端口单一信源（Single Source of Truth）
// ports.ts 为权威：BACKEND_PORTS（后端 80xx） + MF_PORTS（前端 MF 30xx）
// 新增/修改端口：修改 config/ports.env 后同步更新 apps/web/src/config/ports.ts
// ============================================================================
import { BACKEND_PORTS, MF_PORTS } from './src/config/ports';

// ============================================================================
// 服务配置（与 config/services.yaml 保持同步）
// 新增服务只需在此处添加，proxy 会自动生成
// ============================================================================

interface ServiceConfig {
  name: string;
  port: number;
  /** 是否为虚拟服务（由 unified-core 提供） */
  isVirtual?: boolean;
  /** 新 API 路径前缀，如 /api/erp 或 /api/core/iam */
  apiPrefix?: string;
  /** 旧路径前缀（向后兼容），如 /erp/api */
  legacyPrefix?: string;
  /** WebSocket 路径 */
  wsPath?: string;
}

const CORE_PORT = BACKEND_PORTS.core; // 8000，从 ports.ts 单一信源读取

// 模块化单体模式：所有后端服务由 topems-server(:8099) 统一承载（VITE_MONOLITH=1）。
// 独立部署模式（默认）：各服务按 ports.ts 独立端口代理。
const MONO_TARGET = process.env.VITE_MONOLITH === '1' ? 'http://localhost:8099' : null;

const SERVICES: ServiceConfig[] = [
  // 核心服务
  // NOTE: unified-core (8000) 同时承载 WebSocket：/ws/core/im（IM 实时推送）、/ws/core（通用 WS）。
  // IM 的 HTTP API 已外迁到 communication 服务（8084，路径 /api/communication/im），
  // 但 IM WebSocket 仍由 unified-core:8000 处理 —— communication 服务未实现 WS，
  // 前端 useImWebSocket hook 消费 /ws/core/im 是预期行为（HTTP/WS 跨服务分离）。
  {
    name: 'unified-core',
    port: CORE_PORT,
    apiPrefix: '/api/core',
    legacyPrefix: '/core/api',
    wsPath: '/ws/core',
  },

  // 虚拟服务（由 unified-core 提供）
  {
    name: 'iam',
    port: CORE_PORT,
    isVirtual: true,
    apiPrefix: '/api/core/iam',
    legacyPrefix: '/iam/api',
  },
  {
    name: 'doc',
    port: CORE_PORT,
    isVirtual: true,
    apiPrefix: '/api/core/doc',
    legacyPrefix: '/doc/api',
  },
  {
    name: 'flow',
    port: CORE_PORT,
    isVirtual: true,
    apiPrefix: '/api/core/flow',
    legacyPrefix: '/flow/api',
  },
  {
    name: 'file',
    port: CORE_PORT,
    isVirtual: true,
    apiPrefix: '/api/core/file',
    legacyPrefix: '/file/api',
  },

  // 独立 communication 服务（从 unified-core 外迁，端口 8084）
  // mail/notification/im 已外迁至此服务，路径为 /api/communication/{mail,notification,im}
  { name: 'communication', port: BACKEND_PORTS.communication, apiPrefix: '/api/communication' },

  // 独立 search 服务（全文搜索，端口 8082）
  { name: 'search', port: BACKEND_PORTS.search, apiPrefix: '/api/search' },

  // 独立 ticket/feedback 服务（从 unified-core 外迁；billing 未立项已移除）
  // 旧路由 /api/core/{ticket,feedback}/* 由 /api/core 通用代理兼容
  { name: 'ticket', port: BACKEND_PORTS.ticket, apiPrefix: '/api/ticket' },
  { name: 'feedback', port: BACKEND_PORTS.feedback, apiPrefix: '/api/feedback' },

  // 经营管理
  { name: 'erp', port: BACKEND_PORTS.erp, apiPrefix: '/api/erp', legacyPrefix: '/erp/api' },
  {
    name: 'finance',
    port: BACKEND_PORTS.finance,
    apiPrefix: '/api/finance',
    legacyPrefix: '/finance/api',
  },
  { name: 'ai', port: BACKEND_PORTS.ai, apiPrefix: '/api/ai', legacyPrefix: '/ai/api' },

  // 协同办公
  { name: 'hrm', port: BACKEND_PORTS.hrm, apiPrefix: '/api/hrm', legacyPrefix: '/hrm/api' },
  { name: 'pm', port: BACKEND_PORTS.pm, apiPrefix: '/api/pm', legacyPrefix: '/pm/api' },
  { name: 'crm', port: BACKEND_PORTS.crm, apiPrefix: '/api/crm', legacyPrefix: '/crm/api' },

  // 生产制造
  {
    name: 'mes',
    port: BACKEND_PORTS.mes,
    apiPrefix: '/api/mes',
    legacyPrefix: '/mes/api',
    wsPath: '/ws/mes',
  },
  { name: 'pdm', port: BACKEND_PORTS.pdm, apiPrefix: '/api/pdm', legacyPrefix: '/pdm/api' },

  // 供应链
  { name: 'scm', port: BACKEND_PORTS.scm, apiPrefix: '/api/scm', legacyPrefix: '/scm/api' },
  { name: 'wms', port: BACKEND_PORTS.wms, apiPrefix: '/api/wms', legacyPrefix: '/wms/api' },
  { name: 'srm', port: BACKEND_PORTS.srm, apiPrefix: '/api/srm', legacyPrefix: '/srm/api' },

  // 质量/研发
  { name: 'qms', port: BACKEND_PORTS.qms, apiPrefix: '/api/qms', legacyPrefix: '/qms/api' },
  { name: 'lims', port: BACKEND_PORTS.lims, apiPrefix: '/api/lims', legacyPrefix: '/lims/api' },
  { name: 'ehs', port: BACKEND_PORTS.ehs, apiPrefix: '/api/ehs', legacyPrefix: '/ehs/api' },
  { name: 'rd', port: BACKEND_PORTS.rd, apiPrefix: '/api/rd', legacyPrefix: '/rd/api' },

  // 数据分析
  // NOTE: analytics 服务（端口 8060）既承载 /api/bi 也承载 /api/analytics；
  // WebSocket 路径 /ws/bi/dashboard/{id} 用于 BI 仪表盘实时数据推送
  { name: 'bi', port: BACKEND_PORTS.bi, apiPrefix: '/api/bi', wsPath: '/ws/bi' },
  // V68.1: monitor 已从 unified-core 拆分为独立服务（端口 8095）
  // 旧路径 /api/core/monitor/* 通过下方兼容代理重写为 /api/monitor/* 转发到 8095
  { name: 'monitor', port: BACKEND_PORTS.monitor, apiPrefix: '/api/monitor' },
  { name: 'portal', port: BACKEND_PORTS.portal, apiPrefix: '/api/portal' },

  // 主数据服务（独立进程，端口 8090）
  { name: 'master-data', port: BACKEND_PORTS['master-data'], apiPrefix: '/api/master-data' },

  // 统一入口服务（BFF 网关，8099；模块化单体 VITE_MONOLITH=1 时所有 API 汇聚于此）
  { name: 'server', port: BACKEND_PORTS.server, apiPrefix: '/api/server' },

  // 基础设施
  {
    name: 'mobile',
    port: BACKEND_PORTS.mobile,
    apiPrefix: '/api/mobile',
    legacyPrefix: '/mobile/api',
  },
  {
    name: 'gis',
    port: BACKEND_PORTS.gis,
    apiPrefix: '/api/gis',
    legacyPrefix: '/gis/api',
    wsPath: '/ws/gis/map',
  },
  {
    name: 'integration',
    port: BACKEND_PORTS.integration,
    apiPrefix: '/api/integration',
    legacyPrefix: '/integration/api',
  },

  // 物流服务（V284 补全，独立进程，端口 8073；aps 已合并至 mes）
  { name: 'tms', port: BACKEND_PORTS.tms, apiPrefix: '/api/tms', legacyPrefix: '/tms/api' },

  // [V2026.08 已移除] lowcode 空壳占位服务（后端尚未立项，所有 handler 返回 501），代码归档见 docs/archive/

  // 自动化编排（V64 新增，初期落地 unified-core，端口 8000）
  // 路径前缀 /api/core/automation，与 moduleMapping.automation.apiBasePath 对齐
  // 后端 unified-core 未实现 automation 路由时返回 404，前端 client.ts 已做 V64 静默降级
  { name: 'automation', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/automation' },

  // V68.1: plugin-registry 独立服务（端口 8096）
  // 插件注册/市场/安装/升级 API，路径前缀 /api/plugin
  // 旧路径 /api/core/plugin/* 通过下方兼容代理重写为 /api/plugin/* 转发到 8096
  { name: 'plugin-registry', port: BACKEND_PORTS['plugin-registry'], apiPrefix: '/api/plugin' },
];

// ============================================================================
// Module Federation Remote 配置
// 从 ports.ts MF_PORTS 单一信源动态生成，不再硬编码 19 个端口
// ============================================================================

const REMOTE_MODULES: { name: string; port: number }[] = Object.entries(MF_PORTS).map(
  ([name, port]) => ({ name, port })
);

// Deployment mode: 'module-federation' | 'static' | 'hybrid'
// V64 CORS 修复：Vite 约定只暴露 VITE_* 前缀（带下划线）的变量给前端 import.meta.env；
// 历史代码错误使用了 VITEDeploymentMode（无下划线）读不到值。
// 此处统一优先读 VITE_DEPLOYMENT_MODE，兼容旧键 VITEDeploymentMode 作为过渡。
const DEPLOYMENT_MODE =
  process.env.VITE_DEPLOYMENT_MODE || process.env.VITEDeploymentMode || 'static';

/**
 * 从环境变量读取单个 remote 的 entry URL
 *
 * 多 remote 配置约定：
 *   VITE_REMOTE_<NAME_UPPER>=https://host/remoteEntry.js
 *
 * 生产环境注入示例：
 *   VITE_REMOTE_TOPEMS_CORE=https://core.topems.com/remoteEntry.js
 *   VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
 *   VITE_REMOTE_TOPEMS_HRM=https://hrm.topems.com/remoteEntry.js
 *   ...
 *
 * 完整模块清单与运行时配置见 apps/web/src/microfrontend/config.ts
 * （REMOTE_MODULES 中定义了所有可启用的业务域模块）
 */
const getRemoteEntry = (name: string, port: number): string => {
  const env = loadEnv('', process.cwd(), '');
  if (DEPLOYMENT_MODE === 'static') {
    // 静态部署模式下不加载任何 remote
    return '';
  }
  const envKey = `VITE_REMOTE_${name.toUpperCase()}`;
  const envUrl = env[envKey];

  // 如果环境变量设置了完整 URL，直接使用（生产环境）
  if (envUrl) {
    return envUrl;
  }

  // 开发/生产 MF 模式：统一用同源代理路径（vite.config.ts 已配置 /remote/<name> 代理）
  // 从根本上避免浏览器直接跨端口访问 localhost:<port> 导致的 CORS
  if (DEPLOYMENT_MODE === 'module-federation' || DEPLOYMENT_MODE === 'hybrid') {
    return `/remote/${name}/remoteEntry.js`;
  }

  // 其它：保守返回空，避免跨域请求
  return '';
};

/**
 * 构建 federation remotes 配置
 *
 * - module-federation / hybrid: 启用 topems_core 作为基础 remote
 * - static: 关闭所有 remote（使用本地打包）
 *
 * 扩展多 remote：
 *   1. 在 apps/web/src/microfrontend/config.ts 的 REMOTE_MODULES 中追加配置
 *   2. 通过环境变量 VITE_REMOTE_TOPEMS_<NAME> 注入生产入口
 *   3. 可按下方示例在返回对象中追加 remote（仅显式声明的 remote 会被 federation 编译期处理）
 *
 *   return {
 *     topems_core: getRemoteEntry('topems_core', 3001),
 *     topems_erp:  getRemoteEntry('topems_erp',  3002),
 *     topems_hrm:  getRemoteEntry('topems_hrm',  3003),
 *     // ...
 *   };
 *
 * 运行时动态加载（推荐生产环境使用）见
 * apps/web/src/microfrontend/RemoteLoader.tsx
 */
const buildRemotes = (): Record<string, string> => {
  if (DEPLOYMENT_MODE === 'static') {
    return {};
  }
  // 保留 topems_core 作为基础 remote，向后兼容
  return {
    topems_core: getRemoteEntry('topems_core', MF_PORTS.topems_core),
  };
};

const createServiceProxyConfig = (serviceName: string, target: string, skipRewrite = false) => ({
  target,
  changeOrigin: true,
  rewrite: skipRewrite
    ? undefined
    : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/${serviceName}`),
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.includes('/health')) {
        console.warn(
          `[Vite Proxy] ${serviceName.toUpperCase()} service unavailable, error:`,
          err.message
        );
      }
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            code: 503,
            success: false,
            message: `${serviceName.toUpperCase()} service is currently unavailable`,
            data: null,
          })
        );
      }
    });
  },
});

const createNewApiProxyConfig = (servicePath: string, target: string) => ({
  target,
  changeOrigin: true,
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.includes('/health')) {
        console.warn(
          `[Vite Proxy] ${servicePath.toUpperCase()} service unavailable, error:`,
          err.message
        );
      }
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            code: 503,
            success: false,
            message: `${servicePath.toUpperCase()} service is currently unavailable`,
            data: null,
          })
        );
      }
    });
  },
});

const HEALTH_CHECK_PATHS: Record<string, string> = {
  ai: '/health',
  bi: '/health',
  monitor: '/health',
  portal: '/health',
  mobile: '/health',
  gis: '/health',
  integration: '/health',
  hrm: '/health',
  pm: '/health',
  crm: '/health',
  mes: '/health',
  pdm: '/health',
  scm: '/health',
  wms: '/health',
  srm: '/health',
  qms: '/health',
  lims: '/health',
  ehs: '/health',
  rd: '/health',
  erp: '/health',
  finance: '/health',
  doc: '/health',
  file: '/health',
  communication: '/health',
  'unified-core': '/health',
  flow: '/health',
  billing: '/health',
  ticket: '/health',
  feedback: '/health',
  'master-data': '/health',
  search: '/health',
  'plugin-registry': '/health',
};

const createHealthProxyConfig = (serviceName: string, target: string) => ({
  target,
  changeOrigin: true,
  rewrite: (path: string) => {
    const healthPath = HEALTH_CHECK_PATHS[serviceName] || `/health`;
    return healthPath;
  },
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      console.warn(`[Vite Proxy] ${serviceName.toUpperCase()} health check failed:`, err.message);
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            code: 503,
            success: false,
            message: `${serviceName.toUpperCase()} service health check failed`,
            data: null,
          })
        );
      }
    });
  },
});

// ============================================================================
// 自动生成 proxy 配置
// 从 SERVICES 数组自动生成所有 API proxy、legacy proxy、health proxy、WS proxy
// ============================================================================

const buildServiceProxies = (): Record<string, any> => {
  const proxies: Record<string, any> = {};

  // V68.1 兼容代理（必须在所有其他 /api/core/* 代理之前注册）
  // Vite 8 按插入顺序匹配 proxy key，不排序。如果 /api/core 先注册，
  // 会抢先匹配 /api/core/plugin/* /api/core/monitor/* /api/core/dict/*
  proxies['/api/core/plugin'] = {
    target: MONO_TARGET || `http://localhost:${BACKEND_PORTS['plugin-registry']}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/core\/plugin/, '/api/plugin'),
  };
  proxies['/api/core/monitor'] = {
    target: MONO_TARGET || `http://localhost:${BACKEND_PORTS.monitor}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/core\/monitor/, '/api/monitor'),
  };
  // V68.1 A2.3: dict 模块已外迁到 master-data:8090（svc/master-data）
  // master-data 的 api_prefix=/api/master-data，dict 路由注册在 /dict/* 下，
  // 实际后端路径为 /api/master-data/dict/*；前端仍通过 /api/core/dict/* 访问，
  // 此处 rewrite 为 /api/master-data/dict/*（与 monitor/plugin 外迁模式一致）。
  proxies['/api/core/dict'] = {
    target: MONO_TARGET || `http://localhost:${BACKEND_PORTS['master-data']}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/core\/dict/, '/api/master-data/dict'),
  };

  // Dashboard 路由走服务自身端口（原硬编码 8080 gateway 已移除）
  // 各服务的 /api/{mod}/dashboard 会自动被下方的 apiPrefix 规则捕获
  // （/api/finance/dashboard 匹配 /api/finance/ 前缀 → 转发到 8011）

  for (const svc of SERVICES) {
    const target = MONO_TARGET || `http://localhost:${svc.port}`;

    // 1. 新 API 路径: /api/{service}/* 或 /api/core/{service}/*
    if (svc.apiPrefix) {
      proxies[svc.apiPrefix + '/'] = createNewApiProxyConfig(svc.apiPrefix.slice(1), target);
    }

    // 2. 旧路径（向后兼容）: /{service}/api -> /api/{service}
    if (svc.legacyPrefix) {
      const serviceName = svc.name.replace('-virtual', '');
      proxies[svc.legacyPrefix] = createServiceProxyConfig(serviceName, target);
    }

    // 2b. 健康检查代理（所有服务统一入口：/{serviceName}/health -> localhost:port/health）
    //     从 useServiceStatus / ReportPage 等前端组件发起的相对请求均通过此代理转发，
    //     彻底避免前端直接跨端口访问导致的 CORS 报错（即便后端CORS配置正确，
    //     浏览器同源策略也会拦截直接跨端口请求）。
    proxies[`/${svc.name}/health`] = createHealthProxyConfig(svc.name, target);

    // 3. WebSocket
    if (svc.wsPath) {
      proxies[svc.wsPath] = {
        target,
        changeOrigin: true,
        ws: true,
      };
    }
  }

  // 模块化单体模式：所有WebSocket统一代理到8099
  if (MONO_TARGET) {
    proxies['/ws'] = {
      target: MONO_TARGET,
      changeOrigin: true,
      ws: true,
    };
  }

  // /api/* 路径
  const apiV1Services = SERVICES.filter((s) => s.apiPrefix && !s.isVirtual);
  for (const svc of apiV1Services) {
    const serviceName = svc.apiPrefix!.replace('/api/', '');
    proxies[`/api/${serviceName}`] = {
      target: `http://localhost:${svc.port}`,
      changeOrigin: true,
    };
  }

  // 核心服务 /api/core（通配代理，兼容代理已在函数开头注册）
  proxies['/api/core'] = {
    target: MONO_TARGET || `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通用 health 端点
  proxies['/health'] = { target: MONO_TARGET || `http://localhost:${CORE_PORT}`, changeOrigin: true };

  // Module Federation remotes - proxy all remoteEntry.js requests through the host
  // This prevents CORS issues when loading remote modules
  for (const remote of REMOTE_MODULES) {
    const proxyPath = `/remote/${remote.name}`;
    proxies[proxyPath] = {
      target: `http://localhost:${remote.port}`,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(new RegExp(`^\\/remote\\/${remote.name}`), ''),
      configure: (proxy: any) => {
        proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                code: 503,
                success: false,
                message: `Remote module ${remote.name} (port ${remote.port}) is currently unavailable`,
                data: null,
              })
            );
          }
        });
      },
    };
  }

  // ERP 插件代理（通过 unified-core）
  proxies['/api/plugins/erp'] = {
    target: MONO_TARGET || `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通讯服务向后兼容
  proxies['/comm/api'] = {
    target: MONO_TARGET || `http://localhost:${BACKEND_PORTS.communication}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/comm/, '/api/communication'),
  };
  proxies['/comm/health'] = {
    target: MONO_TARGET || `http://localhost:${BACKEND_PORTS.communication}`,
    changeOrigin: true,
  };

  return proxies;
};

// Fix for @module-federation/vite + Vite 8:
// The `generateLocalSharedImportMap` plugin's resolveId compares
// `source === getLocalSharedImportMapPath()`, but Vite 8 passes
// the source with a \0 prefix (null byte) in resolveId hooks.
//
// V81-202608 扩展：除 virtual:mf-localSharedImportMap 之外，
// MF 还生成 __loadShare__ / __prebuild__ / __mf_synthetic__ 等虚模块家族，
// 它们统一以 `virtual:mf:__mfe_internal__<federationName>...` 为 ID。
// 在 Vite 8 中这些 ID 同样会被前缀 \0，导致 @module-federation/vite 内部的
// 精确字符串匹配失败，模块图中不会登记这些虚模块，浏览器 `/@id/__x00__...`
// 请求就会拿到空响应 → MIME 类型为空、NS_ERROR_CORRUPTED_CONTENT、
// "doesn't provide an export named"、DashboardPage 懒加载重试 3 次失败等等。
// 此 pre-plugin 统一对所有 MF 虚模块 ID 做 null-byte 归一化：
//   - 若 source 去除前导 \0 后命中任一 MF 虚模块前缀 → 返回 \0 前缀的规范形式
//   - 从而保证后续 resolveId/load 能被 @module-federation/vite 正确认领
const fixLocalSharedImportMapNullBytePlugin = {
  name: 'fix-mf-localSharedImportMap-nullbyte',
  enforce: 'pre' as const,
  resolveId(rawSource: string) {
    const LOCAL_SHARED_IMPORT_MAP_ID = 'virtual:mf-localSharedImportMap';
    const INTERNAL_NAME_PREFIX = '__mfe_internal__';
    const federationName = 'topems_portal';
    const internalName = federationName.startsWith(INTERNAL_NAME_PREFIX)
      ? federationName
      : `${INTERNAL_NAME_PREFIX}${federationName}`;
    // packageNameEncode: replaces @ / - . with _mf_X_ placeholders
    const encodedName = internalName
      .replace(/@/g, '_mf_0_')
      .replace(/\//g, '_mf_1_')
      .replace(/-/g, '_mf_2_')
      .replace(/\./g, '_mf_3_');
    const expectedPath = `${LOCAL_SHARED_IMPORT_MAP_ID}:${encodedName}`;
    const expectedResolved = `\0${expectedPath}`;

    // ============================================================
    // V81-202608 强化：在 strip \0 之前先剥离 HTTP 形态前缀
    // Vite 8 偶发把 `/@id/__x00__virtual:mf:...` 这种浏览器 URL 直接
    // 传入 resolveId，需要先还原成模块 ID 形式再处理。
    // ============================================================
    let source = rawSource;
    if (source.startsWith('/@id/')) {
      // 剥去 /@id/ 前缀
      source = source.slice(5);
      // 处理 __x00__ 前缀 → \0（Vite 的 null byte URL 编码）
      if (source.startsWith('__x00__')) {
        source = `\0${source.slice(7)}`;
      }
      // 去除 query string / hash 部分
      const qIdx = source.indexOf('?');
      const hIdx = source.indexOf('#');
      const cutIdx =
        qIdx === -1 ? hIdx : hIdx === -1 ? qIdx : Math.min(qIdx, hIdx);
      if (cutIdx !== -1) source = source.slice(0, cutIdx);
    }

    const normalizedSource = source.replace(/^\0+/, '');

    // 1) virtual:mf-localSharedImportMap 原有分支（归一化返回）
    if (normalizedSource === expectedPath || source === expectedResolved) {
      return expectedResolved;
    }

    // 2) MF 虚模块家族统一兜底：
    //    - virtual:mf:__mfe_internal__...      (loadShare / prebuild / synthetic)
    //    - __mfe_internal__...                  某些引用场景不带 virtual:mf: 前缀
    //    - 字符串中明确包含 __loadShare__ / __prebuild__ / __mf_synthetic__
    //    - virtual:mf-localSharedImportMap:__mfe_internal__...
    const mfVirtualPrefixes = [
      `virtual:mf:${INTERNAL_NAME_PREFIX}`,
      `virtual:mf:${internalName}`,
      `virtual:mf-localSharedImportMap:${INTERNAL_NAME_PREFIX}`,
      `virtual:mf-localSharedImportMap:${encodedName}`,
      `${INTERNAL_NAME_PREFIX}`,
    ];
    const containsMfToken =
      normalizedSource.includes('__loadShare__') ||
      normalizedSource.includes('__prebuild__') ||
      normalizedSource.includes('__mf_synthetic__') ||
      normalizedSource.includes('__loadRemote__') ||
      normalizedSource.includes('__treeShakingProvider__') ||
      normalizedSource.includes('__mf_tree_shaking_graph__');
    const matchesPrefix = mfVirtualPrefixes.some((p) => normalizedSource.startsWith(p));
    if (containsMfToken || matchesPrefix) {
      return `\0${normalizedSource}`;
    }
  },
};

// V81-202608 P2: MF 虚模块 HTTP 服务兜底中间件
//
// 问题背景：Vite 8 serve 模式下，浏览器对 loadShare/prebuild 虚模块发起
//   GET /@id/__x00__virtual:mf:__mfe_internal__...__loadShare__react__loadShare__.js
// 请求时，默认的 /@id/ 中间件偶发跳过完整插件管线，直接返回空响应（无 Content-Type），
// 导致：
//   - Firefox: NS_ERROR_CORRUPTED_CONTENT + 拦截 "不允许的 MIME 类型（""）"
//   - Chrome: "Failed to load module script: Expected a JavaScript module script..."
//   - WorkflowDashboardPage / DashboardPage 懒加载重试 3 次后崩溃
//
// 此中间件在 Vite 默认 /@id/ 处理器之前拦截所有 MF 虚模块请求，强制走
// server.transformRequest() 完整管线（会依次触发 resolveId → load → transform），
// 然后显式写入 Content-Type: application/javascript，彻底规避空 MIME / 空 body 问题。
const fixMfVirtualModulesDevServerPlugin: Plugin = {
  name: 'fix-mf-virtual-modules-dev-server',
  enforce: 'pre' as const,
  apply: 'serve',
  configureServer(server) {
    // 匹配：/@id/__x00__<rest>  其中 <rest> 必须包含 virtual:mf:
    // 同时兼容带 query string 的情况：/@id/__x00__...?t=123
    const MF_VIRTUAL_AT_ID_RE =
      /^\/@id\/__x00__(virtual:mf:[^?#]+?)(\.(?:js|mjs))?(\?.*)?$/;

    // 插入到 Vite 中间件栈最前面（在 transformMiddleware / @id handler 之前）
    server.middlewares.use((req, res, next) => {
      if (!req.url) return next();

      const match = req.url.match(MF_VIRTUAL_AT_ID_RE);
      if (!match) return next();

      // 解构：$1 = virtual:mf:...（不含扩展名），$2 = 可能的 .js / .mjs 扩展，
      //       $3 = 可能的 query string（?t=xxx）
      const [, virtualCore, ext, query] = match;

      // MF VirtualModule 的 importId 本身带后缀（如 __loadShare__.js），
      // Vite 在做 /@id/ URL 编码时会把 \0 → __x00__，后缀保持不变。
      // 这里保证模块 ID 构造为：\0 + virtualCore + (ext 若 virtualCore 已带后缀则忽略)
      const needsExt = ext && !virtualCore.endsWith(ext);
      const moduleId = `\0${virtualCore}${needsExt ? ext : ''}${query || ''}`;

      // 异步：使用 transformRequest 强制走完整 plugin pipeline
      // 这会触发：resolveId（fixLocalSharedImportMapNullBytePlugin + MF 内置插件）
      //          → load（MF 返回 virtualModule.code）
      //          → transform（源代码 / sourcemap 处理）
      (async () => {
        try {
          const result = await server.transformRequest(moduleId);
          if (!result) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'MF_VIRTUAL_MODULE_EMPTY',
                moduleId: moduleId.replace(/^\0/, '\\0'),
                message:
                  'Module Federation virtual module returned empty transform result. This indicates a loadShare materialization failure.',
              })
            );
            return;
          }
          const { code, map } = result;
          if (!code) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'MF_VIRTUAL_MODULE_NO_CODE',
                moduleId: moduleId.replace(/^\0/, '\\0'),
              })
            );
            return;
          }
          // 正确 MIME 类型，避免 Firefox 空 Content-Type 拦截
          const headers: Record<string, string> = {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache',
            'X-MF-Virtual-Module': moduleId.replace(/^\0/, 'virtual:mf'),
          };
          if (map) {
            headers['SourceMap'] = JSON.stringify(map)
              .slice(0, 1)
              .replace(/./, ''); // placeholder: Vite 自带 sourcemap 处理，此处仅占位
          }
          res.writeHead(200, headers);
          res.end(code, 'utf-8');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { 'Content-Type': 'application/javascript; charset=utf-8' });
          // 返回一个 ESM throw 语句，让浏览器端拿到结构化错误而不是静默 MIME 失败
          res.end(
            `throw new Error("[MF Virtual Module Transform Failed] ` +
              `${msg.replace(/"/g, '\\"').replace(/\n/g, ' ')} ` +
              `(module=${moduleId.replace(/^\0/, '\\0virtual:mf').slice(0, 120)}..."));\n`,
            'utf-8'
          );
        }
      })().catch(() => {
        // 兜底：交给 Vite 默认 /@id/ 处理器尝试
        next();
      });
    });
  },
};

// ============================================================================
// V65.1.2 + V72 P1-3: 自定义 brotli 压缩插件
// 不用 vite-plugin-compression 的 brotli 实例，因为该插件用模块级 mtimeCache
// 在 gzip / brotli 双实例间共享：gzip 先跑完会 mtimeCache.set(file, Date.now())，
// brotli 再跑时 `mtimeMs <= mtimeCache.get(file)` 恒为 true，导致全部文件被跳过。
// 这里用独立 closeBundle 插件绕开该 bug，只做 brotli，无 mtime 缓存。
//
// V72 P1-3 性能优化：BROTLI_QUALITY 从 MAX(11) 降到 6。
// - 11→6: 压缩速度提升 3-5 倍，压缩率损失 < 3%（实测 2.5MB→2.56MB，+2.4%）
// - closeBundle 阶段耗时从 ~40s 降到 ~8s，整体构建 -10% 以上
// ============================================================================
const BROTLI_THRESHOLD = 10240;
const BROTLI_FILE_RE = /\.(js|mjs|json|css|html)$/i;
// V72 P1-3: 从 BROTLI_MAX_QUALITY(11) 降为 6，换取 3-5x 压缩速度
const BROTLI_QUALITY = 6;

async function walkOutputDir(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkOutputDir(fullPath)));
    } else if (BROTLI_FILE_RE.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function brotliCompressPlugin(): Plugin {
  let outputPath = '';
  let logger: ResolvedConfig['logger'];  return {
    name: 'vite:compression-brotli',
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      logger = resolvedConfig.logger;
      outputPath = path.isAbsolute(resolvedConfig.build.outDir)
        ? resolvedConfig.build.outDir
        : path.join(resolvedConfig.root, resolvedConfig.build.outDir);
    },
    async closeBundle() {
      if (!outputPath) return;
      // V83.1/V84: dev-tools 为 DEV-only 工具面板（App.tsx import.meta.env.DEV 门控）。
      // V84 起 treeshake:true 下条件分支被自然摇掉、无孤儿 chunk；
      // 本清理保留为防回归保险（若 treeshake 退化/回退为 false 时仍有产出）。
      let entries: string[];
      // 产物 JS 位于 outDir/assets/ 子目录（递归由 brotli walkOutputDir 负责）
      try {
        entries = await fsp.readdir(path.join(outputPath, 'assets'));
      } catch {
        return;
      }
      for (const en of entries) {
        if (/^dev-tools-[0-9a-zA-Z_-]+\.js(\.(gz|br))?$/.test(en)) {
          try {
            await fsp.unlink(path.join(outputPath, 'assets', en));
            logger.info(`[purge-dev-tools] 已清理生产孤儿 chunk ${en}`);
          } catch {}
        }
      }
      let files: string[];
      try {
        files = await walkOutputDir(outputPath);
      } catch {
        return;
      }
      let count = 0;
      await Promise.all(
        files.map(async (filePath) => {
          const stat = await fsp.stat(filePath);
          if (stat.size < BROTLI_THRESHOLD) return;
          const content = await fsp.readFile(filePath);
          const compressed = await new Promise<Buffer>((resolve, reject) => {
            zlib.brotliCompress(
              content,
              {
                params: {
                  [zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY,
                  [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                },
              },
              (err, result) => (err ? reject(err) : resolve(result))
            );
          });
          await fsp.writeFile(`${filePath}.br`, compressed);
          count++;
        })
      );
      if (count > 0) {
        logger.info(`\n✨ [brotli-custom]: compressed ${count} file(s) to .br`);
      }
    },
  };
}

// ============================================================================
// V72 P2-4c: recharts 代码级拆分插件（顶层 Vite 插件 + enforce: 'post'）
// 之前放在 build.rollupOptions.plugins 里，被 @module-federation/vite 的
// outputOptions hook 覆盖（MF 在其 own outputOptions 里强行写 manualChunks，
// 且执行顺序晚于 rollupOptions.plugins）。
// 移到顶层 Vite plugins 数组 + enforce: 'post' 后，确保在 MF 之后执行。
// ============================================================================
function topemsRechartsSplitPlugin(): Plugin {
  const FS = require('fs');
  return {
    name: 'topems-recharts-split',
    enforce: 'post',
    outputOptions(opts: any) {
      // V81-202608: Vite 8.1.5 弃用 advancedChunks，统一走 OutputOptions.codeSplitting
      // 参考：https://rolldown.rs/reference/OutputOptions.codeSplitting
      //
      // 旧方案背景（V72）：codeSplitting.groups 会递归拉入依赖，导致 recharts-polar 膨胀；
      // 因此采用「删除 codeSplitting + advancedChunks.includeDependenciesRecursively:false」
      // 作为权宜之计。Vite 8.1.5 起 advancedChunks 被彻底移除，只能使用 codeSplitting。
      // 共享依赖由 Rolldown 默认拆分算法自动去重到公共 chunk。
      //
      // @module-federation/vite 预先注入了 2 组 codeSplitting.groups：
      //   1) { name: PRELOAD_HELPER_CHUNK, test: PRELOAD_HELPER_TEST, priority: 100 }
      //   2) { name: mfChunkName } — mfChunkName 是函数，路由 __loadShare__ 虚模块
      const existingGroups = opts?.codeSplitting?.groups || [];

      // 大型 vendor 生态分包（按家族拆分，避免单 chunk >1500kB）
      const vendorGroups = [
        {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|react-is)[\\/]/,
          name: 'react-vendor',
        },
        {
          test: /[\\/]node_modules[\\/](@mui[\\/]material|@emotion|stylis)[\\/]/,
          name: 'mui-core-vendor',
        },
        { test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/, name: 'mui-icons' },
        { test: /[\\/]node_modules[\\/]@mui[\\/]x-(date-pickers|tree-view)[\\/]/, name: 'mui-x' },
        {
          test: /[\\/]node_modules[\\/](@react-three[\\/](fiber|drei|postprocessing)|three)[\\/]/,
          name: 'r3f-vendor',
        },
        {
          test: /[\\/]node_modules[\\/](leaflet|react-leaflet|leaflet-draw|leaflet-measure|@react-leaflet)[\\/]/,
          name: 'leaflet-vendor',
        },
        { test: /[\\/]node_modules[\\/]@amap[\\/]/, name: 'amap-vendor' },
        // exceljs 为按需动态 import（importExport/DataExport/QualityInspection），
        // 独立 vendor chunk 避免与 app chunk 混淆（bundle-check 按名判定 vendor 阈值）
        { test: /[\\/]node_modules[\\/](exceljs|exceljs-dist)[\\/]/, name: 'exceljs-vendor' },
        { test: /[\\/]node_modules[\\/](xlsx|docx-preview)[\\/]/, name: 'office-vendor' },
        {
          test: /[\\/]node_modules[\\/](react-markdown|react-syntax-highlighter|remark-gfm)[\\/]/,
          name: 'markdown-vendor',
        },
        {
          test: /[\\/]node_modules[\\/](zustand|@tanstack[\\/](react-query|react-table)|zod)[\\/]/,
          name: 'data-vendor',
        },
        { test: /[\\/]node_modules[\\/]@opentelemetry[\\/]/, name: 'otel-vendor' },
        { test: /[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/, name: 'i18n-vendor' },
        { test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/, name: 'form-vendor' },
        { test: /[\\/]node_modules[\\/]dayjs[\\/]/, name: 'dayjs-vendor' },
        // 3.3c: lucide-react 子路径导出会被 Rolldown 拆成每图标一个 chunk，
        // 首页入口曾静态引用 103 个单图标 chunk（首屏 163 请求）。合并为单一 vendor chunk。
        { test: /[\\/]node_modules[\\/]lucide-react[\\/]/, name: 'lucide-vendor' },
      ];

      const rechartsGroups = [
        { test: /recharts[^/]*[\\/]es6[\\/]polar[\\/]/, name: 'recharts-polar' },
        { test: /recharts[^/]*[\\/]es6[\\/]cartesian[\\/]/, name: 'recharts-cartesian' },
        {
          test: /recharts[^/]*[\\/]es6[\\/]state[\\/](polarOptionsSlice|polarAxisSlice|ReportPolarOptions)/,
          name: 'recharts-polar-state',
        },
        {
          test: /recharts[^/]*[\\/]es6[\\/]chart[\\/](PieChart|RadarChart|RadialBarChart|Sankey|SunburstChart|Treemap)\.js$/,
          name: 'recharts-polar-charts',
        },
        {
          test: /recharts[^/]*[\\/]es6[\\/]chart[\\/](BarChart|LineChart|AreaChart|ScatterChart|ComposedChart|FunnelChart)\.js$/,
          name: 'recharts-cartesian-charts',
        },
        {
          test: /recharts[^/]*[\\/]es6[\\/]chart[\\/](CartesianChart|CategoricalChart|PolarChart|RechartsWrapper)\.js$/,
          name: 'recharts-charts-core',
        },
        { test: /recharts[^/]*[\\/]es6[\\/]state[\\/]/, name: 'recharts-common-state' },
        {
          test: /recharts[^/]*[\\/]es6[\\/](util|context|container|component|zIndex|theme|synchronisation|animation|hooks|types|shape)[\\/]/,
          name: 'recharts-common',
        },
        { test: /recharts[^/]*[\\/]/, name: 'recharts-common' },
      ];

      const result = { ...(opts || {}) };
      // 合并顺序：MF 内置分组 → vendor 生态 → recharts 细粒度
      // i18n JSON 已通过 lazy import.meta.glob 自动按语言拆分为独立 chunk，无需手动分组
      result.codeSplitting = {
        ...(opts?.codeSplitting || {}),
        groups: [...existingGroups, ...vendorGroups, ...rechartsGroups],
      };
      // 防御性清理：任何残留 advancedChunks 均移除（Vite 8.1.5 报 invalid key）
      if ('advancedChunks' in result) delete result.advancedChunks;
      return result;
    },
    generateBundle(_outputOpts: any, bundle: any) {
      const rows: any[] = [];
      const tooltipDeep: any = {};
      for (const [fileName, chunk] of Object.entries(bundle || {})) {
        if (chunk.type !== 'chunk') continue;
        const modules = Object.keys(chunk.modules || {});
        const rechartsCount = modules.filter((m: string) => /recharts[\\/]/.test(m)).length;
        if (rechartsCount > 0 || /Chart/i.test(fileName)) {
          const allRecharts = modules
            .filter((m: string) => /recharts[\\/]/.test(m))
            .map((m: string) => {
              const rel = m.split('recharts/')[1] || m;
              return rel;
            });
          rows.push({
            file: fileName,
            size: chunk.code?.length || 0,
            modules: modules.length,
            rechartsCount,
            topRechartsModules: allRecharts.slice(0, 15),
          });
          // 完整导出 Tooltip chunk 的所有 recharts 模块
          if (/Tooltip/.test(fileName) && rechartsCount > 50) {
            tooltipDeep.file = fileName;
            tooltipDeep.size = chunk.code?.length || 0;
            tooltipDeep.rechartsModules = allRecharts;
          }
        }
      }
      try {
        FS.writeFileSync('/tmp/recharts-analysis.json', JSON.stringify(rows, null, 2));
      } catch {}
      try {
        FS.writeFileSync('/tmp/recharts-tooltip-deep.json', JSON.stringify(tooltipDeep, null, 2));
      } catch {}
    },
  };
}

export default defineConfig({
  plugins: [
    // V83/V84: dev-tools 为 DEV-only 工具面板（App.tsx import.meta.env.DEV 门控）。
    // V84 起 treeshake:true 下该分支被自然摇掉，生产不再产出；
    // 清理逻辑并入 brotli closeBundle（V83.1）作为防回归保险（treeshake
    // 退化/回退为 false 时仍会产出孤儿 chunk，需清理避免超 app chunk 预算）。
    // C3 §5.2: React 19 + Vite 8 / rolldown CJS→ESM named exports 丢失修复
    // 错误：
    //   SyntaxError: ".../react.js does not provide an export named 'forwardRef'"
    //   SyntaxError: ".../react_jsx-runtime.js does not provide an export named 'jsx'"
    //   SyntaxError: ".../react_jsx-dev-runtime.js does not provide an export named 'jsxDEV'"
    //   SyntaxError: ".../react-dom.js does not provide an export named 'createPortal'"
    // 原因：rolldown 预打包其他依赖时顺带把 React 系列的 CJS bundle 合成到
    //       .vite/deps/*.js，转换逻辑只生成 `export default require_xxx()`，
    //       未把 `exports.forwardRef = ...` / `exports.jsx = ...` 等 CJS 赋值
    //       转成 ESM `export const xxx = ...`。
    // 修复：
    //   1) optimizeDeps 结束后 configureServer 内异步检测磁盘上
    //      node_modules/.vite/deps/react*.js 是否生成，直接 fs 改写末尾补
    //      named exports 解构代码，并触发浏览器 full-reload；
    //   2) transform 钩子兜底（enforce=pre）：浏览器首次请求时如文件仍
    //      在内存缺 named exports，即时修补后返回。
    (() => {
      type FixDef = {
        name: string;                 // 文件名：react.js / react_jsx-runtime.js ...
        requireFn: string;            // rolldown 生成的 require 函数名
        sanityCheck: string;          // 文件中出现的 exports.xxx 关键字（身份校验）
        exports: readonly string[];   // 要补的 named exports 列表
      };
      const REACT_19_EXPORTS = [
        'Children', 'Component', 'Fragment', 'Profiler', 'PureComponent',
        'StrictMode', 'Suspense', 'SuspenseList', 'cloneElement', 'createContext',
        'createElement', 'createFactory', 'createRef', 'forwardRef',
        'isValidElement', 'lazy', 'memo', 'startTransition',
        'unstable_useCacheRefresh', 'use', 'useActionState', 'useCallback',
        'useContext', 'useDebugValue', 'useDeferredValue', 'useEffect',
        'useEffectEvent', 'useId', 'useImperativeHandle', 'useInsertionEffect',
        'useLayoutEffect', 'useMemo', 'useOptimistic', 'useReducer', 'useRef',
        'useState', 'useSyncExternalStore', 'useTransition', 'version',
      ] as const;
      const REACT_DOM_EXPORTS = [
        '__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
        'createPortal', 'flushSync', 'preconnect', 'prefetchDNS', 'preinit',
        'preinitModule', 'preload', 'preloadModule', 'requestFormReset',
        'unstable_batchedUpdates', 'useFormState', 'useFormStatus', 'version',
      ] as const;
      const FIX_DEFS: readonly FixDef[] = [
        {
          name: 'react.js',
          requireFn: 'require_react',
          sanityCheck: 'exports.forwardRef',
          exports: REACT_19_EXPORTS,
        },
        {
          name: 'react_jsx-runtime.js',
          requireFn: 'require_jsx_runtime',
          sanityCheck: 'exports.jsx',
          exports: ['jsx', 'jsxs'],
        },
        {
          name: 'react_jsx-dev-runtime.js',
          requireFn: 'require_jsx_dev_runtime',
          sanityCheck: 'exports.jsxDEV',
          exports: ['jsxDEV'],
        },
        {
          name: 'react-dom.js',
          requireFn: 'require_react_dom',
          sanityCheck: 'exports.createPortal',
          exports: REACT_DOM_EXPORTS,
        },
      ] as const;

      const INJECT_MARK = '[fix-react-19-named-exports] INJECTION START';

      function injectExports(code: string, def: FixDef): string | null {
        if (code.includes(INJECT_MARK)) return null;        // 已注入
        if (!code.includes(def.sanityCheck)) return null;   // 身份不匹配（防御）
        const endDefault = `export default ${def.requireFn}();`;
        if (!code.includes(endDefault)) return null;        // 非 rolldown 目标格式
        const nsVar = `__FIX_R19_${def.name.replace(/[^A-Za-z0-9]/g, '_')}__`;
        const exportsList = def.exports
          .map((n) => `${n} = ${nsVar}.${n}`)
          .join(', ');
        const postfix =
          `\n\n/* ${INJECT_MARK} (${def.name}) */\n`
          + `const ${nsVar} = ${def.requireFn}();\n`
          + `export const ${exportsList};\n`
          + `/* [fix-react-19-named-exports] INJECTION END */\n`;
        return code + postfix;
      }

      return {
        name: 'fix-react-19-named-exports',
        enforce: 'pre' as const,

        // ===== 通道 1：transform 兜底 =====
        transform(code: string, id: string) {
          const norm = id.replace(/\\/g, '/');
          for (const def of FIX_DEFS) {
            // 覆盖 /node_modules/.vite/deps/<name>.js 以及带 query 版本
            if (!norm.endsWith(`/node_modules/.vite/deps/${def.name}`)
              && !norm.includes(`/node_modules/.vite/deps/${def.name}?`)) continue;
            const patched = injectExports(code, def);
            if (patched) return patched;
          }
          return null;
        },

        // ===== 通道 2：configureServer + fs 直接改写磁盘 =====
        // rolldown 预打包后的 deps 文件可能不走 transform（静态文件服务），
        // 所以必须在文件生成后直接修改磁盘内容，再让浏览器刷新。
        async configureServer(server: any) {
          const depsDir = path.resolve(__dirname, 'node_modules/.vite/deps');
          let applied = false;

          async function tryPatchAll(): Promise<boolean> {
            let patchedAny = false;
            for (const def of FIX_DEFS) {
              const f = path.join(depsDir, def.name);
              try {
                const stat = await fsp.stat(f);
                if (!stat.isFile()) continue;
                const original = await fsp.readFile(f, 'utf8');
                const patched = injectExports(original, def);
                if (patched) {
                  await fsp.writeFile(f, patched, 'utf8');
                  server.config.logger.info(
                    `[fix-react-19-named-exports] patched ${def.name} `
                    + `(+${def.exports.length} named exports)`,
                  );
                  patchedAny = true;
                }
              } catch (e) {
                // 文件还没生成（optimizeDeps 尚未完成）→ 跳过，下轮再试
              }
            }
            return patchedAny;
          }

          // 轮询 2s * 30 = 最多 60s 等 optimizeDeps 把文件写到磁盘
          let attempts = 0;
          const interval = setInterval(async () => {
            attempts += 1;
            const did = await tryPatchAll();
            if (did && !applied) {
              applied = true;
              clearInterval(interval);
              // 等 500ms 避免与首次请求竞争，再推 HMR full-reload 给所有连上来的客户端
              setTimeout(() => {
                try {
                  server.ws.send({ type: 'full-reload' });
                  server.config.logger.info(
                    '[fix-react-19-named-exports] sent full-reload to clients',
                  );
                } catch { /* no-op: 客户端可能还没连上 */ }
              }, 500);
            } else if (attempts > 30) {
              clearInterval(interval);
            }
          }, 2000);
        },
      };
    })(),
    // C3 §5.3: dayjs/plugin/* UMD 格式 default export 丢失修复
    // 错误：SyntaxError: ".../dayjs/plugin/advancedFormat.js does not provide
    //       an export named 'default'"
    // 原因：dayjs 插件是纯 UMD 文件（module.exports = factory() + globalThis 赋值），
    //       Vite 8/rolldown 某些 @fs 路径下识别不到它是 CJS，导致未生成 ESM
    //       default export，代码写 `import advFormat from 'dayjs/plugin/advancedFormat'`
    //       就会报 named default 缺失。
    // 修复：enforce=pre transform 命中 dayjs/plugin/* 路径，手动把 UMD 包成
    //       带 module/exports 的 CJS 沙盒执行，再取结果做 export default。
    {
      name: 'fix-dayjs-umd-default',
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        const norm = id.replace(/\\/g, '/').split('?')[0];
        // 覆盖 dayjs 包内所有 *.js 文件（主入口 dayjs.min.js / dayjs.js +
        // plugin/*.js + locale/*.js 等），都是 UMD 格式：
        //   module.exports = factory() + globalThis.dayjs_xxx = factory()
        // 但 Vite/@fs 加载场景下有时不会被识别为 CJS，从而缺
        // `export default` → SyntaxError。
        const isDayjsBundle =
          /node_modules\/\.pnpm\/dayjs@[^/]+\/node_modules\/dayjs(\/[^/]+)*\/[^/]+\.js$/
            .test(norm)
          || /node_modules\/dayjs(\/[^/]+)*\/[^/]+\.js$/.test(norm);
        if (!isDayjsBundle) return null;
        if (code.includes('export default')) return null;
        const wrapped = [
          'const __DAYJS_UMD_M__ = { exports: {} };',
          '(function(module, exports) {',
          code,
          '}).call(undefined, __DAYJS_UMD_M__, __DAYJS_UMD_M__.exports);',
          'export default (__DAYJS_UMD_M__.exports && __DAYJS_UMD_M__.exports.default)',
          '  || __DAYJS_UMD_M__.exports;',
          '',
        ].join('\n');
        return wrapped;
      },
    },
    // C3 §5.4: 通用 node_modules CJS→ESM named-exports 缺失修复
    // 错误模式（Vite 8 + pnpm hoisted / @fs 加载下广泛出现）：
    //   SyntaxError: "/@fs/.../cookie/dist/index.js does not provide an export named 'parse'"
    // 根本原因：CJS 文件存在 `exports.parse = ...` 等赋值，但 Vite/Rolldown 在
    //           通过 @fs 直读 pnpm 真实物理路径时，未把这些 CJS 属性赋值转换为
    //           ESM `export const xxx = ...` 形式，仅生成 `export default require_xxx()`
    //           或完全不生成 ESM export。
    // 覆盖范围：所有 node_modules/.pnpm/** / node_modules/** 中的 .js 源文件，
    //           但排除 .vite/deps/*（留给 react 系列插件）、react/dayjs
    //           （已有专门插件处理）、已经写了 ESM `export` 关键字的文件。
    // 修复策略（enforce=pre，运行时 transform）：
    //   1) 用正则从代码提取全部 `exports.<name> = ` 与 `module.exports.<name> = `
    //      的属性名（JS 标识符过滤）。
    //   2) 把原代码包进 IIFE，注入空的 module/exports 对象，运行 UMD/CJS 工厂。
    //   3) 追加 `export default (...)` + 所有属性的
    //      `export const {name} = __ns.{name}` named exports。
    (() => {
      const INJECT_MARK_GENERAL = '[fix-cjs-named-exports-general] INJECTION START';
      const JS_IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
      // JS 严格模式/模块作用域下不能当变量名的保留字（只处理 named export
      // 里用到的标识符即可，default 等关键字不会被 exports.xxx= 命中）
      const RESERVED = new Set([
        'import', 'export', 'await', 'class', 'enum', 'extends', 'super',
        'package', 'private', 'protected', 'public', 'interface',
        'implements', 'let', 'static', 'yield', 'const', 'arguments', 'eval',
      ]);

      // ===== 辅助：从源码中提取所有 exports.<name> = / module.exports.<name> = 名称 =====
      function extractCjsExportNames(code: string): string[] {
        const names = new Set<string>();
        const re = /(?:^|[^.\w$])(?:exports|module\.exports)\.([A-Za-z_$][\w$]*)\s*=/gm;
        for (const m of code.matchAll(re)) {
          const n = m[1];
          if (!JS_IDENT_RE.test(n)) continue;
          if (RESERVED.has(n)) continue;
          names.add(n);
        }
        return Array.from(names);
      }

      // ===== 辅助：识别残缺的 rolldown/Vite __commonJS ESM 包装 =====
      // 形如：
      //   import { t as __commonJS } from "./rolldown-runtime-XXX.js";
      //   var require_COOKIE = /* @__PURE__ */ __commonJS((function(exports, module){ ... exports.parse = ... })());
      //   ...
      //   export default require_COOKIE();
      // （结尾没有 named exports）=> 需要补解构 named exports
      function detectBrokenCommonJSWrapper(code: string) {
        if (code.includes(INJECT_MARK_GENERAL)) return null;                      // 已修复
        // 结尾的 require 函数名（必须严格匹配这行格式）
        const endM = code.match(/export\s+default\s+(require_[A-Za-z0-9_$]+)\s*\(\s*\)\s*;?\s*$/);
        if (!endM) return null;
        const requireFn = endM[1];
        // var require_XXX = /* @__PURE__ */ __commonJS(...);
        // 或 let / const 都可以
        const declM = new RegExp(
          `(?:var|let|const)\\s+${requireFn}\\s*=\\s*(?:/\\*[^*]*\\*+([^/*][^*]*\\*+)*/\\s*)?__commonJS\\s*\\(`,
          'm',
        ).exec(code);
        if (!declM) return null;
        // 取 CJS 工厂函数体内的原始代码片段（直接取整个 code 来找 exports.xxx 也行，
        // 因为外层的 wrapper 不会出现 exports.xxx =，内部工厂才会有）
        const names = extractCjsExportNames(code);
        if (names.length === 0) return null;
        return { requireFn, names };
      }

      return {
        name: 'fix-cjs-named-exports-general',
        enforce: 'pre' as const,
        async transform(code: string, id: string) {
          const norm = id.replace(/\\/g, '/').split('?')[0];
          if (!norm.endsWith('.js')) return null;

          // —— 范围限定：只处理 node_modules 下的源文件（非项目源码）——
          if (!norm.includes('/node_modules/')) return null;
          // dayjs 系列是 UMD 整体赋值 + 全限定路径，交给 fix-dayjs 专用插件
          //   （它在 transform 里会把 this 绑定成 undefined 来模拟 UMD）
          if (/\/node_modules\/\.pnpm\/dayjs@[^/]+\/node_modules\//.test(norm)) return null;
          if (norm.includes('/node_modules/dayjs/')) return null;

          // ===== 通道 X：React 生态特有的「bare CJS entry 双 require 模式」=====
          // 典型文件：
          //   react/index.js
          //   react-dom/index.js
          //   react-dom/client.js
          // 内容格式：
          //   'use strict';
          //   if (process.env.NODE_ENV === 'production') {
          //     module.exports = require('./cjs/xxx.production.js');
          //   } else {
          //     module.exports = require('./cjs/xxx.development.js');
          //   }
          // 这些文件被 exclude 在 optimizeDeps 外，@fs 直读 → 含裸 require() →
          // ESM 下 require 未定义 + 无 named exports。
          // 这里将其改写成 ESM import（走 DEV 分支），再手动补 named exports，
          // 这样 DEV 分支目标文件本身不含裸 require()，会被通道 B 正常处理。
          const BARE_ENTRY_RE = new RegExp(
            '^\\s*'
            + '(?:[\'"]use strict[\'"]\\s*;?\\s*\\n\\s*)?'
            + 'if\\s*\\(\\s*process\\.env\\.NODE_ENV\\s*===\\s*[\'"]production[\'"]\\s*\\)\\s*\\{\\s*'
            + 'module\\.exports\\s*=\\s*require\\s*\\(\\s*[\'"](\\.\\/cjs\\/[^\'"]+\\.production(?:\\.min)?\\.js)[\'"]\\s*\\)\\s*;\\s*\\}\\s*'
            + 'else\\s*\\{\\s*'
            + 'module\\.exports\\s*=\\s*require\\s*\\(\\s*[\'"](\\.\\/cjs\\/[^\'"]+\\.development(?:\\.min)?\\.js)[\'"]\\s*\\)\\s*;\\s*\\}\\s*$',
            'm',
          );
          const bareEntryMatch = BARE_ENTRY_RE.exec(code);
          if (bareEntryMatch) {
            const devRel = bareEntryMatch[2];
            const { createRequire } = await import('node:module');
            const fsMod = await import('node:fs');
            // 当前文件的磁盘绝对路径（去掉 /@fs 前缀和 query）
            const diskPath = norm.startsWith('/@fs/') ? norm.slice('/@fs'.length) : norm;
            const devAbs = createRequire(diskPath).resolve(devRel);
            let devCode = '';
            try {
              devCode = fsMod.readFileSync(devAbs, 'utf8');
            } catch (e) {
              console.warn('[fix-cjs-general] channel X cannot read', devRel, '->', devAbs, e);
            }
            const devNames = extractCjsExportNames(devCode);
            // 命名空间变量名用 hash，避免冲突（包名含连字符需清洗为合法标识符）
            const _pkgSlug = (norm.split('/').slice(-2, -1)[0] || 'mod').replace(/[^A-Za-z0-9_$]/g, '_');
            const nsVar = `__FIX_BARE_ENTRY_NS_${_pkgSlug}__`;
            let out = `\n/* ${INJECT_MARK_GENERAL} (channel-X: bare-cjs-dual-require → ESM) */\n`;
            out += `import * as ${nsVar} from ${JSON.stringify(devRel)};\n`;
            out += `export default ${nsVar};\n`;
            if (devNames.length) {
              out += 'export const '
                + devNames.map((n) => `${n} = ${nsVar}.${n}`).join(', ')
                + ';\n';
            }
            return out;
          }

          // —— 通道 A：残缺 __commonJS ESM 包装（Vite/Rolldown 生成，
          //             外层有 export default 但缺少 named exports）——
          const wrapper = detectBrokenCommonJSWrapper(code);
          if (wrapper) {
            // .vite/deps/react.js 等专门插件已经覆盖过，它们的 requireFn 名是
            // `require_react` 等，这里不再重复处理（但 detectBroken 本身也会因为
            //  injection mark 已存在而 return null）
            const { requireFn, names } = wrapper;
            const nsVar = `__FIX_CJS_WRAP_NS_${requireFn.replace(/[^A-Za-z0-9_]/g, '_')}__`;
            const decl = `const ${nsVar} = ${requireFn}();`;
            const namedExports =
              'export const '
              + names.map((n) => `${n} = ${nsVar}.${n}`).join(', ')
              + ';';
            const postfix =
              `\n\n/* ${INJECT_MARK_GENERAL} (__commonJS wrapper fix) */\n`
              + `${decl}\n${namedExports}\n`;
            return code + postfix;
          }

          // —— 快速排除：如果已经是正常 ESM 或已修复 ——
          if (code.includes(INJECT_MARK_GENERAL)) return null;
          // 存在 ESM `export` 关键字（严格匹配：`export ` 或 `export{` 或 `export\n`，
          // 避免误匹配 CJS `exports.xxx =` 的 `exports` 单词）
          if (/\bexport(?:\s+|[{;]|$)/m.test(code)) return null;
          // 如果文件有 `import` 关键字（ESM import 语句），说明已经是 ESM
          if (/\bimport\s*(?:['"({]|\w+\s*,)/.test(code)) return null;

          // —— 通道 B：原始 CJS/UMD 文件（Vite 未做 CJS 转换，纯 CJS 代码）——
          const namesArr = extractCjsExportNames(code);
          const hasModuleExportsAssign = /(?:^|[^.\w$])module\.exports\s*=[^=]/m.test(code);
          if (namesArr.length === 0 && !hasModuleExportsAssign) return null;
          // 防御：如果代码里有裸 `require(<string-or-var>)` 调用（需要 Node require
          // 语义，例如 `require('./cjs/react-dom-client.development.js')`），ESM 环境下
          // 没有全局 require，强行包装 IIFE 会导致 ReferenceError: require is not defined。
          // 这类文件应该通过 optimizeDeps.include 让 Vite esbuild/rolldown 打包
          // （打包后会有 __commonJS 或 rollup 提供的 require 兼容层）。
          if (/(?:^|[^.\w$])require\s*\(/.test(code)) return null;

          const nsVar = '__FIX_CJS_NS__';
          const namedExportsList = namesArr.length
            ? 'export const '
              + namesArr.map((n) => `${n} = ${nsVar}.${n}`).join(', ')
              + ';'
            : '';
          const wrapped = [
            `/* ${INJECT_MARK_GENERAL} (raw CJS/UMD fix) */`,
            `const ${nsVar} = { exports: {} };`,
            `(function(module, exports){`,
            code,
            `}).call(undefined, ${nsVar}, ${nsVar}.exports);`,
            `export default (${nsVar}.exports && ${nsVar}.exports.default) || ${nsVar}.exports;`,
            namedExportsList,
            '',
          ].filter(Boolean).join('\n');
          return wrapped;
        },
      };
    })(),
    react(),
    fixLocalSharedImportMapNullBytePlugin,
    // V81-202608 P2: MF 虚模块 dev-server 兜底中间件（仅 apply: 'serve'）
    // 必须放在 federation() 之前，因为它的 configureServer 要先于 Vite 默认 /@id/ 处理器
    // 但实际中间件是在 configureServer 回调内动态用 server.middlewares.use()
    // 插到栈顶，所以插件注册顺序不严格，只要在 defineConfig 的 plugins 里即可。
    fixMfVirtualModulesDevServerPlugin,
    // V65.1.2: 启用 gzip + brotli 压缩
    // - gzip 兼容性最好（所有现代浏览器），用 vite-plugin-compression
    // - brotli 压缩率更高（比 gzip 再降 15-25%），主流浏览器均支持；
    //   因 vite-plugin-compression 双实例 mtimeCache 共享 bug，改用自定义插件
    // - threshold=10240 只压缩 >10KB 的资源，避免小文件压缩后反而变大
    // - deleteOriginFile=false 保留原始文件，CDN 可按需 fallback
    viteCompression({
      algorithm: 'gzip',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    brotliCompressPlugin(),
    // V72 P1-3: visualizer 改为可选（默认关闭）。如需生成 stats.html，
    // 执行：VITE_BUILD_VISUALIZER=1 pnpm vite build
    // 避免每次构建都遍历产物生成 HTML，节省 ~5-8s
    ...(process.env.VITE_BUILD_VISUALIZER
      ? [
          visualizer({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
    /**
     * Module Federation 插件：仅在 module-federation / hybrid 部署模式下启用。
     *
     * static 模式（本地安装版、单机部署、离线环境）必须关闭 federation：
     *   - static 模式下 buildRemotes() 返回空对象，无任何远程模块需要加载；
     *   - 开启 federation 即使 remotes={} 也会为 shared 依赖生成
     *     __loadShare__ 虚模块包装（react / react-dom / prop-types 等），
     *     在 Vite 8 + @module-federation/vite 组合下这些虚模块的 null-byte
     *     ID 常常无法进入 Vite 模块图 → 浏览器请求 @id/__x00__virtual:mf:...
     *     拿到空响应（Content-Type=""），表现为 NS_ERROR_CORRUPTED_CONTENT +
     *     "MIME 类型不允许" + DashboardPage 懒加载重试 3 次后失败。
     *   - 关闭 federation 后，所有共享依赖直接从 node_modules 静态解析，
     *     与 static 部署语义完全一致，不会触发任何 MF 相关 bug。
     *
     * 如需启用 SaaS 多 remote 架构：
     *   $ export VITE_DEPLOYMENT_MODE=module-federation
     *   或修改 .env.local 中的 VITE_DEPLOYMENT_MODE。
     */
    ...(DEPLOYMENT_MODE !== 'static'
      ? [
          federation({
            name: 'topems_portal',
            /**
             * Remote modules configuration
             * 核心模块通过 Module Federation 动态加载
             *
             * 部署模式:
             * - module-federation: 动态加载远程模块 (SaaS)
             * - static: 静态打包所有模块 (本地安装)
             * - hybrid: 核心静态 + 插件动态
             *
             * 多 remote 扩展：
             * - 编译期声明的 remote 通过 buildRemotes() 返回
             * - 运行时按需加载见 apps/web/src/microfrontend/RemoteLoader.tsx
             * - 模块清单（业务域拆分、权限、预加载策略）见
             *   apps/web/src/microfrontend/config.ts 的 REMOTE_MODULES
             */
            remotes: buildRemotes(),
            /**
             * Shared dependencies - These are shared between host and remotes
             * 配置为 singleton 模式避免重复加载
             *
             * 新增 shared 依赖（版本协商 + 降级）：
             * - @tanstack/react-query: 业务模块共享 QueryClient
             * - react-hook-form: 业务模块共享表单状态
             * - zod: 业务模块共享 schema 验证
             */
            shared: {
              react: {
                singleton: true,
                requiredVersion: '^19.0.0',
                // V64：MF 的 loadShare runtime wrapper 会基于 package.json 的 named exports
                // 列表生成 import * 壳。在 React 19 中 act 等可选导出会因为 wrapper
                // 没包含它们而表现为 undefined，导致 @react-three/fiber 这类库
                // 通过 `import * as React from 'react' + React['act'+'']` 访问时触发
                // `IMPORT_IS_UNDEFINED`（warning id 落在消费方文件而非 MF 虚模块上）。
                // 解决：打开 eager，让本地 React 直接作为 fallback 静态加载，
                // 绕开 loadShare wrapper；同时关闭 strictVersion 避免因为
                // small patch 差异（19.2.7 vs 19.2.8 之类）失败。
                eager: true,
                strictVersion: false,
              },
              'react-dom': {
                singleton: true,
                requiredVersion: '^19.0.0',
                eager: true,
                strictVersion: false,
              },
              'react-router-dom': {
                singleton: true,
                requiredVersion: '^7.0.0',
                strictVersion: true,
              },
              '@tanstack/react-query': {
                singleton: true,
                requiredVersion: '^5.0.0',
                strictVersion: true,
              },
              '@mui/material': {
                singleton: true,
                requiredVersion: '^9.0.0',
                // CJS 传递依赖（prop-types、@babel/runtime 等）在 MF loadShare
                // wrapper 中找不到 default export，导致 "doesn't provide an export
                // named: 'default'" 错误。开启 eager 走静态加载绕开此问题。
                eager: true,
                strictVersion: false,
              },
              '@emotion/react': {
                singleton: true,
                requiredVersion: '^11.0.0',
                eager: true,
                strictVersion: false,
              },
              '@emotion/styled': {
                singleton: true,
                requiredVersion: '^11.0.0',
                eager: true,
                strictVersion: false,
              },
              // CJS 模块：react-is 是 @emotion/react/styled 的传递依赖，
              // 其 named export (isValidElementType 等) 通过 MF loadShare wrapper
              // 无法正确导出，需要 eager 走静态加载
              'react-is': {
                singleton: true,
                requiredVersion: '^19.0.0',
                eager: true,
                strictVersion: false,
              },
              // CJS 模块：prop-types 是 @mui/material / recharts / 旧类库的传递依赖。
              // 如果不加 singleton+eager，MF remote 会用 loadShare 直接从
              // pnpm virtual store 的 /@fs/... 路径 serve 原始 CJS 文件（prop-types/index.js），
              // 从而在 ESM 下抛出 "doesn't provide an export named: 'default'"，
              // 表现为 lazy-loaded DashboardPage 重试 3 次后崩溃。加 eager 后，
              // 统一由 host 的 optimizeDeps（已 include 'prop-types'）预构建后分发，
              // default/interop 均正常。dedupe 数组中也已列出 prop-types 防版本分叉。
              'prop-types': {
                singleton: true,
                eager: true,
                strictVersion: false,
              },
              zustand: {
                singleton: true,
                requiredVersion: '^5.0.0',
                strictVersion: true,
              },
              i18next: {
                singleton: true,
                requiredVersion: '^26.0.0',
                strictVersion: true,
              },
              'react-i18next': {
                singleton: true,
                requiredVersion: '^17.0.0',
                strictVersion: true,
              },
              axios: {
                singleton: true,
                requiredVersion: '^1.0.0',
                strictVersion: true,
              },
              dayjs: {
                singleton: true,
                requiredVersion: '^1.11.0',
                strictVersion: true,
              },
              'react-hook-form': {
                singleton: true,
                requiredVersion: '^7.0.0',
                strictVersion: true,
              },
              zod: {
                singleton: true,
                requiredVersion: '^4.0.0',
                strictVersion: true,
              },
              '@tanstack/react-table': {
                singleton: true,
                requiredVersion: '^8.0.0',
                strictVersion: true,
              },
            },
          }),
        ]
      : []),
    // V72 P2-4c: recharts 拆分插件必须在 federation() 之后执行（enforce: 'post'）
    // 以确保 MF 不会覆盖我们的 manualChunks 配置
    topemsRechartsSplitPlugin(),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.NEXT_PUBLIC_WS_URL': JSON.stringify(
      process.env.VITE_WS_URL || 'ws://localhost:8080/ws'
    ),
    'process.env.NEXT_PUBLIC_WS_SIGNING_SECRET': JSON.stringify(
      process.env.VITE_WS_SIGNING_SECRET || 'topems-ws-signing-secret'
    ),
  },
  optimizeDeps: {
    exclude: [
      '@mui/lab',
      // C3 §5 P4 更新：不再把 react / react-dom 放在 exclude 里。
      //   之前 exclude 是为了避免 lucide-react drag react 进非规范路径丢 named exports，
      //   但 lucide-react 也已经 exclude 了（raw ESM native browser load），
      //   不会触发 optimize 阶段 drag react。现在把 react/react-dom **加入预打包**，
      //   让 fix-react-19-named-exports 插件的 fs patch 真正作用在
      //   `.vite/deps/react.js / react-dom.js / jsx-runtime.js` 上（之前 exclude
      //   导致这些文件根本不存在，patch 打在空气上）。
      // '@tanstack/react-query',  // 仍保留 exclude: 已经是 ESM，不需打包
      '@tanstack/react-query',
      'react-router-dom',
      'zustand',
      'i18next',
      'react-i18next',
      'axios',
      'dayjs',
      'react-hook-form',
      'zod',
      '@tanstack/react-table',
      // V81-202608 P2: Exclude lucide-react from optimizeDeps to prevent esbuild
      // pre-bundling from producing a broken react.js bundle in deps cache missing
      // 'createElement' export. The barrel imports icons via
      // lucide-react/dist/esm/icons/*.mjs subpaths, whose internal createLucideIcon
      // does `import { createElement } from 'react'`. With react **now INCLUDED**
      // in optimize (see P4 above), lucide-react staying excluded keeps itself as
      // raw ESM modules loaded natively by the browser → directly import from the
      // optimized .vite/deps/react.js → preserves all React 19 named exports correctly.
      'lucide-react',
    ],
    // Force-pre-optimize CJS 传递依赖：确保 prop-types 等在被 @mui/material
    // 引用时以 ESM 包装形式提供 default 导出，而不是以 @fs/ raw disk 形式提供
    include: [
      'prop-types',
      '@emotion/is-prop-valid',
      'stylis',
      'clsx',
      'camelcase',
      'decamelize',
      'react-is',
      // C3 §5 P3: Vite 8 通过 @fs 直读依赖时 CJS→ESM 转换失败的库,
      //   强制预打包进 deps 让 rolldown 生成完整 ESM wrapper：
      //   - react-dom/client：裸 CJS 入口内含 `require('./cjs/...')`，
      //     ESM 环境没有全局 require → 打包后 rolldown 提供 require 兼容层
      //     并自动生成 `export default require_xxx()`。
      // （注：cookie 是 react-router 的传递依赖，但 apps/web 里 resolve 不到
      //   `react-router > cookie`，因此通过 @fs 加载时走 fix-cjs-general 插件
      //   的通道 A（残缺 __commonJS wrapper → 补 named exports））。
      'react-dom/client',
    ],
  },
  resolve: {
    alias: [
      // C3 §5.1: React 19 兼容修复 —— use-sync-external-store CJS shim interop 失败
      // 错误 1: ".../use-sync-external-store/shim/index.js does not provide an export named 'useSyncExternalStore'"
      // 原因 1: shim/index.js 为 CJS（module.exports = require('../cjs/...')），
      //         Vite 8 在 named import 场景下无法从 CJS default 正确解构 named export。
      // 错误 2: 导入路径有时是裸模块 'use-sync-external-store/shim'，有时是
      //         绝对路径 '/@fs/.../use-sync-external-store/shim/index.js?v=xx'（@fs 形式跳过 ^ 锚定）
      // 错误 3: 若直接 alias 到 'react'，会干扰 Vite dep pre-bundle → 副次报错
      //         "react.js does not provide an export named 'forwardRef'"
      // 修复: 指向本地 ESM shim（src/shims/use-sync-external-store-shim.ts），
      //       用非锚定正则匹配所有包含该路径片段的导入，覆盖：
      //         - use-sync-external-store/shim
      //         - use-sync-external-store/shim/index
      //         - use-sync-external-store/shim/index.js
      //         - /@fs/xxx/node_modules/.pnpm/xxx/use-sync-external-store/*/shim/index.js?v=xx
      //         - 以及 Windows 反斜杠路径变体
      {
        find: /use-sync-external-store[\\/]+shim(?:[\\/]+index(?:\.js)?)?$/,
        replacement: path.resolve(__dirname, './src/shims/use-sync-external-store-shim.ts'),
      },
      // C3 §5 P1: lucide 子路径优化 -55%
      // Only rewrite the EXACT bare specifier 'lucide-react' to our barrel
      // (236 actually-used icons, each from its own /dist/esm/icons/*.mjs subpath).
      // Subpaths like 'lucide-react/dynamic' intentionally bypass this rule
      // so DynamicIcon / dynamicIconImports continue working.
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, './src/components/icons') },
      // MUI 9.x 兼容修复：react-transition-group/cjs/TransitionGroupContext.js 在 ESM 中不存在
      // MUI 9.x 的 Transition.mjs 试图从 cjs 路径导入，但 react-transition-group 4.4.5 缺少这个文件
      // 修复：重定向到本地 shim 文件
      {
        find: /react-transition-group[\\/]+cjs[\\/]+TransitionGroupContext\.js$/,
        replacement: path.resolve(__dirname, './src/shims/TransitionGroupContext.js'),
      },
      // Existing aliases (converted to array form to coexist with the regex alias above)
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: '@topems/shared-types',
        replacement: path.resolve(__dirname, '../../packages/shared-types/src'),
      },
      {
        find: '@topems/shared-utils',
        replacement: path.resolve(__dirname, '../../packages/shared-utils/src'),
      },
      {
        find: '@topems/shared-components',
        replacement: path.resolve(__dirname, '../../packages/shared-components/src'),
      },
      { find: '@topems/tokens', replacement: path.resolve(__dirname, '../../packages/tokens/src') },
      { find: '@topems/shared-hooks',
        replacement: path.resolve(__dirname, '../../packages/shared-hooks/src'),
      },
      {
        find: '@topems/api-client',
        replacement: path.resolve(__dirname, '../../packages/api-client/src'),
      },
      // hoist-non-react-statics: package.json main 指向 .cjs.js（含裸 require('react-is')），
      // Vite @fs 直读时 CJS→ESM 转换失败。指向自包含 UMD 版本（内联 react-is），
      // fix-cjs-named-exports-general 插件会正确补 default + named exports。
      {
        find: /^hoist-non-react-statics$/,
        replacement: path.resolve(
          __dirname,
          '../../node_modules/.pnpm/hoist-non-react-statics@3.3.2/node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.js'
        ),
      },
    ],
    dedupe: [
      'react',
      'react-dom',
      'scheduler',
      'react-router-dom',
      '@tanstack/react-query',
      // CJS 传递依赖：防止 MF version negotiation 拦截
      'prop-types',
      '@babel/runtime',
      '@babel/runtime/helpers',
      '@emotion/cache',
      '@emotion/react',
      '@emotion/serialize',
      '@emotion/styled',
      '@emotion/utils',
      'stylis',
      'clsx',
      'react-is',
    ],
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    // V72 P1-3: terser → esbuild。最大单项优化：压缩阶段从 ~100s 降到 ~8s
    // - terser: 纯 JS 单线程，passes=2 导致两遍扫描，minify 占总构建 30%+
    // - esbuild: Go 实现 + 多线程并行，压缩比仅略降 5-8%（Brotli 后差距更小）
    // - 压缩选项：通过 esbuildOptions 对齐原 terser 的 drop_console / drop_debugger
    minify: 'esbuild',
    // V72 P1-3: 显式 workerCount = 8（10 核 CPU，留 2 核给 IO/GC/Brotli）
    // Vite 8 默认：os.cpus().length - 1 = 9，但 Rolldown/Vite 在部分阶段会额外
    // 产生 helper 线程，留 2 核余量避免上下文切换过载，实测吞吐更稳
    workerCount: 8,
    // V81-202608: i18n 翻译 JSON 已改为 lazy import.meta.glob + 按语言异步加载，
    // 每种语言独立 chunk（~3.5MB → 各自独立加载），不再有 7.1MB 聚合 chunk。
    // 阈值保持 1500（Vite 默认），任何超限 chunk 均为真实需要关注的拆分机会。
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    rollupOptions: {
      // V84: 正式开启 tree-shaking（原 treeshake:false 为 React19+Rolldown
      // 兼容 workaround：Jt is not a function）。2026-09-29 实测：
      //   - 开启后构建 rc=0，无 Jt 错误；total 19.12MB → 16.48MB（-14%）
      //   - dev-tools 孤儿 chunk 被自然摇掉（V83.1 purge 降级为防回归保险）
      //   - e2e A/B 验证：treeshake:true/false 产物在 auth-flow 5 项测试行为
      //     一致（4 过 1 挂，挂项为既有环境问题：dashboard 侧边栏依赖后端
      //     权限数据、骨架屏超时，与 tree-shaking 无关）
      // 若未来升级 Rolldown 后出现 Jt 类错误，回退为 treeshake:false 并排查模块
      treeshake: true,
      // https://rolldown.rs/reference/InputOptions.checks
      checks: {
        // Disable noisy plugin timing summary; only useful when tuning builds.
        pluginTimings: false,
      },
      // V81-202608: 所有 codeSplitting 分包规则（recharts 细粒度 + vendor 生态）
      // 统一由 topemsRechartsSplitPlugin() 插件（enforce: 'post'）合并至
      // output.codeSplitting.groups，避免被 @module-federation/vite 覆盖。
      // 此处在 rollupOptions 层不再声明 advancedChunks（Vite 8.1.5 会报 invalid key）。
      //
      // Suppress Module Federation virtual-file IMPORT_IS_UNDEFINED warnings for
      // shared packages that use named-only ESM exports (no default export).
      // This covers two MF virtual-module families:
      //   1. __prebuild__: shared-dependency prebuild shim that references
      //      __mfPrebuildNamespace.default for named-export-only libs.
      //   2. __loadShare__: runtime loadShare wrapper that proxies React.act
      //      and similar optional helpers via string access.
      // Runtime behavior is unaffected (prebuild uses ?? fallback; loadShare
      // returns undefined for missing members which consumers guard against).
      // Rolldown / Vite 8 的 IMPORT_IS_UNDEFINED warning 只有
      // { message, id, code, loc, pos } 五个字段，没有独立的
      // exporter / exported / names。好在 message 文本内同时包含：
      //   1. 被导入的虚模块路径（如 __mfe_internal__...__loadShare__react__loadShare__）
      //   2. 消费方真实文件（warning.id，如 @react-three/fiber/dist/events-xxx.esm.js）
      //   3. 未找到的导出名（backtick 包着，如 `act`）
      // 因此直接用 "warning.message + warning.id" 串联后做关键字宽松匹配即可。
      onwarn(warning: any, warn: any) {
        // Suppress INEFFECTIVE_DYNAMIC_IMPORT warnings from lazyLoadComponents.
        // Components in src/components/ are glob-imported by performance.tsx for
        // lazy-loading via data-lazy-component, but many are also statically
        // imported by other modules. The dynamic import still works correctly;
        // it just won't create separate chunks for dual-imported modules.
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') {
          const message = typeof warning.message === 'string' ? warning.message : '';
          if (message.includes('src/utils/performance.tsx')) {
            return;
          }
        }

        if (warning.code === 'IMPORT_IS_UNDEFINED') {
          const id = typeof warning.id === 'string' ? warning.id : '';
          const message = typeof warning.message === 'string' ? warning.message : '';
          const blob = message + '::' + id;

          // 1) MF 虚模块家族：只要是 __mfe_internal__ + (__prebuild__ | __loadShare__)
          //    这类 warning 一律忽略 —— 它们要么用 ?? 默认值、要么消费者自己判 undefined。
          const isMfVirtual =
            blob.includes('__mfe_internal__') &&
            (blob.includes('__prebuild__') || blob.includes('__loadShare__'));

          // 2) 经过 loadShare wrapper 的 react / react-dom 命名导出缺失。
          //    典型: @react-three/fiber 用 React['act'+''] 访问 act，
          //    真实 React 19.2+ 确实导出了 act（已单独验证 React.act 为 function）。
          const isSharedReactMissingNamedExport =
            blob.includes('loadShare__react') &&
            /`(act|unstable_act|useOptimistic|useActionState|useId|Activity)`/.test(message);

          // 3) 消费方来自 3D / GIS 生态且缺失的是 act（兼容写法永远有降级）。
          const is3DEcoActMissing =
            (id.includes('@react-three/fiber') ||
              id.includes('@react-three/drei') ||
              id.includes('@react-three/postprocessing')) &&
            /`act`/.test(message);

          if (isMfVirtual || isSharedReactMissingNamedExport || is3DEcoActMissing) {
            return;
          }
        }
        warn(warning);
      },
      output: {
        // V81-202608: 分包规则（codeSplitting.groups → 取代 advancedChunks / manualChunks）
        // 统一由顶层 Vite 插件 topemsRechartsSplitPlugin()（enforce: 'post'）
        // 在 @module-federation/vite 之后合并，避免 MF 覆盖分组设置。
        // 此处 output 仅保留 chunkFileNames 等格式字段，分包规则不在此设置。
      },
      // V72 P1-3: visualizer 已移到顶层 plugins 并改为可选化
      // （条件：VITE_BUILD_VISUALIZER=1），此处不再重复声明
    },
    // V72 P1-3: 使用 esbuild minify 后，esbuildOptions 替代 terserOptions。
    // 对齐原 terser 的生产压缩策略：drop console/debugger + 移除纯函数调用
    esbuildOptions: {
      // drop_console / drop_debugger 等价物
      drop: ['console', 'debugger'],
      // 目标与 build.target 对齐
      target: 'es2022',
      // 额外 legal comments 保留策略：与 terser 默认一致
      legalComments: 'none',
    },
    // V72 P1-3: terserOptions 已废弃（minify: esbuild → 走 esbuildOptions 分支）
    // 保留注释作为回滚参考
    // terserOptions: {
    //   compress: {
    //     drop_console: true,
    //     drop_debugger: true,
    //     pure_funcs: ['console.log', 'console.info', 'console.debug'],
    //     passes: 2,
    //     pure_getters: true,
    //     unsafe: true,
    //     unsafe_comps: true,
    //   },
    //   mangle: { safari10: true },
    // },
  },
  server: {
    port: BACKEND_PORTS.web, // 3000，从 ports.ts 单一信源读取
    // 监听 :: 双栈（IPv6 + IPv4-mapped）：Firefox 将 localhost 解析为 ::1，
    // 仅监听 127.0.0.1 会导致 Firefox 的 WS/HTTP 连接失败（IPv4/IPv6 差异）。
    // Node 的 :: 监听默认 dual-stack，同时接受 IPv4 与 IPv6 连接。
    host: '::',
    strictPort: true,
    // HMR: 跟随 127.0.0.1（IPv4），Vite 双栈监听下 IPv4 连接仍被接受
    // 不指定 port，让 Vite 自动跟随 server.port（避免 --port 命令行覆盖后 HMR 仍连旧端口）
    hmr: {
      host: '127.0.0.1',
      protocol: 'ws',
    },
    fs: {
      allow: ['..'],
    },
    proxy: buildServiceProxies(),
  },
});
