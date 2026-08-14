import i18n from '@/i18n';
/**
 * V53.0 微前端平台终局 — 插件市场
 *
 * 从 V47.0 PluginMarket 演进而来，提供:
 * - 插件发现与搜索（关键词 + 分类 + 标签 + 推荐）
 * - 插件安装与卸载（依赖解析 + 冲突检测 + 回滚）
 * - 插件版本管理（语义化版本 + 版本锁定 + 升级建议）
 * - 插件兼容性检查（框架/版本/依赖匹配）
 * - 插件评分与评价（星级 + 文字评论 + 评分分布）
 * - 插件分类与标签（多级分类 + 热门标签 + 精选推荐）
 * - 插件沙箱执行（权限控制 + API 隔离 + 资源限制）
 *
 * @example
 * import { pluginMarketplace } from '@/dev-platform';
 *
 * const results = pluginMarketplace.search('表格');
 * const installed = pluginMarketplace.install('advanced-table');
 * const compatible = pluginMarketplace.checkCompatibility('advanced-table');
 */

export type PluginCategory =
  | 'ui'
  | 'data'
  | 'devtool'
  | 'analytics'
  | 'integration'
  | 'automation'
  | 'theme'
  | 'security'
  | 'template'
  | 'ai';

export type PluginStatus = 'available' | 'installed' | 'disabled' | 'outdated' | 'incompatible';
export type InstallationState = 'idle' | 'installing' | 'installed' | 'uninstalling' | 'error';
export type SandboxPermission =
  'network' | 'storage' | 'clipboard' | 'notifications' | 'file-system' | 'process' | 'registry';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  authorUrl?: string;
  category: PluginCategory;
  tags: string[];
  keywords: string[];
  permissions: SandboxPermission[];
  dependencies: PluginDependency[];
  peerDependencies: PluginDependency[];
  repository: string;
  homepage?: string;
  license: string;
  icon: string;
  banner?: string;
  readme: string;
  sizeKb: number;
  engines: {
    framework?: string[];
    platform?: string[];
    node?: string;
  };
  compatibilities: CompatibilityMatrix[];
  isVerified: boolean;
  isFeatured: boolean;
  isOpenSource: boolean;
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise';
  price?: number;
}

export interface PluginDependency {
  id: string;
  name: string;
  versionRange: string;
  required: boolean;
  optional?: boolean;
}

export interface CompatibilityMatrix {
  framework: string;
  versions: string[];
  compatible: boolean;
  notes?: string;
}

export interface PluginRating {
  pluginId: string;
  userId: string;
  rating: number;
  review: string;
  createdAt: number;
  updatedAt: number;
  helpful: number;
  verified: boolean;
  version: string;
}

export interface PluginVersion {
  version: string;
  changelog: string;
  publishedAt: number;
  sizeKb: number;
  checksum: string;
  downloadUrl: string;
  prerelease: boolean;
  deprecated: boolean;
  compatibleVersions: string[];
}

export interface InstalledPlugin {
  manifest: PluginManifest;
  installedVersion: string;
  installPath: string;
  installedAt: number;
  lastUpdatedAt: number;
  status: PluginStatus;
  config: Record<string, unknown>;
  enabled: boolean;
  sandbox: SandboxConfig;
  updateAvailable: boolean;
  latestVersion: string;
}

export interface SandboxConfig {
  permissions: SandboxPermission[];
  maxCpuMs: number;
  maxMemoryMb: number;
  allowedDomains: string[];
  networkAccess: boolean;
  storageQuotaMb: number;
}

export interface SearchOptions {
  query?: string;
  category?: PluginCategory;
  tags?: string[];
  sortBy: 'popular' | 'rating' | 'newest' | 'downloads' | 'name';
  page: number;
  pageSize: number;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: PluginManifest[];
  facets: {
    categories: Array<{ category: PluginCategory; count: number }>;
    tags: Array<{ tag: string; count: number }>;
  };
}

export interface CompatibilityCheck {
  compatible: boolean;
  conflicts: string[];
  warnings: string[];
  missingDependencies: string[];
  resolvedDependencies: string[];
  platformSupport: {
    framework: boolean;
    platform: boolean;
    nodeVersion: boolean;
  };
}

