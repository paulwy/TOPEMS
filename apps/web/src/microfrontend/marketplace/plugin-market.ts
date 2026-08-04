/**
 * V47.0 微前端平台终局 — 插件市场
 *
 * 插件全生命周期管理，与模块市场（module-market.ts）互补:
 * - 插件注册与发现
 * - 插件安装与卸载
 * - 插件版本管理
 * - 插件依赖解析
 * - 插件评分与评价
 * - 插件搜索与分类
 *
 * 注意：本模块与 module-market.ts 相互独立，插件面向平台扩展能力，
 * 模块面向业务能力。两者通过 microfrontend/index.ts 统一导出。
 *
 * @example
 * import { pluginMarket, PluginMarket } from '@/microfrontend/marketplace/plugin-index';
 *
 * const results = pluginMarket.searchPlugins('日志');
 * pluginMarket.installPlugin({ plugin_id: 'log-enhancer', version: '1.0.0' });
 */

export enum PluginCategory {
  UI = 'ui',
  DATA = 'data',
  AUTH = 'auth',
  INTEGRATION = 'integration',
  DEVTOOL = 'dev-tool',
  ANALYTICS = 'analytics',
  AUTOMATION = 'automation',
  THEME = 'theme',
  TEMPLATE = 'template',
  SERVICE = 'service',
}

export type PluginSortType = 'popular' | 'newest' | 'rating' | 'downloads' | 'name';
export type InstallationStatus = 'pending' | 'installing' | 'installed' | 'failed' | 'uninstalled';

export interface PluginVersion {
  version: string;
  changelog: string;
  released_at: number;
  compatibility: string[];
  download_url: string;
  checksum: string;
  size_kb: number;
  is_prerelease?: boolean;
}

export interface PluginDependency {
  plugin_id: string;
  dependency_id: string;
  version_range: string;
  required: boolean;
}

export interface Plugin {
  plugin_id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  author_url?: string;
  category: PluginCategory;
  tags: string[];
  dependencies: PluginDependency[];
  permissions: string[];
  versions: PluginVersion[];
  install_count: number;
  rating: number;
  review_count: number;
  screenshots: string[];
  readme: string;
  repo_url: string;
  homepage?: string;
  license: string;
  price: number;
  is_free: boolean;
  is_featured: boolean;
  is_verified: boolean;
  created_at: number;
  updated_at: number;
  size_kb: number;
  icon: string;
  keywords: string[];
}

export interface PluginInstallRequest {
  plugin_id: string;
  version?: string;
  config?: Record<string, unknown>;
  permissions_granted: string[];
}

