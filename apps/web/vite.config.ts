import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { federation } from '@module-federation/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'
import { promises as fsp } from 'fs'
import zlib from 'zlib'

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

const SERVICES: ServiceConfig[] = [
  // 核心服务
  { name: 'unified-core', port: CORE_PORT, apiPrefix: '/api/core', legacyPrefix: '/core/api', wsPath: '/ws/core' },
  
  // 虚拟服务（由 unified-core 提供）
  { name: 'iam', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/iam', legacyPrefix: '/iam/api' },
  { name: 'doc', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/doc', legacyPrefix: '/doc/api' },
  { name: 'flow', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/flow', legacyPrefix: '/flow/api' },
  { name: 'file', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/file', legacyPrefix: '/file/api' },

  // 独立 communication 服务（从 unified-core 外迁，端口 8084）
  // mail/notification/im 已外迁至此服务，路径为 /api/communication/{mail,notification,im}
  { name: 'communication', port: BACKEND_PORTS.communication, apiPrefix: '/api/communication' },

  // 独立 search 服务（全文搜索，端口 8082）
  { name: 'search', port: BACKEND_PORTS.search, apiPrefix: '/api/search' },

  // 独立 billing/ticket/feedback 服务（从 unified-core 外迁）
  // 旧路由 /api/core/{billing,ticket,feedback}/* 由 /api/core 通用代理兼容
  { name: 'billing', port: BACKEND_PORTS.billing, apiPrefix: '/api/billing' },
  { name: 'ticket', port: BACKEND_PORTS.ticket, apiPrefix: '/api/ticket' },
  { name: 'feedback', port: BACKEND_PORTS.feedback, apiPrefix: '/api/feedback' },
  
  // 经营管理
  { name: 'erp', port: BACKEND_PORTS.erp, apiPrefix: '/api/erp', legacyPrefix: '/erp/api' },
  { name: 'finance', port: BACKEND_PORTS.finance, apiPrefix: '/api/finance', legacyPrefix: '/finance/api' },
  { name: 'ai', port: BACKEND_PORTS.ai, apiPrefix: '/api/ai', legacyPrefix: '/ai/api' },
  
  // 协同办公
  { name: 'hrm', port: BACKEND_PORTS.hrm, apiPrefix: '/api/hrm', legacyPrefix: '/hrm/api' },
  { name: 'pm', port: BACKEND_PORTS.pm, apiPrefix: '/api/pm', legacyPrefix: '/pm/api' },
  { name: 'crm', port: BACKEND_PORTS.crm, apiPrefix: '/api/crm', legacyPrefix: '/crm/api' },
  
  // 生产制造
  { name: 'mes', port: BACKEND_PORTS.mes, apiPrefix: '/api/mes', legacyPrefix: '/mes/api', wsPath: '/ws/mes' },
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
  { name: 'analytics', port: BACKEND_PORTS.analytics, apiPrefix: '/api/analytics', wsPath: '/ws/analytics' },
  { name: 'monitor', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/monitor', legacyPrefix: '/monitor/api' },
  { name: 'portal', port: BACKEND_PORTS.portal, apiPrefix: '/api/portal' },

  // 主数据服务（独立进程，端口 8090）
  { name: 'master-data', port: BACKEND_PORTS['master-data'], apiPrefix: '/api/master-data' },
  
  // 基础设施
  { name: 'mobile', port: BACKEND_PORTS.mobile, apiPrefix: '/api/mobile', legacyPrefix: '/mobile/api' },
  { name: 'gis', port: BACKEND_PORTS.gis, apiPrefix: '/api/gis', legacyPrefix: '/gis/api', wsPath: '/ws/gis/map' },
  { name: 'integration', port: BACKEND_PORTS.integration, apiPrefix: '/api/integration', legacyPrefix: '/integration/api' },

  // 低代码平台（V64 新增，独立服务 svc/lowcode，端口 8088 占位）
  // 后端服务尚未立项时，proxy 指向 8088 会返回 503，前端 client.ts 已做 V64 静默降级
  { name: 'lowcode', port: BACKEND_PORTS.lowcode, apiPrefix: '/api/lowcode', legacyPrefix: '/lowcode/api' },

  // 自动化编排（V64 新增，初期落地 unified-core，端口 8000）
  // 路径前缀 /api/core/automation，与 moduleMapping.automation.apiBasePath 对齐
  // 后端 unified-core 未实现 automation 路由时返回 404，前端 client.ts 已做 V64 静默降级
  { name: 'automation', port: CORE_PORT, isVirtual: true, apiPrefix: '/api/core/automation' },
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
  rewrite: skipRewrite ? undefined : (path: string) => path.replace(new RegExp(`^\\/${serviceName}\\/api`), `/api/${serviceName}`),
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.includes('/health')) {
        console.warn(`[Vite Proxy] ${serviceName.toUpperCase()} service unavailable, error:`, err.message);
      }
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 503,
          success: false,
          message: `${serviceName.toUpperCase()} service is currently unavailable`,
          data: null
        }));
      }
    });
  }
});