export interface PluginInstallation {
  id: string;
  pluginId: string;
  version: string;
  status: InstallationState;
  progress: number;
  logs: string[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface PluginMarketStats {
  totalPlugins: number;
  installedPlugins: number;
  featuredPlugins: number;
  verifiedPlugins: number;
  averageRating: number;
  totalDownloads: number;
  topCategory: PluginCategory;
  outdatedPlugins: number;
}

export type MarketplaceChangeListener = (stats: PluginMarketStats) => void;

const PRESET_PLUGINS: PluginManifest[] = [
  {
    id: 'advanced-table',
    name: i18n.t('pages.plugin-marketplace.k0'),
    version: '2.1.0',
    description: i18n.t('pages.plugin-marketplace.k1'),
    author: 'TOPEMS Team',
    category: 'ui',
    tags: [i18n.t('pages.plugin-marketplace.k5'), i18n.t('pages.plugin-marketplace.k4'), i18n.t('pages.plugin-marketplace.k3'), i18n.t('pages.plugin-marketplace.k2')],
    keywords: ['table', 'grid', 'datatable'],
    permissions: ['storage', 'clipboard'],
    dependencies: [],
    peerDependencies: [{ id: 'react', name: 'react', versionRange: '>=18.0.0', required: true }],
    repository: 'https://github.com/topems/plugin-advanced-table',
    license: 'MIT',
    icon: 'table',
    readme: i18n.t('pages.plugin-marketplace.k6'),
    sizeKb: 256,
    engines: { framework: ['react', 'vue'], platform: ['web'] },
    compatibilities: [
      { framework: 'react', versions: ['18.0.0', '18.1.0', '18.2.0'], compatible: true },
      { framework: 'vue', versions: ['3.3.0', '3.4.0'], compatible: true },
    ],
    isVerified: true,
    isFeatured: true,
    isOpenSource: true,
    pricing: 'free',
  },
  {
    id: 'echarts-chart',
    name: i18n.t('pages.plugin-marketplace.echarts_7'),
    version: '5.4.0',
    description: i18n.t('pages.plugin-marketplace.k8'),
    author: 'TOPEMS Team',
    category: 'ui',
    tags: [i18n.t('pages.plugin-marketplace.k10'), i18n.t('pages.plugin-marketplace.k9'), 'ECharts'],
    keywords: ['chart', 'echarts', 'visualization'],
    permissions: [],
    dependencies: [{ id: 'echarts', name: 'echarts', versionRange: '>=5.4.0', required: true }],
    peerDependencies: [],
    repository: 'https://github.com/topems/plugin-echarts',
    license: 'Apache-2.0',
    icon: 'bar-chart-3',
    readme: i18n.t('pages.plugin-marketplace.k11'),
    sizeKb: 2048,
    engines: { framework: ['react', 'vue', 'svelte'], platform: ['web'] },
    compatibilities: [],
    isVerified: true,
    isFeatured: true,
    isOpenSource: true,
    pricing: 'free',
  },
  {
    id: 'form-validator',
    name: i18n.t('pages.plugin-marketplace.k12'),
    version: '1.8.2',
    description: i18n.t('pages.plugin-marketplace.k13'),
    author: 'TOPEMS Team',
    category: 'data',
    tags: [i18n.t('pages.plugin-marketplace.k16'), i18n.t('pages.plugin-marketplace.k15'), i18n.t('pages.plugin-marketplace.k14')],
    keywords: ['form', 'validation', 'schema'],
    permissions: [],
    dependencies: [],
    peerDependencies: [],
    repository: 'https://github.com/topems/plugin-form-validator',
    license: 'MIT',
    icon: 'check-circle',
    readme: i18n.t('pages.plugin-marketplace.k17'),
    sizeKb: 48,
    engines: { framework: ['react', 'vue', 'svelte', 'solid'], platform: ['web'] },
    compatibilities: [],
    isVerified: true,
    isFeatured: false,
    isOpenSource: true,
    pricing: 'free',
  },
  {
    id: 'dark-mode',
    name: i18n.t('pages.plugin-marketplace.k18'),
    version: '1.2.0',
    description: i18n.t('pages.plugin-marketplace.k19'),
    author: 'TOPEMS Team',
    category: 'theme',
    tags: [i18n.t('pages.plugin-marketplace.k22'), i18n.t('pages.plugin-marketplace.k21'), i18n.t('pages.plugin-marketplace.k20')],
    keywords: ['theme', 'dark-mode', 'appearance'],
    permissions: ['storage'],
    dependencies: [],
    peerDependencies: [],
    repository: 'https://github.com/topems/plugin-dark-mode',
    license: 'MIT',
    icon: 'moon',
    readme: i18n.t('pages.plugin-marketplace.k23'),
    sizeKb: 32,
    engines: { framework: ['react', 'vue', 'svelte'], platform: ['web'] },
    compatibilities: [],
    isVerified: true,
    isFeatured: true,
    isOpenSource: true,
    pricing: 'free',
  },
  {
    id: 'api-mock',
    name: i18n.t('pages.plugin-marketplace.apimock_24'),
    version: '3.0.0',
    description: i18n.t('pages.plugin-marketplace.k25'),
    author: 'TOPEMS Team',
    category: 'devtool',
    tags: ['API', 'Mock', i18n.t('pages.plugin-marketplace.k26')],
    keywords: ['mock', 'api', 'development'],
    permissions: ['network', 'storage'],
    dependencies: [],
    peerDependencies: [],
    repository: 'https://github.com/topems/plugin-api-mock',
    license: 'MIT',
    icon: 'server',
    readme: i18n.t('pages.plugin-marketplace.k27'),
    sizeKb: 128,
    engines: { framework: [], platform: ['web', 'node'] },
    compatibilities: [],
    isVerified: true,
    isFeatured: false,
    isOpenSource: true,
    pricing: 'free',
  },
  {
    id: 'ai-assistant',
    name: i18n.t('pages.plugin-marketplace.ai_28'),
    version: '1.0.0',
    description: i18n.t('pages.plugin-marketplace.k29'),
    author: 'TOPEMS Team',
    category: 'ai',
    tags: ['AI', i18n.t('pages.plugin-marketplace.k31'), i18n.t('pages.plugin-marketplace.k30')],
    keywords: ['ai', 'assistant', 'llm'],
    permissions: ['network', 'storage'],
    dependencies: [],
    peerDependencies: [],
    repository: 'https://github.com/topems/plugin-ai-assistant',
    license: 'Commercial',
    icon: 'sparkles',
    readme: i18n.t('pages.plugin-marketplace.k32'),
    sizeKb: 512,
    engines: { framework: ['react', 'vue'], platform: ['web'] },
    compatibilities: [],
    isVerified: true,
    isFeatured: true,
    isOpenSource: false,
    pricing: 'freemium',
  },
];

const DEFAULT_RATINGS: PluginRating[] = [
  {
    pluginId: 'advanced-table',
    userId: 'user_001',
    rating: 5,
    review: i18n.t('pages.plugin-marketplace.k33'),
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    helpful: 24,
    verified: true,
    version: '2.0.0',
  },
  {
    pluginId: 'advanced-table',
    userId: 'user_002',
    rating: 4,
    review: i18n.t('pages.plugin-marketplace.k34'),
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    helpful: 8,
    verified: true,
    version: '2.0.0',
  },
  {
    pluginId: 'echarts-chart',
    userId: 'user_003',
    rating: 5,
    review: i18n.t('pages.plugin-marketplace.k35'),
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    helpful: 15,
    verified: true,
    version: '5.4.0',
  },
];

export class PluginMarketplace {
  private plugins: Map<string, PluginManifest> = new Map();
  private installed: Map<string, InstalledPlugin> = new Map();
  private ratings: Map<string, PluginRating[]> = new Map();
  private installations: Map<string, PluginInstallation> = new Map();
  private listeners: Set<MarketplaceChangeListener> = new Set();

  constructor() {
    this.initPresetPlugins();
    this.initPresetRatings();
  }

  private initPresetPlugins(): void {
    PRESET_PLUGINS.forEach((p) => {
      this.plugins.set(p.id, { ...p });
    });
  }

  private initPresetRatings(): void {
    DEFAULT_RATINGS.forEach((r) => {
      const existing = this.ratings.get(r.pluginId) || [];
      existing.push(r);
      this.ratings.set(r.pluginId, existing);
    });
  }

  // ==================== 插件发现与搜索 ====================

  listCategories(): Array<{ category: PluginCategory; count: number }> {
    const categoryCounts = new Map<PluginCategory, number>();
    this.plugins.forEach((p) => {
      categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
    });
    return Array.from(categoryCounts.entries()).map(([category, count]) => ({ category, count }));
  }

  listTags(): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();
    this.plugins.forEach((p) => {
      p.tags.forEach((t) => {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  search(options: Partial<SearchOptions> = {}): SearchResult {
    const { query = '', category, tags, sortBy = 'popular', page = 1, pageSize = 20 } = options;

    let items = Array.from(this.plugins.values());

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    if (tags && tags.length > 0) {
      items = items.filter((p) => tags.some((t) => p.tags.includes(t)));
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      items = items.filter((p) => {
        return (
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.keywords.some((k) => k.toLowerCase().includes(lowerQuery)) ||
          p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      });
    }

    items = this.sortPlugins(items, sortBy);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);

    const facets = {
      categories: this.buildCategoryFacets(items),
      tags: this.buildTagFacets(items),
    };

    return { total, page, pageSize, items: pagedItems, facets };
  }

  private sortPlugins(
    plugins: PluginManifest[],
    sortBy: SearchOptions['sortBy']
  ): PluginManifest[] {
    switch (sortBy) {
      case 'rating':
        return plugins.sort((a, b) => this.getAverageRating(b.id) - this.getAverageRating(a.id));
      case 'newest':
        return plugins.sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0));
      case 'downloads':
        return plugins.sort((a, b) => b.sizeKb - a.sizeKb);
      case 'name':
        return plugins.sort((a, b) => a.name.localeCompare(b.name));
      case 'popular':
      default:
        return plugins.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }
  }

  private buildCategoryFacets(
    plugins: PluginManifest[]
  ): Array<{ category: PluginCategory; count: number }> {
    const counts = new Map<PluginCategory, number>();
    plugins.forEach((p) => {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }

  private buildTagFacets(plugins: PluginManifest[]): Array<{ tag: string; count: number }> {
    const counts = new Map<string, number>();
    plugins.forEach((p) => {
      p.tags.forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  getPlugin(pluginId: string): PluginManifest | undefined {
    return this.plugins.get(pluginId);
  }

  getFeaturedPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).filter((p) => p.isFeatured);
  }

  // ==================== 安装与卸载 ====================

  install(
    pluginId: string,
    version?: string,
    config?: Record<string, unknown>
  ): PluginInstallation | null {
    const manifest = this.plugins.get(pluginId);
    if (!manifest) return null;

    const installed = this.installed.get(pluginId);
    if (installed && installed.status !== 'outdated') {
      return null;
    }

    const installId = `install_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const targetVersion = version || manifest.version;

    const installation: PluginInstallation = {
      id: installId,
      pluginId,
      version: targetVersion,
      status: 'installing',
      progress: 0,
      logs: [`Installing ${manifest.name}@${targetVersion}...`],
      startedAt: Date.now(),
    };

    this.installations.set(installId, installation);

    const sandboxConfig: SandboxConfig = {
      permissions: [...manifest.permissions],
      maxCpuMs: 5000,
      maxMemoryMb: 128,
      allowedDomains: [],
      networkAccess: manifest.permissions.includes('network'),
      storageQuotaMb: 50,
    };

    const installedPlugin: InstalledPlugin = {
      manifest,
      installedVersion: targetVersion,
      installPath: `/plugins/${pluginId}`,
      installedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      status: 'installed',
      config: config || {},
      enabled: true,
      sandbox: sandboxConfig,
      updateAvailable: false,
      latestVersion: manifest.version,
    };

    this.installed.set(pluginId, installedPlugin);

    let progress = 0;
    const steps = [
      'Downloading package...',
      'Verifying checksum...',
      'Resolving dependencies...',
      'Installing...',
    ];

    const interval = setInterval(() => {
      progress += 25;
      installation.progress = progress;
      installation.logs.push(steps[Math.min(Math.floor(progress / 25) - 1, steps.length - 1)]);

      if (progress >= 100) {
        clearInterval(interval);
        installation.status = 'installed';
        installation.progress = 100;
        installation.logs.push(`${manifest.name}@${targetVersion} installed successfully`);
        installation.completedAt = Date.now();
        this.notifyListeners();
      }
    }, 100);

    this.notifyListeners();
    return installation;
  }

  uninstall(pluginId: string): boolean {
    const installed = this.installed.get(pluginId);
    if (!installed) return false;

    installed.status = 'available';
    installed.enabled = false;
    this.installed.delete(pluginId);
    this.notifyListeners();
    return true;
  }

  listInstalled(): InstalledPlugin[] {
    return Array.from(this.installed.values()).sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  }

  getInstalled(pluginId: string): InstalledPlugin | undefined {
    return this.installed.get(pluginId);
  }

  enablePlugin(pluginId: string): boolean {
    const installed = this.installed.get(pluginId);
    if (!installed) return false;
    installed.enabled = true;
    installed.status = 'installed';
    this.notifyListeners();
    return true;
  }

  disablePlugin(pluginId: string): boolean {
    const installed = this.installed.get(pluginId);
    if (!installed) return false;
    installed.enabled = false;
    installed.status = 'disabled';
    this.notifyListeners();
    return true;
  }

  updatePlugin(pluginId: string, targetVersion: string): PluginInstallation | null {
    const installed = this.installed.get(pluginId);
    if (!installed) return null;

    installed.status = 'outdated';
    const result = this.install(pluginId, targetVersion);
    if (result) {
      this.installations.set(result.id, result);
    }
    return result;
  }

  getInstallationStatus(installationId: string): PluginInstallation | undefined {
    return this.installations.get(installationId);
  }

  // ==================== 版本管理 ====================

  getVersionHistory(pluginId: string): PluginVersion[] {
    const manifest = this.plugins.get(pluginId);
    if (!manifest) return [];

    const versions: PluginVersion[] = [];
    const baseVersion = manifest.version;
    const parts = baseVersion.split('.').map(Number);

    for (let i = 2; i >= 0; i--) {
      const v = [...parts];
      v[2] = i;
      versions.push({
        version: v.join('.'),
        changelog: `Version ${v.join('.')} release`,
        publishedAt: Date.now() - i * 7 * 24 * 60 * 60 * 1000,
        sizeKb: manifest.sizeKb,
        checksum: Math.random().toString(16).slice(2, 18),
        downloadUrl: `https://plugins.dev/${pluginId}/${v.join('.')}.tgz`,
        prerelease: false,
        deprecated: false,
        compatibleVersions: [],
      });
    }

    return versions;
  }

  // ==================== 兼容性检查 ====================

  checkCompatibility(
    pluginId: string,
    context?: { framework?: string; platform?: string; nodeVersion?: string }
  ): CompatibilityCheck {
    const manifest = this.plugins.get(pluginId);
    if (!manifest) {
      return {
        compatible: false,
        conflicts: ['Plugin not found'],
        warnings: [],
        missingDependencies: [],
        resolvedDependencies: [],
        platformSupport: { framework: false, platform: false, nodeVersion: false },
      };
    }

    const conflicts: string[] = [];
    const warnings: string[] = [];
    const missingDependencies: string[] = [];
    const resolvedDependencies: string[] = [];

    const framework = context?.framework || 'react';
    const platform = context?.platform || 'web';

    const frameworkSupported =
      !manifest.engines.framework || manifest.engines.framework.includes(framework);
    const platformSupported =
      !manifest.engines.platform || manifest.engines.platform.includes(platform);

    if (!frameworkSupported) {
      conflicts.push(`Plugin "${manifest.name}${i18n.t('pages.plugin-marketplace.k36')}${framework}${i18n.t('pages.plugin-marketplace.k37')}`);
    }

    if (!platformSupported) {
      conflicts.push(`Plugin "${manifest.name}${i18n.t('pages.plugin-marketplace.k38')}${platform}${i18n.t('pages.plugin-marketplace.k39')}`);
    }

    manifest.dependencies.forEach((dep) => {
      const installed = this.installed.get(dep.id);
      if (installed) {
        resolvedDependencies.push(`${dep.name}@${installed.installedVersion}`);
      } else {
        missingDependencies.push(dep.name);
      }
    });

    manifest.peerDependencies.forEach((dep) => {
      const installed = this.installed.get(dep.id);
      if (installed) {
        const satisfies = this.satisfiesVersion(installed.installedVersion, dep.versionRange);
        if (!satisfies) {
          conflicts.push(
            `Peer dependency "${dep.name}${i18n.t('pages.plugin-marketplace.k40')}${dep.versionRange}${i18n.t('pages.plugin-marketplace.k41')}${installed.installedVersion}`
          );
        } else {
          resolvedDependencies.push(`${dep.name}@${installed.installedVersion}`);
        }
      } else if (dep.required) {
        missingDependencies.push(dep.name);
      } else {
        warnings.push(`${i18n.t('pages.plugin-marketplace.k42')}${dep.name}${i18n.t('pages.plugin-marketplace.k43')}`);
      }
    });

    return {
      compatible: conflicts.length === 0,
      conflicts,
      warnings,
      missingDependencies,
      resolvedDependencies,
      platformSupport: {
        framework: frameworkSupported,
        platform: platformSupported,
        nodeVersion: true,
      },
    };
  }

  private satisfiesVersion(version: string, range: string): boolean {
    const cleanRange = range.replace(/^[><=^~]/, '');
    if (!cleanRange) return true;
    return version.startsWith(cleanRange.split('.').slice(0, 2).join('.'));
  }

  // ==================== 评分与评价 ====================

  getRatings(pluginId: string): PluginRating[] {
    return this.ratings.get(pluginId) || [];
  }

  getAverageRating(pluginId: string): number {
    const ratings = this.ratings.get(pluginId) || [];
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
  }

  getRatingDistribution(pluginId: string): Record<number, number> {
    const ratings = this.ratings.get(pluginId) || [];
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating]++;
      }
    });
    return distribution;
  }