export interface PluginInstallation {
  installation_id: string;
  plugin_id: string;
  version: string;
  installed_at: number;
  status: InstallationStatus;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface PluginReview {
  review_id: string;
  plugin_id: string;
  user: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: number;
  helpful_count: number;
  version: string;
}

export interface PluginStats {
  total_plugins: number;
  installed_plugins: number;
  total_installs: number;
  total_reviews: number;
  average_rating: number;
  featured_count: number;
  by_category: Record<PluginCategory, number>;
}

export interface DependencyCheckResult {
  plugin_id: string;
  satisfied: boolean;
  missing: PluginDependency[];
  conflicts: DependencyConflict[];
}

export interface DependencyConflict {
  dependency_id: string;
  required_version: string;
  installed_version: string;
  conflict_type: 'version-mismatch' | 'incompatible' | 'circular';
}

const DAY_MS = 86400000;

const PRESET_PLUGINS: Plugin[] = [
  {
    plugin_id: 'log-enhancer',
    name: '日志增强器',
    description:
      '为微前端平台提供结构化日志、日志聚合、日志检索与可视化能力，支持多级别过滤与导出。',
    version: '2.4.1',
    author: 'TOPEMS Team',
    author_url: 'https://github.com/topems',
    category: PluginCategory.DEVTOOL,
    tags: ['日志', '调试', '监控'],
    dependencies: [],
    permissions: ['log:read', 'log:write'],
    versions: [
      {
        version: '2.4.1',
        changelog: '新增日志聚合与导出能力',
        released_at: Date.now() - DAY_MS * 2,
        compatibility: ['>=47.0'],
        download_url: '/plugins/log-enhancer/2.4.1.tgz',
        checksum: 'sha256:a1b2c3',
        size_kb: 120,
      },
      {
        version: '2.3.0',
        changelog: '支持多级别过滤',
        released_at: Date.now() - DAY_MS * 40,
        compatibility: ['>=46.0'],
        download_url: '/plugins/log-enhancer/2.3.0.tgz',
        checksum: 'sha256:d4e5f6',
        size_kb: 108,
      },
      {
        version: '2.0.0',
        changelog: '结构化日志重构',
        released_at: Date.now() - DAY_MS * 120,
        compatibility: ['>=44.0'],
        download_url: '/plugins/log-enhancer/2.0.0.tgz',
        checksum: 'sha256:g7h8i9',
        size_kb: 96,
      },
    ],
    install_count: 12450,
    rating: 4.8,
    review_count: 234,
    screenshots: [],
    readme: '# 日志增强器\n\n为微前端平台提供企业级日志能力。',
    repo_url: 'https://github.com/topems/log-enhancer',
    homepage: 'https://docs.topems.io/log-enhancer',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 360,
    updated_at: Date.now() - DAY_MS * 2,
    size_kb: 120,
    icon: 'file-text',
    keywords: ['log', 'logger', 'debug', '日志', '调试'],
  },
  {
    plugin_id: 'perf-monitor',
    name: '性能监控探针',
    description: '实时采集页面 FPS、内存、网络、长任务等性能指标，提供火焰图与性能瓶颈定位。',
    version: '3.2.0',
    author: 'TOPEMS Team',
    category: PluginCategory.ANALYTICS,
    tags: ['性能', '监控', 'FPS', '火焰图'],
    dependencies: [
      {
        plugin_id: 'perf-monitor',
        dependency_id: 'log-enhancer',
        version_range: '>=2.0.0',
        required: false,
      },
    ],
    permissions: ['perf:read', 'metrics:collect'],
    versions: [
      {
        version: '3.2.0',
        changelog: '新增火焰图分析',
        released_at: Date.now() - DAY_MS * 5,
        compatibility: ['>=47.0'],
        download_url: '/plugins/perf-monitor/3.2.0.tgz',
        checksum: 'sha256:b2c3d4',
        size_kb: 256,
      },
      {
        version: '3.1.0',
        changelog: '优化长任务检测',
        released_at: Date.now() - DAY_MS * 60,
        compatibility: ['>=46.0'],
        download_url: '/plugins/perf-monitor/3.1.0.tgz',
        checksum: 'sha256:e5f6g7',
        size_kb: 240,
      },
    ],
    install_count: 9870,
    rating: 4.7,
    review_count: 189,
    screenshots: [],
    readme: '# 性能监控探针\n\n实时性能指标采集与分析。',
    repo_url: 'https://github.com/topems/perf-monitor',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 300,
    updated_at: Date.now() - DAY_MS * 5,
    size_kb: 256,
    icon: 'activity',
    keywords: ['performance', 'fps', 'memory', 'flamegraph', '性能'],
  },
  {
    plugin_id: 'theme-pack-pro',
    name: '主题包 Pro',
    description:
      '20+ 精选主题包，含暗黑、Material、Ant Design、企业蓝等，支持自定义强调色与动态切换。',
    version: '4.1.0',
    author: 'Design Studio',
    category: PluginCategory.THEME,
    tags: ['主题', '暗黑', 'Material', '配色'],
    dependencies: [],
    permissions: ['theme:apply'],
    versions: [
      {
        version: '4.1.0',
        changelog: '新增 5 套企业主题',
        released_at: Date.now() - DAY_MS * 7,
        compatibility: ['>=45.0'],
        download_url: '/plugins/theme-pack-pro/4.1.0.tgz',
        checksum: 'sha256:c3d4e5',
        size_kb: 480,
      },
      {
        version: '4.0.0',
        changelog: '动态取色支持',
        released_at: Date.now() - DAY_MS * 90,
        compatibility: ['>=44.0'],
        download_url: '/plugins/theme-pack-pro/4.0.0.tgz',
        checksum: 'sha256:f6g7h8',
        size_kb: 420,
      },
    ],
    install_count: 15630,
    rating: 4.9,
    review_count: 412,
    screenshots: [],
    readme: '# 主题包 Pro\n\n精选企业级主题合集。',
    repo_url: 'https://github.com/topems/theme-pack-pro',
    license: 'Commercial',
    price: 99,
    is_free: false,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 400,
    updated_at: Date.now() - DAY_MS * 7,
    size_kb: 480,
    icon: 'palette',
    keywords: ['theme', 'dark', 'material', '主题', '配色'],
  },
  {
    plugin_id: 'form-validator',
    name: '表单验证引擎',
    description:
      '强大的表单验证引擎，内置 30+ 校验规则，支持异步校验、自定义规则、跨字段联动校验。',
    version: '2.0.3',
    author: 'TOPEMS Team',
    category: PluginCategory.UI,
    tags: ['表单', '验证', '校验'],
    dependencies: [],
    permissions: [],
    versions: [
      {
        version: '2.0.3',
        changelog: '修复异步校验竞态问题',
        released_at: Date.now() - DAY_MS * 3,
        compatibility: ['>=46.0'],
        download_url: '/plugins/form-validator/2.0.3.tgz',
        checksum: 'sha256:d4e5f6',
        size_kb: 88,
      },
      {
        version: '2.0.0',
        changelog: '重构校验规则引擎',
        released_at: Date.now() - DAY_MS * 80,
        compatibility: ['>=45.0'],
        download_url: '/plugins/form-validator/2.0.0.tgz',
        checksum: 'sha256:g7h8i9',
        size_kb: 80,
      },
    ],
    install_count: 7820,
    rating: 4.6,
    review_count: 145,
    screenshots: [],
    readme: '# 表单验证引擎\n\n企业级表单校验解决方案。',
    repo_url: 'https://github.com/topems/form-validator',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 250,
    updated_at: Date.now() - DAY_MS * 3,
    size_kb: 88,
    icon: 'check-circle',
    keywords: ['form', 'validation', 'validate', '表单', '验证'],
  },
  {
    plugin_id: 'chart-extension',
    name: '图表扩展包',
    description: '为内置图表组件扩展 15+ 高级图表类型：桑基图、关系图、地图、3D 图表、漏斗图等。',
    version: '1.8.0',
    author: 'DataViz Lab',
    category: PluginCategory.UI,
    tags: ['图表', '可视化', 'ECharts', '3D'],
    dependencies: [
      {
        plugin_id: 'chart-extension',
        dependency_id: 'perf-monitor',
        version_range: '>=3.0.0',
        required: false,
      },
    ],
    permissions: [],
    versions: [
      {
        version: '1.8.0',
        changelog: '新增 3D 散点图',
        released_at: Date.now() - DAY_MS * 10,
        compatibility: ['>=46.0'],
        download_url: '/plugins/chart-extension/1.8.0.tgz',
        checksum: 'sha256:e5f6g7',
        size_kb: 640,
      },
      {
        version: '1.7.0',
        changelog: '新增地理地图',
        released_at: Date.now() - DAY_MS * 70,
        compatibility: ['>=45.0'],
        download_url: '/plugins/chart-extension/1.7.0.tgz',
        checksum: 'sha256:h8i9j0',
        size_kb: 580,
      },
    ],
    install_count: 6450,
    rating: 4.8,
    review_count: 178,
    screenshots: [],
    readme: '# 图表扩展包\n\n高级图表类型扩展。',
    repo_url: 'https://github.com/topems/chart-extension',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 280,
    updated_at: Date.now() - DAY_MS * 10,
    size_kb: 640,
    icon: 'bar-chart-3',
    keywords: ['chart', 'echarts', '3d', 'map', '图表', '可视化'],
  },
  {
    plugin_id: 'export-toolkit',
    name: '导出工具包',
    description: '一键导出 Excel/CSV/PDF/Word，支持复杂表格、分页、自定义样式与图片嵌入。',
    version: '2.2.0',
    author: 'TOPEMS Team',
    category: PluginCategory.DEVTOOL,
    tags: ['导出', 'Excel', 'PDF', 'CSV'],
    dependencies: [],
    permissions: ['file:write'],
    versions: [
      {
        version: '2.2.0',
        changelog: '支持 PDF 图片嵌入',
        released_at: Date.now() - DAY_MS * 12,
        compatibility: ['>=46.0'],
        download_url: '/plugins/export-toolkit/2.2.0.tgz',
        checksum: 'sha256:f6g7h8',
        size_kb: 320,
      },
      {
        version: '2.1.0',
        changelog: '支持复杂表头',
        released_at: Date.now() - DAY_MS * 55,
        compatibility: ['>=45.0'],
        download_url: '/plugins/export-toolkit/2.1.0.tgz',
        checksum: 'sha256:i9j0k1',
        size_kb: 280,
      },
    ],
    install_count: 8920,
    rating: 4.7,
    review_count: 203,
    screenshots: [],
    readme: '# 导出工具包\n\n多格式数据导出能力。',
    repo_url: 'https://github.com/topems/export-toolkit',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 220,
    updated_at: Date.now() - DAY_MS * 12,
    size_kb: 320,
    icon: 'download',
    keywords: ['export', 'excel', 'pdf', 'csv', '导出'],
  },
  {
    plugin_id: 'auth-sso',
    name: 'SSO 单点登录',
    description: '集成 OAuth2/OIDC/SAML 单点登录，支持企业微信、钉钉、飞书、AD/LDAP 等身份源。',
    version: '3.0.1',
    author: 'Security Team',
    category: PluginCategory.AUTH,
    tags: ['SSO', 'OAuth', 'SAML', '认证'],
    dependencies: [],
    permissions: ['auth:read', 'auth:write', 'session:manage'],
    versions: [
      {
        version: '3.0.1',
        changelog: '修复 SAML 元数据解析',
        released_at: Date.now() - DAY_MS * 4,
        compatibility: ['>=47.0'],
        download_url: '/plugins/auth-sso/3.0.1.tgz',
        checksum: 'sha256:g7h8i9',
        size_kb: 210,
      },
      {
        version: '3.0.0',
        changelog: '支持 OIDC 协议',
        released_at: Date.now() - DAY_MS * 50,
        compatibility: ['>=46.0'],
        download_url: '/plugins/auth-sso/3.0.0.tgz',
        checksum: 'sha256:j0k1l2',
        size_kb: 195,
      },
    ],
    install_count: 11200,
    rating: 4.9,
    review_count: 287,
    screenshots: [],
    readme: '# SSO 单点登录\n\n企业级身份认证集成。',
    repo_url: 'https://github.com/topems/auth-sso',
    license: 'Commercial',
    price: 299,
    is_free: false,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 350,
    updated_at: Date.now() - DAY_MS * 4,
    size_kb: 210,
    icon: 'shield',
    keywords: ['sso', 'oauth', 'saml', 'auth', '单点登录', '认证'],
  },
  {
    plugin_id: 'api-mock-server',
    name: 'API Mock 服务',
    description:
      '内置 Mock 服务，支持 Swagger/OpenAPI 自动生成 Mock 数据，支持延时、状态码、动态模板。',
    version: '1.5.2',
    author: 'DevTools Team',
    category: PluginCategory.DEVTOOL,
    tags: ['Mock', 'API', 'Swagger', '开发工具'],
    dependencies: [],
    permissions: ['network:proxy'],
    versions: [
      {
        version: '1.5.2',
        changelog: '支持动态模板',
        released_at: Date.now() - DAY_MS * 8,
        compatibility: ['>=45.0'],
        download_url: '/plugins/api-mock-server/1.5.2.tgz',
        checksum: 'sha256:h8i9j0',
        size_kb: 180,
      },
      {
        version: '1.5.0',
        changelog: '支持 OpenAPI 3.1',
        released_at: Date.now() - DAY_MS * 65,
        compatibility: ['>=44.0'],
        download_url: '/plugins/api-mock-server/1.5.0.tgz',
        checksum: 'sha256:k1l2m3',
        size_kb: 165,
      },
    ],
    install_count: 5340,
    rating: 4.5,
    review_count: 98,
    screenshots: [],
    readme: '# API Mock 服务\n\n开发阶段接口模拟。',
    repo_url: 'https://github.com/topems/api-mock-server',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 200,
    updated_at: Date.now() - DAY_MS * 8,
    size_kb: 180,
    icon: 'server',
    keywords: ['mock', 'api', 'swagger', 'openapi', '模拟'],
  },
  {
    plugin_id: 'audit-trail',
    name: '审计日志',
    description: '记录用户操作行为审计日志，支持操作回放、合规审查、异常行为告警与导出。',
    version: '2.0.0',
    author: 'Compliance Team',
    category: PluginCategory.ANALYTICS,
    tags: ['审计', '合规', '日志'],
    dependencies: [
      {
        plugin_id: 'audit-trail',
        dependency_id: 'log-enhancer',
        version_range: '>=2.0.0',
        required: true,
      },
    ],
    permissions: ['audit:read', 'audit:write'],
    versions: [
      {
        version: '2.0.0',
        changelog: '支持操作回放',
        released_at: Date.now() - DAY_MS * 15,
        compatibility: ['>=46.0'],
        download_url: '/plugins/audit-trail/2.0.0.tgz',
        checksum: 'sha256:i9j0k1',
        size_kb: 240,
      },
    ],
    install_count: 3210,
    rating: 4.6,
    review_count: 67,
    screenshots: [],
    readme: '# 审计日志\n\n合规审计能力。',
    repo_url: 'https://github.com/topems/audit-trail',
    license: 'Commercial',
    price: 199,
    is_free: false,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 180,
    updated_at: Date.now() - DAY_MS * 15,
    size_kb: 240,
    icon: 'file-search',
    keywords: ['audit', 'compliance', 'trail', '审计', '合规'],
  },
  {
    plugin_id: 'i18n-pro',
    name: '国际化 Pro',
    description:
      '全功能国际化方案，支持 50+ 语言、动态切换、按需加载、机器翻译、术语库与翻译进度管理。',
    version: '3.4.0',
    author: 'Global Team',
    category: PluginCategory.UI,
    tags: ['国际化', 'i18n', '多语言', '翻译'],
    dependencies: [],
    permissions: [],
    versions: [
      {
        version: '3.4.0',
        changelog: '新增机器翻译',
        released_at: Date.now() - DAY_MS * 6,
        compatibility: ['>=46.0'],
        download_url: '/plugins/i18n-pro/3.4.0.tgz',
        checksum: 'sha256:j0k1l2',
        size_kb: 360,
      },
      {
        version: '3.3.0',
        changelog: '术语库管理',
        released_at: Date.now() - DAY_MS * 45,
        compatibility: ['>=45.0'],
        download_url: '/plugins/i18n-pro/3.3.0.tgz',
        checksum: 'sha256:l2m3n4',
        size_kb: 320,
      },
    ],
    install_count: 7890,
    rating: 4.7,
    review_count: 156,
    screenshots: [],
    readme: '# 国际化 Pro\n\n企业级多语言方案。',
    repo_url: 'https://github.com/topems/i18n-pro',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 320,
    updated_at: Date.now() - DAY_MS * 6,
    size_kb: 360,
    icon: 'languages',
    keywords: ['i18n', 'locale', 'translate', '国际化', '多语言'],
  },
  {
    plugin_id: 'workflow-automation',
    name: '工作流自动化',
    description: '可视化工作流编排，定时触发、事件触发、条件分支，集成 200+ 应用连接器。',
    version: '1.9.0',
    author: 'Automation Team',
    category: PluginCategory.AUTOMATION,
    tags: ['工作流', '自动化', '编排', '定时'],
    dependencies: [],
    permissions: ['workflow:execute', 'schedule:manage'],
    versions: [
      {
        version: '1.9.0',
        changelog: '新增 50 个连接器',
        released_at: Date.now() - DAY_MS * 9,
        compatibility: ['>=46.0'],
        download_url: '/plugins/workflow-automation/1.9.0.tgz',
        checksum: 'sha256:k1l2m3',
        size_kb: 520,
      },
    ],
    install_count: 4560,
    rating: 4.5,
    review_count: 112,
    screenshots: [],
    readme: '# 工作流自动化\n\n可视化流程编排。',
    repo_url: 'https://github.com/topems/workflow-automation',
    license: 'Commercial',
    price: 499,
    is_free: false,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 240,
    updated_at: Date.now() - DAY_MS * 9,
    size_kb: 520,
    icon: 'git-branch',
    keywords: ['workflow', 'automation', 'trigger', '工作流', '自动化'],
  },
  {
    plugin_id: 'data-sync',
    name: '数据同步引擎',
    description: '跨数据源实时同步引擎，支持 MySQL/PostgreSQL/MongoDB/ES 互转，CDC 增量同步。',
    version: '2.3.0',
    author: 'Data Team',
    category: PluginCategory.DATA,
    tags: ['数据同步', 'CDC', 'ETL'],
    dependencies: [],
    permissions: ['data:read', 'data:write'],
    versions: [
      {
        version: '2.3.0',
        changelog: '支持 CDC 增量同步',
        released_at: Date.now() - DAY_MS * 14,
        compatibility: ['>=46.0'],
        download_url: '/plugins/data-sync/2.3.0.tgz',
        checksum: 'sha256:l2m3n4',
        size_kb: 410,
      },
    ],
    install_count: 2890,
    rating: 4.4,
    review_count: 54,
    screenshots: [],
    readme: '# 数据同步引擎\n\n跨源实时数据同步。',
    repo_url: 'https://github.com/topems/data-sync',
    license: 'Commercial',
    price: 399,
    is_free: false,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 190,
    updated_at: Date.now() - DAY_MS * 14,
    size_kb: 410,
    icon: 'refresh-cw',
    keywords: ['sync', 'cdc', 'etl', '数据同步'],
  },
  {
    plugin_id: 'webhook-bridge',
    name: 'Webhook 桥接器',
    description: '统一 Webhook 管理与转发，支持签名验证、重试策略、事件过滤、日志追踪。',
    version: '1.2.0',
    author: 'Integration Team',
    category: PluginCategory.INTEGRATION,
    tags: ['Webhook', '集成', '事件'],
    dependencies: [],
    permissions: ['network:webhook'],
    versions: [
      {
        version: '1.2.0',
        changelog: '支持事件过滤',
        released_at: Date.now() - DAY_MS * 18,
        compatibility: ['>=45.0'],
        download_url: '/plugins/webhook-bridge/1.2.0.tgz',
        checksum: 'sha256:m3n4o5',
        size_kb: 150,
      },
    ],
    install_count: 3670,
    rating: 4.6,
    review_count: 82,
    screenshots: [],
    readme: '# Webhook 桥接器\n\n统一 Webhook 管理。',
    repo_url: 'https://github.com/topems/webhook-bridge',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 160,
    updated_at: Date.now() - DAY_MS * 18,
    size_kb: 150,
    icon: 'webhook',
    keywords: ['webhook', 'integration', 'event', '桥接', '集成'],
  },
  {
    plugin_id: 'starter-template-pack',
    name: '入门模板包',
    description: '15+ 开箱即用业务模板：CRM、MES、BI、审批、工单、仓储等，含完整页面与权限。',
    version: '5.0.0',
    author: 'TOPEMS Team',
    category: PluginCategory.TEMPLATE,
    tags: ['模板', 'CRM', 'MES', 'BI'],
    dependencies: [],
    permissions: [],
    versions: [
      {
        version: '5.0.0',
        changelog: '新增仓储管理模板',
        released_at: Date.now() - DAY_MS * 20,
        compatibility: ['>=47.0'],
        download_url: '/plugins/starter-template-pack/5.0.0.tgz',
        checksum: 'sha256:n4o5p6',
        size_kb: 1820,
      },
    ],
    install_count: 6780,
    rating: 4.8,
    review_count: 145,
    screenshots: [],
    readme: '# 入门模板包\n\n业务模板合集。',
    repo_url: 'https://github.com/topems/starter-template-pack',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: true,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 300,
    updated_at: Date.now() - DAY_MS * 20,
    size_kb: 1820,
    icon: 'layout-template',
    keywords: ['template', 'crm', 'mes', 'bi', '模板'],
  },
  {
    plugin_id: 'cache-manager',
    name: '缓存管理器',
    description: '统一缓存层，支持 Redis/Memory/IndexedDB 多级缓存，自动失效、预热、命中率统计。',
    version: '1.7.1',
    author: 'Infra Team',
    category: PluginCategory.SERVICE,
    tags: ['缓存', 'Redis', '性能'],
    dependencies: [],
    permissions: ['cache:read', 'cache:write'],
    versions: [
      {
        version: '1.7.1',
        changelog: '修复缓存击穿问题',
        released_at: Date.now() - DAY_MS * 1,
        compatibility: ['>=46.0'],
        download_url: '/plugins/cache-manager/1.7.1.tgz',
        checksum: 'sha256:o5p6q7',
        size_kb: 140,
      },
    ],
    install_count: 5210,
    rating: 4.7,
    review_count: 103,
    screenshots: [],
    readme: '# 缓存管理器\n\n多级缓存统一管理。',
    repo_url: 'https://github.com/topems/cache-manager',
    license: 'MIT',
    price: 0,
    is_free: true,
    is_featured: false,
    is_verified: true,
    created_at: Date.now() - DAY_MS * 170,
    updated_at: Date.now() - DAY_MS * 1,
    size_kb: 140,
    icon: 'database',
    keywords: ['cache', 'redis', 'memory', '缓存'],
  },
];

const PRESET_REVIEWS: PluginReview[] = [
  {
    review_id: 'pr1',
    plugin_id: 'log-enhancer',
    user: '张开发',
    user_id: 'u1',
    rating: 5,
    comment: '日志检索非常方便，定位问题效率提升明显。',
    created_at: Date.now() - DAY_MS * 5,
    helpful_count: 28,
    version: '2.4.1',
  },
  {
    review_id: 'pr2',
    plugin_id: 'log-enhancer',
    user: '李运维',
    user_id: 'u2',
    rating: 4,
    comment: '功能强大，希望增加日志告警能力。',
    created_at: Date.now() - DAY_MS * 12,
    helpful_count: 9,
    version: '2.3.0',
  },
  {
    review_id: 'pr3',
    plugin_id: 'perf-monitor',
    user: '王前端',
    user_id: 'u3',
    rating: 5,
    comment: '火焰图太好用了，性能瓶颈一目了然。',
    created_at: Date.now() - DAY_MS * 3,
    helpful_count: 41,
    version: '3.2.0',
  },
  {
    review_id: 'pr4',
    plugin_id: 'theme-pack-pro',
    user: '赵设计',
    user_id: 'u4',
    rating: 5,
    comment: '主题质量很高，企业蓝主题深得客户喜欢。',
    created_at: Date.now() - DAY_MS * 6,
    helpful_count: 33,
    version: '4.1.0',
  },
  {
    review_id: 'pr5',
    plugin_id: 'form-validator',
    user: '孙产品',
    user_id: 'u5',
    rating: 4,
    comment: '校验规则丰富，文档可以更详细些。',
    created_at: Date.now() - DAY_MS * 8,
    helpful_count: 12,
    version: '2.0.3',
  },
  {
    review_id: 'pr6',
    plugin_id: 'chart-extension',
    user: '周数据',
    user_id: 'u6',
    rating: 5,
    comment: '3D 图表效果惊艳，数据展示更立体。',
    created_at: Date.now() - DAY_MS * 4,
    helpful_count: 26,
    version: '1.8.0',
  },
  {
    review_id: 'pr7',
    plugin_id: 'auth-sso',
    user: '吴安全',
    user_id: 'u7',
    rating: 5,
    comment: 'SSO 集成非常顺滑，企业微信对接零问题。',
    created_at: Date.now() - DAY_MS * 2,
    helpful_count: 19,
    version: '3.0.1',
  },
  {
    review_id: 'pr8',
    plugin_id: 'export-toolkit',
    user: '郑运营',
    user_id: 'u8',
    rating: 4,
    comment: '导出 Excel 很方便，PDF 样式还能再优化。',
    created_at: Date.now() - DAY_MS * 11,
    helpful_count: 15,
    version: '2.2.0',
  },
  {
    review_id: 'pr9',
    plugin_id: 'i18n-pro',
    user: '陈国际',
    user_id: 'u9',
    rating: 5,
    comment: '机器翻译节省了大量翻译成本。',
    created_at: Date.now() - DAY_MS * 7,
    helpful_count: 22,
    version: '3.4.0',
  },
  {
    review_id: 'pr10',
    plugin_id: 'workflow-automation',
    user: '黄流程',
    user_id: 'u10',
    rating: 4,
    comment: '流程编排灵活，连接器数量再多点就更好了。',
    created_at: Date.now() - DAY_MS * 9,
    helpful_count: 18,
    version: '1.9.0',
  },
];

type PluginMarketChangeListener = (plugins: Plugin[]) => void;

export class PluginMarket {
  private plugins: Map<string, Plugin> = new Map();
  private installations: Map<string, PluginInstallation> = new Map();
  private reviews: Map<string, PluginReview[]> = new Map();
  private listeners: Set<PluginMarketChangeListener> = new Set();