const createNewApiProxyConfig = (servicePath: string, target: string) => ({
  target,
  changeOrigin: true,
  configure: (proxy: any) => {
    proxy.on('error', (err: Error, req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.includes('/health')) {
        console.warn(`[Vite Proxy] ${servicePath.toUpperCase()} service unavailable, error:`, err.message);
      }
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          code: 503,
          success: false,
          message: `${servicePath.toUpperCase()} service is currently unavailable`,
          data: null
        }));
      }
    });
  }
});

const HEALTH_CHECK_PATHS: Record<string, string> = {
  'ai': '/health',
  'bi': '/health',
  'monitor': '/health',
  'portal': '/health',
  'mobile': '/health',
  'gis': '/health',
  'integration': '/health',
  'hrm': '/health',
  'pm': '/health',
  'crm': '/health',
  'mes': '/health',
  'pdm': '/health',
  'scm': '/health',
  'wms': '/health',
  'srm': '/health',
  'qms': '/health',
  'lims': '/health',
  'ehs': '/health',
  'rd': '/health',
  'erp': '/health',
  'finance': '/health',
  'doc': '/health',
  'file': '/health',
  'communication': '/health',
  'unified-core': '/health',
  'flow': '/health',
  'billing': '/health',
  'ticket': '/health',
  'feedback': '/health',
  'master-data': '/health',
  'search': '/health',
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
        res.end(JSON.stringify({
          code: 503,
          success: false,
          message: `${serviceName.toUpperCase()} service health check failed`,
          data: null
        }));
      }
    });
  }
});

// ============================================================================
// 自动生成 proxy 配置
// 从 SERVICES 数组自动生成所有 API proxy、legacy proxy、health proxy、WS proxy
// ============================================================================

const buildServiceProxies = (): Record<string, any> => {
  const proxies: Record<string, any> = {};

  // Dashboard 路由走服务自身端口（原硬编码 8080 gateway 已移除）
  // 各服务的 /api/{mod}/dashboard 会自动被下方的 apiPrefix 规则捕获
  // （/api/finance/dashboard 匹配 /api/finance/ 前缀 → 转发到 8011）

  for (const svc of SERVICES) {
    const target = `http://localhost:${svc.port}`;

    // 1. 新 API 路径: /api/{service}/* 或 /api/core/{service}/*
    if (svc.apiPrefix) {
      proxies[svc.apiPrefix + '/'] = createNewApiProxyConfig(svc.apiPrefix.slice(1), target);
    }

    // 2. 旧路径（向后兼容）: /{service}/api -> /api/{service}
    if (svc.legacyPrefix) {
      const serviceName = svc.name.replace('-virtual', '');
      proxies[svc.legacyPrefix] = createServiceProxyConfig(serviceName, target);
      
      // health check
      const healthPath = svc.legacyPrefix.replace('/api', '/health');
      proxies[healthPath] = createHealthProxyConfig(serviceName, target);
    }

    // 3. WebSocket
    if (svc.wsPath) {
      proxies[svc.wsPath] = {
        target,
        changeOrigin: true,
        ws: true,
      };
    }
  }

  // /api/* 路径
  const apiV1Services = SERVICES.filter(s => s.apiPrefix && !s.isVirtual);
  for (const svc of apiV1Services) {
    const serviceName = svc.apiPrefix!.replace('/api/', '');
    proxies[`/api/${serviceName}`] = {
      target: `http://localhost:${svc.port}`,
      changeOrigin: true,
    };
  }

  // 核心服务 /api/core
  proxies['/api/core'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通用 health 端点
  proxies['/health'] = { target: `http://localhost:${CORE_PORT}`, changeOrigin: true };

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
            res.end(JSON.stringify({
              code: 503,
              success: false,
              message: `Remote module ${remote.name} (port ${remote.port}) is currently unavailable`,
              data: null
            }));
          }
        });
      }
    };
  }

  // ERP 插件代理（通过 unified-core）
  proxies['/api/plugins/erp'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };

  // 通讯服务向后兼容
  proxies['/comm/api'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/comm/, '/api/core/comm'),
  };
  proxies['/comm/health'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
  };
  proxies['/ws/notifications'] = {
    target: `http://localhost:${CORE_PORT}`,
    changeOrigin: true,
    ws: true,
  };

  return proxies;
};

// Fix for @module-federation/vite + Vite 8:
// The `generateLocalSharedImportMap` plugin's resolveId compares
// `source === getLocalSharedImportMapPath()`, but Vite 8 passes
// the source with a \0 prefix (null byte) in resolveId hooks.
// This pre-plugin normalizes the comparison so the virtual module resolves correctly.
const fixLocalSharedImportMapNullBytePlugin = {
  name: 'fix-mf-localSharedImportMap-nullbyte',
  enforce: 'pre' as const,
  resolveId(source: string) {
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
    const normalizedSource = source.replace(/^\0+/, '');
    if (normalizedSource === expectedPath || source === expectedResolved) {
      return expectedResolved;
    }
  },
};