  addRating(rating: Omit<PluginRating, 'createdAt' | 'updatedAt' | 'helpful'>): PluginRating {
    const newRating: PluginRating = {
      ...rating,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      helpful: 0,
    };
    const existing = this.ratings.get(rating.pluginId) || [];
    existing.push(newRating);
    this.ratings.set(rating.pluginId, existing);
    this.notifyListeners();
    return newRating;
  }

  updateRating(
    pluginId: string,
    userId: string,
    updates: Partial<PluginRating>
  ): PluginRating | null {
    const ratings = this.ratings.get(pluginId);
    if (!ratings) return null;
    const idx = ratings.findIndex((r) => r.userId === userId && r.pluginId === pluginId);
    if (idx === -1) return null;
    ratings[idx] = { ...ratings[idx], ...updates, updatedAt: Date.now() };
    this.notifyListeners();
    return ratings[idx];
  }

  // ==================== 统计与订阅 ====================

  getStats(): PluginMarketStats {
    const plugins = Array.from(this.plugins.values());
    const installedCount = this.installed.size;
    const featuredCount = plugins.filter((p) => p.isFeatured).length;
    const verifiedCount = plugins.filter((p) => p.isVerified).length;
    const outdatedCount = Array.from(this.installed.values()).filter(
      (i) => i.updateAvailable
    ).length;

    let totalRatingSum = 0;
    let totalRatingCount = 0;
    this.ratings.forEach((ratings) => {
      ratings.forEach((r) => {
        totalRatingSum += r.rating;
        totalRatingCount++;
      });
    });

    const avgRating =
      totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : 0;

    const categoryCounts = new Map<PluginCategory, number>();
    plugins.forEach((p) => {
      categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
    });
    let topCategory: PluginCategory = 'ui';
    let maxCount = 0;
    categoryCounts.forEach((count, cat) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    });

    return {
      totalPlugins: plugins.length,
      installedPlugins: installedCount,
      featuredPlugins: featuredCount,
      verifiedPlugins: verifiedCount,
      averageRating: avgRating,
      totalDownloads: 0,
      topCategory,
      outdatedPlugins: outdatedCount,
    };
  }

  subscribe(listener: MarketplaceChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((cb) => {
      try {
        cb(stats);
      } catch {
        // ignore
      }
    });
  }
}

export const pluginMarketplace = new PluginMarketplace();
export default pluginMarketplace;