  constructor() {
    this.initPresetData();
  }

  private initPresetData(): void {
    PRESET_PLUGINS.forEach((plugin) => {
      this.plugins.set(plugin.plugin_id, { ...plugin });
    });
    PRESET_REVIEWS.forEach((review) => {
      if (!this.reviews.has(review.plugin_id)) {
        this.reviews.set(review.plugin_id, []);
      }
      this.reviews.get(review.plugin_id)!.push(review);
    });
  }

  // ==================== 搜索与发现 ====================

  searchPlugins(options?: {
    keyword?: string;
    category?: PluginCategory;
    tags?: string[];
    sort?: PluginSortType;
    free_only?: boolean;
    featured_only?: boolean;
    verified_only?: boolean;
  }): Plugin[] {
    let result = Array.from(this.plugins.values());

    if (options?.category) {
      result = result.filter((p) => p.category === options.category);
    }

    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.tags.some((t) => t.toLowerCase().includes(kw)) ||
          p.keywords.some((k) => k.toLowerCase().includes(kw))
      );
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter((p) => options.tags!.some((t) => p.tags.includes(t)));
    }

    if (options?.free_only) {
      result = result.filter((p) => p.is_free);
    }

    if (options?.featured_only) {
      result = result.filter((p) => p.is_featured);
    }