// ============================================================================
// V65.1.2: 自定义 brotli 压缩插件
// 不用 vite-plugin-compression 的 brotli 实例，因为该插件用模块级 mtimeCache
// 在 gzip / brotli 双实例间共享：gzip 先跑完会 mtimeCache.set(file, Date.now())，
// brotli 再跑时 `mtimeMs <= mtimeCache.get(file)` 恒为 true，导致全部文件被跳过。
// 这里用独立 closeBundle 插件绕开该 bug，只做 brotli，无 mtime 缓存。
// ============================================================================
const BROTLI_THRESHOLD = 10240;
const BROTLI_FILE_RE = /\.(js|mjs|json|css|html)$/i;

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
  let logger: ResolvedConfig['logger'];
  return {
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
                  [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
                  [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                },
              },
              (err, result) => (err ? reject(err) : resolve(result)),
            );
          });
          await fsp.writeFile(`${filePath}.br`, compressed);
          count++;
        }),
      );
      if (count > 0) {
        logger.info(`\n✨ [brotli-custom]: compressed ${count} file(s) to .br`);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    fixLocalSharedImportMapNullBytePlugin,
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
        'react': {
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
        'zustand': {
          singleton: true,
          requiredVersion: '^5.0.0',
          strictVersion: true,
        },
        'i18next': {
          singleton: true,
          requiredVersion: '^26.0.0',
          strictVersion: true,
        },
        'react-i18next': {
          singleton: true,
          requiredVersion: '^17.0.0',
          strictVersion: true,
        },
        'axios': {
          singleton: true,
          requiredVersion: '^1.0.0',
          strictVersion: true,
        },
        'dayjs': {
          singleton: true,
          requiredVersion: '^1.11.0',
          strictVersion: true,
        },
        'react-hook-form': {
          singleton: true,
          requiredVersion: '^7.0.0',
          strictVersion: true,
        },
        'zod': {
          singleton: true,
          requiredVersion: '^4.0.0',
          strictVersion: true,
        },
        '@tanstack/react-table': {
          singleton: true,
          requiredVersion: '^8.0.0',
          strictVersion: true,
        },
        'framer-motion': {
          singleton: true,
          requiredVersion: '^12.0.0',
          strictVersion: true,
        },
      },
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.NEXT_PUBLIC_WS_URL': JSON.stringify(process.env.VITE_WS_URL || 'ws://localhost:8080/ws'),
    'process.env.NEXT_PUBLIC_WS_SIGNING_SECRET': JSON.stringify(process.env.VITE_WS_SIGNING_SECRET || 'topems-ws-signing-secret'),
  },
  optimizeDeps: {
    exclude: [
      '@mui/lab',
      'react',
      'react-dom',
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
      'framer-motion',
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
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/tokens': path.resolve(__dirname, '../../packages/tokens/src'),
      '@topems/shared-constants': path.resolve(__dirname, '../../packages/shared-constants/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
    },
    dedupe: [
      'react', 'react-dom', 'scheduler', 'react-router-dom', '@tanstack/react-query',
      // CJS 传递依赖：防止 MF version negotiation 拦截
      'prop-types', '@babel/runtime', '@babel/runtime/helpers',
      '@emotion/cache', '@emotion/serialize', '@emotion/utils',
      'stylis', 'clsx', 'react-is',
    ],
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1500,
    reportCompressedSize: false,
    rollupOptions: {
      treeshake: true,
      // https://rolldown.rs/reference/InputOptions.checks
      checks: {
        // Disable noisy plugin timing summary; only useful when tuning builds.
        pluginTimings: false,
      },
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
        // NOTE: manualChunks intentionally omitted because the MF plugin
        // (loaded unconditionally) wraps shared imports with async init helpers.
        // Grouping those into a single chunk creates circular async deps that
        // can cause the application to silently hang.
        // Vite default chunking + code-splitting via dynamic imports handles
        // vendor chunking adequately for both static and MF/hybrid modes.
      },
      plugins: [
        visualizer({
          filename: './dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
        }),
      ],
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
      mangle: {
        safari10: true,
      },
    },
  },
  server: {
    port: BACKEND_PORTS.web,  // 3000，从 ports.ts 单一信源读取
    host: '127.0.0.1',
    strictPort: true,
    // HMR: 显式指定 host 和 port 确保 Firefox WebSocket 连接正常
    // Firefox 默认将 localhost 解析为 ::1 (IPv6)，但 Vite 仅监听 IPv4
    // 因此统一使用 127.0.0.1 强制 IPv4
    hmr: {
      host: '127.0.0.1',
      port: BACKEND_PORTS.web,
      protocol: 'ws',
    },
    fs: {
      allow: ['..'],
    },
    proxy: buildServiceProxies(),
  },
});