    if (options?.verified_only) {
      result = result.filter((p) => p.is_verified);
    }

    if (options?.sort) {
      switch (options.sort) {
        case 'popular':
          result.sort((a, b) => b.install_count - a.install_count);
          break;
        case 'newest':
          result.sort((a, b) => b.updated_at - a.updated_at);
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'downloads':
          result.sort((a, b) => b.install_count - a.install_count);
          break;
        case 'name':
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    return result;
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getPluginVersions(pluginId: string): PluginVersion[] {
    return this.plugins.get(pluginId)?.versions || [];
  }

  listCategories(): { category: PluginCategory; count: number }[] {
    return Object.values(PluginCategory).map((category) => ({
      category,
      count: this.searchPlugins({ category }).length,
    }));
  }

  getRecommendations(limit: number = 6): Plugin[] {
    const notInstalled = Array.from(this.plugins.values()).filter(
      (p) => !this.installations.has(p.plugin_id)
    );
    notInstalled.sort((a, b) => b.rating * b.install_count - a.rating * a.install_count);
    return notInstalled.slice(0, limit);
  }

  getFeaturedPlugins(): Plugin[] {
    return this.searchPlugins({ featured_only: true, sort: 'rating' });
  }

  // ==================== 安装与卸载 ====================

  installPlugin(request: PluginInstallRequest): PluginInstallation | null {
    const plugin = this.plugins.get(request.plugin_id);
    if (!plugin) return null;

    const version = request.version || plugin.version;
    const versionExists = plugin.versions.some((v) => v.version === version);
    if (!versionExists) return null;

    // 检查权限授权
    const ungranted = plugin.permissions.filter((p) => !request.permissions_granted.includes(p));
    if (ungranted.length > 0) return null;

    const installationId = `inst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const installation: PluginInstallation = {
      installation_id: installationId,
      plugin_id: request.plugin_id,
      version,
      installed_at: Date.now(),
      status: 'installing',
      config: request.config || {},
      enabled: true,
    };

    this.installations.set(request.plugin_id, installation);
    plugin.install_count++;

    // 模拟异步安装完成
    setTimeout(() => {
      const current = this.installations.get(request.plugin_id);
      if (current && current.status === 'installing') {
        current.status = 'installed';
        this.notifyListeners();
      }
    }, 200);

    this.notifyListeners();
    return installation;
  }

  uninstallPlugin(pluginId: string): boolean {
    const installation = this.installations.get(pluginId);
    if (!installation) return false;

    installation.status = 'uninstalled';
    this.installations.delete(pluginId);
    this.notifyListeners();
    return true;
  }

  updatePlugin(pluginId: string, targetVersion: string): PluginInstallation | null {
    const plugin = this.plugins.get(pluginId);
    const installation = this.installations.get(pluginId);
    if (!plugin || !installation) return null;

    const versionExists = plugin.versions.some((v) => v.version === targetVersion);
    if (!versionExists) return null;

    installation.version = targetVersion;
    installation.installed_at = Date.now();
    installation.status = 'installed';
    this.notifyListeners();
    return installation;
  }

  enablePlugin(pluginId: string): boolean {
    const installation = this.installations.get(pluginId);
    if (!installation) return false;
    installation.enabled = true;
    this.notifyListeners();
    return true;
  }

  disablePlugin(pluginId: string): boolean {
    const installation = this.installations.get(pluginId);
    if (!installation) return false;
    installation.enabled = false;
    this.notifyListeners();
    return true;
  }

  listInstalled(): PluginInstallation[] {
    return Array.from(this.installations.values()).filter(
      (i) => i.status === 'installed' || i.status === 'installing'
    );
  }

  getInstallation(pluginId: string): PluginInstallation | undefined {
    return this.installations.get(pluginId);
  }

  // ==================== 依赖解析 ====================

  checkDependencies(pluginId: string): DependencyCheckResult {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return { plugin_id: pluginId, satisfied: false, missing: [], conflicts: [] };
    }

    const missing: PluginDependency[] = [];
    const conflicts: DependencyConflict[] = [];

    plugin.dependencies.forEach((dep) => {
      if (!dep.required) return;
      const installed = this.installations.get(dep.dependency_id);
      if (!installed) {
        missing.push(dep);
        return;
      }
      if (!this.satisfiesVersion(installed.version, dep.version_range)) {
        conflicts.push({
          dependency_id: dep.dependency_id,
          required_version: dep.version_range,
          installed_version: installed.version,
          conflict_type: 'version-mismatch',
        });
      }
    });

    // 循环依赖检测
    const visited = new Set<string>();
    if (this.hasCircularDependency(pluginId, visited)) {
      conflicts.push({
        dependency_id: pluginId,
        required_version: '*',
        installed_version: '*',
        conflict_type: 'circular',
      });
    }

    return {
      plugin_id: pluginId,
      satisfied: missing.length === 0 && conflicts.length === 0,
      missing,
      conflicts,
    };
  }

  resolveConflicts(pluginId: string): DependencyConflict[] {
    return this.checkDependencies(pluginId).conflicts;
  }

  private satisfiesVersion(version: string, range: string): boolean {
    const match = range.match(/^(>=|<=|>|<|=|\^|~)?(\d+\.\d+\.\d+)/);
    if (!match) return true;
    const operator = match[1] || '=';
    const required = match[2].split('.').map(Number);
    const actual = version.split('.').map(Number);
    const cmp = this.compareSemverParts(actual, required);

    switch (operator) {
      case '>=':
        return cmp >= 0;
      case '>':
        return cmp > 0;
      case '<=':
        return cmp <= 0;
      case '<':
        return cmp < 0;
      case '=':
        return cmp === 0;
      case '^':
        return actual[0] === required[0] && cmp >= 0;
      case '~':
        return actual[0] === required[0] && actual[1] === required[1] && cmp >= 0;
      default:
        return true;
    }
  }

  private compareSemverParts(a: number[], b: number[]): number {
    for (let i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  private hasCircularDependency(
    pluginId: string,
    visited: Set<string>,
    path: Set<string> = new Set()
  ): boolean {
    if (path.has(pluginId)) return true;
    if (visited.has(pluginId)) return false;

    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    path.add(pluginId);
    for (const dep of plugin.dependencies) {
      if (this.hasCircularDependency(dep.dependency_id, visited, path)) return true;
    }
    path.delete(pluginId);
    visited.add(pluginId);
    return false;
  }

  // ==================== 评分与评价 ====================

  submitReview(
    pluginId: string,
    review: Omit<PluginReview, 'review_id' | 'plugin_id' | 'created_at' | 'helpful_count'>
  ): PluginReview | null {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || review.rating < 1 || review.rating > 5) return null;

    const newReview: PluginReview = {
      review_id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      plugin_id: pluginId,
      ...review,
      created_at: Date.now(),
      helpful_count: 0,
    };

    if (!this.reviews.has(pluginId)) {
      this.reviews.set(pluginId, []);
    }
    this.reviews.get(pluginId)!.unshift(newReview);

    const total = plugin.rating * plugin.review_count;
    plugin.review_count++;
    plugin.rating = Math.round(((total + review.rating) / plugin.review_count) * 10) / 10;

    this.notifyListeners();
    return newReview;
  }

  getPluginReviews(pluginId: string): PluginReview[] {
    return this.reviews.get(pluginId) || [];
  }

  markReviewHelpful(reviewId: string): boolean {
    for (const reviewList of this.reviews.values()) {
      const review = reviewList.find((r) => r.review_id === reviewId);
      if (review) {
        review.helpful_count++;
        return true;
      }
    }
    return false;
  }

  // ==================== 统计与订阅 ====================

  getPluginStats(): PluginStats {
    const all = Array.from(this.plugins.values());
    const byCategory = {} as Record<PluginCategory, number>;
    Object.values(PluginCategory).forEach((cat) => {
      byCategory[cat] = all.filter((p) => p.category === cat).length;
    });

    const totalRating = all.reduce((sum, p) => sum + p.rating, 0);
    const totalReviews = all.reduce((sum, p) => sum + p.review_count, 0);
    const totalInstalls = all.reduce((sum, p) => sum + p.install_count, 0);

    return {
      total_plugins: all.length,
      installed_plugins: this.installations.size,
      total_installs: totalInstalls,
      total_reviews: totalReviews,
      average_rating: all.length > 0 ? Math.round((totalRating / all.length) * 10) / 10 : 0,
      featured_count: all.filter((p) => p.is_featured).length,
      by_category: byCategory,
    };
  }

  subscribe(listener: PluginMarketChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const plugins = this.searchPlugins({ sort: 'popular' });
    this.listeners.forEach((cb) => {
      try {
        cb(plugins);
      } catch {
        // ignore
      }
    });
  }
}

export const pluginMarket = new PluginMarket();
export default pluginMarket;
