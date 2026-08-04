export interface MarketplaceModule {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  versions: string[];
  rating: number;
  review_count: number;
  download_count: number;
  installed: boolean;
  installed_version?: string;
  screenshots: string[];
  features: string[];
  dependencies: ModuleDependencyRef[];
  size_kb: number;
  published_at: number;
  updated_at: number;
  license: string;
  documentation_url: string;
  icon: string;
}

export interface ModuleDependencyRef {
  module_id: string;
  required_version: string;
  is_optional: boolean;
}

export interface ModuleReview {
  id: string;
  module_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: number;
  helpful_count: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  module_count: number;
}

export type ModuleSortType = 'popular' | 'newest' | 'rating' | 'downloads';

const PRESET_CATEGORIES: Category[] = [
  {
    id: 'business',
    name: '业务组件',
    description: '常用业务场景组件',
    icon: 'briefcase',
    module_count: 0,
  },
  {
    id: 'dashboard',
    name: '仪表盘',
    description: '数据可视化仪表盘',
    icon: 'gauge',
    module_count: 0,
  },
  { id: 'tools', name: '工具集', description: '开发效率工具', icon: 'wrench', module_count: 0 },
  { id: 'integration', name: '集成', description: '第三方系统集成', icon: 'plug', module_count: 0 },
  { id: 'theme', name: '主题', description: 'UI 主题与样式', icon: 'palette', module_count: 0 },
];

const PRESET_MODULES: MarketplaceModule[] = [
  {
    id: 'crm-module',
    name: 'CRM 客户管理',
    description: '完整的客户关系管理模块，包含客户档案、跟进记录、商机管理、合同管理等功能。',
    category: 'business',
    tags: ['CRM', '客户管理', '销售', '商机'],
    author: 'TOPEMS Team',
    version: '2.3.1',
    versions: ['2.3.1', '2.2.0', '2.1.5', '2.0.0'],
    rating: 4.8,
    review_count: 156,
    download_count: 3240,
    installed: false,
    screenshots: [],
    features: ['客户档案管理', '跟进记录', '商机漏斗', '合同管理', '数据报表'],
    dependencies: [{ module_id: 'bi-advanced', required_version: '>=1.5.0', is_optional: true }],
    size_kb: 856,
    published_at: Date.now() - 86400000 * 180,
    updated_at: Date.now() - 86400000 * 7,
    license: 'MIT',
    documentation_url: '/docs/crm',
    icon: 'users',
  },
  {
    id: 'mes-dashboard',
    name: 'MES 生产看板',
    description: '制造执行系统实时生产看板，展示生产线状态、产量、良率、设备OEE等关键指标。',
    category: 'dashboard',
    tags: ['MES', '生产', '看板', '实时数据'],
    author: 'TOPEMS Team',
    version: '1.8.2',
    versions: ['1.8.2', '1.7.0', '1.6.3'],
    rating: 4.6,
    review_count: 89,
    download_count: 1820,
    installed: true,
    installed_version: '1.8.0',
    screenshots: [],
    features: ['实时生产数据', '设备状态监控', 'OEE 计算', '产量统计', '异常告警'],
    dependencies: [],
    size_kb: 512,
    published_at: Date.now() - 86400000 * 120,
    updated_at: Date.now() - 86400000 * 3,
    license: 'MIT',
    documentation_url: '/docs/mes-dashboard',
    icon: 'gauge',
  },
  {
    id: 'bi-advanced',
    name: 'BI 高级分析',
    description: '商业智能高级分析模块，支持多维数据分析、自定义报表、数据钻取、导出等功能。',
    category: 'dashboard',
    tags: ['BI', '数据分析', '报表', '可视化'],
    author: 'TOPEMS Team',
    version: '3.1.0',
    versions: ['3.1.0', '3.0.2', '2.5.0', '2.0.0'],
    rating: 4.9,
    review_count: 234,
    download_count: 5680,
    installed: true,
    installed_version: '3.0.2',
    screenshots: [],
    features: ['多维数据分析', '自定义报表', '数据钻取', '多格式导出', '定时报表'],
    dependencies: [],
    size_kb: 1240,
    published_at: Date.now() - 86400000 * 200,
    updated_at: Date.now() - 86400000 * 1,
    license: 'Commercial',
    documentation_url: '/docs/bi',
    icon: 'bar-chart-3',
  },
  {
    id: 'form-builder',
    name: '表单设计器',
    description: '可视化表单设计工具，支持拖拽式表单构建、字段校验、条件逻辑、数据联动。',
    category: 'tools',
    tags: ['表单', '低代码', '可视化', '拖拽'],
    author: 'TOPEMS Team',
    version: '2.0.1',
    versions: ['2.0.1', '2.0.0', '1.9.5'],
    rating: 4.7,
    review_count: 178,
    download_count: 4200,
    installed: false,
    screenshots: [],
    features: ['拖拽式设计', '丰富的字段类型', '条件逻辑', '数据联动', '表单模板'],
    dependencies: [],
    size_kb: 680,
    published_at: Date.now() - 86400000 * 90,
    updated_at: Date.now() - 86400000 * 5,
    license: 'MIT',
    documentation_url: '/docs/form-builder',
    icon: 'edit-3',
  },
  {
    id: 'workflow-engine',
    name: '工作流引擎',
    description: '强大的工作流引擎，支持BPMN流程设计、任务分配、流程监控、审批流转。',
    category: 'tools',
    tags: ['工作流', 'BPMN', '审批', '流程'],
    author: 'TOPEMS Team',
    version: '1.5.3',
    versions: ['1.5.3', '1.4.2', '1.3.0'],
    rating: 4.5,
    review_count: 112,
    download_count: 2560,
    installed: false,
    screenshots: [],
    features: ['BPMN 流程设计', '任务分配', '流程监控', '审批流转', '流程版本管理'],
    dependencies: [{ module_id: 'form-builder', required_version: '>=2.0.0', is_optional: false }],
    size_kb: 920,
    published_at: Date.now() - 86400000 * 150,
    updated_at: Date.now() - 86400000 * 10,
    license: 'MIT',
    documentation_url: '/docs/workflow',
    icon: 'git-branch',
  },
  {
    id: 'erp-integration',
    name: 'ERP 系统集成',
    description: '主流ERP系统集成适配器，支持SAP、Oracle、用友、金蝶等系统的数据对接。',
    category: 'integration',
    tags: ['ERP', '集成', 'SAP', '数据同步'],
    author: 'TOPEMS Team',
    version: '2.2.0',
    versions: ['2.2.0', '2.1.0', '2.0.0'],
    rating: 4.4,
    review_count: 67,
    download_count: 980,
    installed: false,
    screenshots: [],
    features: ['SAP 集成', 'Oracle 集成', '用友集成', '金蝶集成', '数据同步'],
    dependencies: [],
    size_kb: 1560,
    published_at: Date.now() - 86400000 * 200,
    updated_at: Date.now() - 86400000 * 15,
    license: 'Commercial',
    documentation_url: '/docs/erp-integration',
    icon: 'database',
  },
  {
    id: 'oauth-integration',
    name: 'OAuth 身份集成',
    description: '第三方身份认证集成，支持企业微信、钉钉、飞书、AD/LDAP等多种身份源。',
    category: 'integration',
    tags: ['OAuth', 'SSO', '身份认证', '企业微信'],
    author: 'TOPEMS Team',
    version: '1.3.1',
    versions: ['1.3.1', '1.2.0', '1.1.0'],
    rating: 4.6,
    review_count: 95,
    download_count: 1890,
    installed: true,
    installed_version: '1.3.0',
    screenshots: [],
    features: ['企业微信', '钉钉', '飞书', 'AD/LDAP', '统一认证'],
    dependencies: [],
    size_kb: 320,
    published_at: Date.now() - 86400000 * 100,
    updated_at: Date.now() - 86400000 * 20,
    license: 'MIT',
    documentation_url: '/docs/oauth',
    icon: 'shield',
  },
  {
    id: 'dark-theme',
    name: '暗黑主题包',
    description: '精美的暗黑主题包，包含多套配色方案，支持一键切换，护眼舒适。',
    category: 'theme',
    tags: ['暗黑主题', '深色模式', '主题', '配色'],
    author: 'TOPEMS Team',
    version: '1.2.0',
    versions: ['1.2.0', '1.1.0', '1.0.0'],
    rating: 4.8,
    review_count: 201,
    download_count: 6780,
    installed: true,
    installed_version: '1.1.0',
    screenshots: [],
    features: ['多套配色方案', '一键切换', '护眼模式', '自定义强调色', '自动切换'],
    dependencies: [],
    size_kb: 85,
    published_at: Date.now() - 86400000 * 60,
    updated_at: Date.now() - 86400000 * 2,
    license: 'MIT',
    documentation_url: '/docs/dark-theme',
    icon: 'moon',
  },
  {
    id: 'material-theme',
    name: 'Material Design 主题',
    description: 'Google Material Design 风格主题，遵循 Material You 设计规范，动态取色。',
    category: 'theme',
    tags: ['Material', 'Material You', '设计规范', '动态取色'],
    author: 'TOPEMS Team',
    version: '2.0.0',
    versions: ['2.0.0', '1.5.0', '1.0.0'],
    rating: 4.7,
    review_count: 145,
    download_count: 4320,
    installed: false,
    screenshots: [],
    features: ['Material You 设计', '动态取色', '组件样式', '圆角设计', '动效系统'],
    dependencies: [],
    size_kb: 156,
    published_at: Date.now() - 86400000 * 75,
    updated_at: Date.now() - 86400000 * 8,
    license: 'MIT',
    documentation_url: '/docs/material-theme',
    icon: 'palette',
  },
  {
    id: 'quality-management',
    name: '质量管理模块',
    description: '全面质量管理模块，包含检验计划、质量追溯、不合格品管理、SPC统计过程控制。',
    category: 'business',
    tags: ['质量', 'QMS', '检验', 'SPC'],
    author: 'TOPEMS Team',
    version: '1.6.0',
    versions: ['1.6.0', '1.5.2', '1.4.0'],
    rating: 4.5,
    review_count: 78,
    download_count: 1450,
    installed: false,
    screenshots: [],
    features: ['检验计划', '质量追溯', '不合格品管理', 'SPC 控制图', '质量报表'],
    dependencies: [{ module_id: 'bi-advanced', required_version: '>=3.0.0', is_optional: true }],
    size_kb: 720,
    published_at: Date.now() - 86400000 * 130,
    updated_at: Date.now() - 86400000 * 12,
    license: 'Commercial',
    documentation_url: '/docs/qms',
    icon: 'check-circle',
  },
  {
    id: 'maintenance-module',
    name: '设备维护管理',
    description: '设备全生命周期维护管理，包含预防性维护、故障维修、备件管理、设备台账。',
    category: 'business',
    tags: ['设备', '维护', 'EAM', '备件'],
    author: 'TOPEMS Team',
    version: '1.4.1',
    versions: ['1.4.1', '1.3.0', '1.2.0'],
    rating: 4.6,
    review_count: 92,
    download_count: 1680,
    installed: false,
    screenshots: [],
    features: ['设备台账', '预防性维护', '故障维修', '备件管理', '维护报表'],
    dependencies: [],
    size_kb: 640,
    published_at: Date.now() - 86400000 * 110,
    updated_at: Date.now() - 86400000 * 18,
    license: 'MIT',
    documentation_url: '/docs/maintenance',
    icon: 'settings',
  },
  {
    id: 'notification-center',
    name: '通知中心',
    description: '统一消息通知中心，支持站内信、邮件、短信、企业微信等多渠道消息推送。',
    category: 'tools',
    tags: ['通知', '消息', '推送', '邮件'],
    author: 'TOPEMS Team',
    version: '2.1.0',
    versions: ['2.1.0', '2.0.0', '1.5.0'],
    rating: 4.7,
    review_count: 134,
    download_count: 3200,
    installed: true,
    installed_version: '2.0.0',
    screenshots: [],
    features: ['站内信', '邮件通知', '短信通知', '企业微信推送', '消息模板'],
    dependencies: [
      { module_id: 'oauth-integration', required_version: '>=1.2.0', is_optional: true },
    ],
    size_kb: 380,
    published_at: Date.now() - 86400000 * 85,
    updated_at: Date.now() - 86400000 * 4,
    license: 'MIT',
    documentation_url: '/docs/notification',
    icon: 'bell',
  },
];

const PRESET_REVIEWS: ModuleReview[] = [
  {
    id: 'r1',
    module_id: 'crm-module',
    user_id: 'u1',
    user_name: '张经理',
    rating: 5,
    comment: '功能非常全面，客户管理流程很顺畅，强烈推荐！',
    created_at: Date.now() - 86400000 * 30,
    helpful_count: 23,
  },
  {
    id: 'r2',
    module_id: 'crm-module',
    user_id: 'u2',
    user_name: '李销售',
    rating: 4,
    comment: '整体不错，希望能增加更多自定义字段的功能。',
    created_at: Date.now() - 86400000 * 20,
    helpful_count: 8,
  },
  {
    id: 'r3',
    module_id: 'bi-advanced',
    user_id: 'u3',
    user_name: '王数据',
    rating: 5,
    comment: '数据分析功能强大，报表设计灵活，满足各种业务需求。',
    created_at: Date.now() - 86400000 * 15,
    helpful_count: 45,
  },
  {
    id: 'r4',
    module_id: 'mes-dashboard',
    user_id: 'u4',
    user_name: '赵工',
    rating: 4,
    comment: '实时数据展示很直观，生产现场使用效果很好。',
    created_at: Date.now() - 86400000 * 10,
    helpful_count: 12,
  },
  {
    id: 'r5',
    module_id: 'form-builder',
    user_id: 'u5',
    user_name: '孙开发',
    rating: 5,
    comment: '拖拽设计太方便了，大大提高了表单开发效率。',
    created_at: Date.now() - 86400000 * 5,
    helpful_count: 34,
  },
  {
    id: 'r6',
    module_id: 'dark-theme',
    user_id: 'u6',
    user_name: '周设计',
    rating: 5,
    comment: '暗黑模式配色很舒服，长时间使用眼睛不累。',
    created_at: Date.now() - 86400000 * 3,
    helpful_count: 56,
  },
  {
    id: 'r7',
    module_id: 'workflow-engine',
    user_id: 'u7',
    user_name: '吴产品',
    rating: 4,
    comment: '流程设计功能强大，学习成本略高但值得投入。',
    created_at: Date.now() - 86400000 * 8,
    helpful_count: 19,
  },
];

type ModuleMarketChangeListener = (modules: MarketplaceModule[]) => void;

export class ModuleMarket {
  private modules: Map<string, MarketplaceModule> = new Map();
  private categories: Map<string, Category> = new Map();
  private reviews: Map<string, ModuleReview[]> = new Map();
  private listeners: Set<ModuleMarketChangeListener> = new Set();

  constructor() {
    this.initPresetData();
  }

  private initPresetData(): void {
    PRESET_CATEGORIES.forEach((cat) => {
      this.categories.set(cat.id, { ...cat, module_count: 0 });
    });

    PRESET_MODULES.forEach((mod) => {
      this.modules.set(mod.id, { ...mod });
      const cat = this.categories.get(mod.category);
      if (cat) {
        cat.module_count++;
      }
    });

    PRESET_REVIEWS.forEach((review) => {
      if (!this.reviews.has(review.module_id)) {
        this.reviews.set(review.module_id, []);
      }
      this.reviews.get(review.module_id)!.push(review);
    });
  }

  listModules(options?: {
    category?: string;
    keyword?: string;
    sort?: ModuleSortType;
    installed_only?: boolean;
  }): MarketplaceModule[] {
    let result = Array.from(this.modules.values());

    if (options?.category) {
      result = result.filter((m) => m.category === options.category);
    }

    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(kw) ||
          m.description.toLowerCase().includes(kw) ||
          m.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }

    if (options?.installed_only) {
      result = result.filter((m) => m.installed);
    }

    if (options?.sort) {
      switch (options.sort) {
        case 'popular':
          result.sort((a, b) => b.download_count - a.download_count);
          break;
        case 'newest':
          result.sort((a, b) => b.published_at - a.published_at);
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'downloads':
          result.sort((a, b) => b.download_count - a.download_count);
          break;
      }
    }

    return result;
  }

  getModule(moduleId: string): MarketplaceModule | undefined {
    return this.modules.get(moduleId);
  }

  searchModules(keyword: string): MarketplaceModule[] {
    return this.listModules({ keyword });
  }

  getCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  getModuleReviews(moduleId: string): ModuleReview[] {
    return this.reviews.get(moduleId) || [];
  }

  installModule(moduleId: string, version?: string): boolean {
    const mod = this.modules.get(moduleId);
    if (!mod) return false;

    const installVersion = version || mod.version;
    mod.installed = true;
    mod.installed_version = installVersion;
    mod.download_count++;

    this.notifyListeners();
    return true;
  }

  uninstallModule(moduleId: string): boolean {
    const mod = this.modules.get(moduleId);
    if (!mod) return false;

    mod.installed = false;
    mod.installed_version = undefined;

    this.notifyListeners();
    return true;
  }

  rateModule(moduleId: string, rating: number): boolean {
    const mod = this.modules.get(moduleId);
    if (!mod || rating < 1 || rating > 5) return false;

    const currentTotal = mod.rating * mod.review_count;
    mod.review_count++;
    mod.rating = Math.round(((currentTotal + rating) / mod.review_count) * 10) / 10;

    this.notifyListeners();
    return true;
  }

  addReview(
    moduleId: string,
    review: Omit<ModuleReview, 'id' | 'module_id' | 'created_at' | 'helpful_count'>
  ): ModuleReview | null {
    const mod = this.modules.get(moduleId);
    if (!mod) return null;

    const newReview: ModuleReview = {
      id: `r_${Date.now()}`,
      module_id: moduleId,
      ...review,
      created_at: Date.now(),
      helpful_count: 0,
    };

    if (!this.reviews.has(moduleId)) {
      this.reviews.set(moduleId, []);
    }
    this.reviews.get(moduleId)!.unshift(newReview);

    const currentTotal = mod.rating * mod.review_count;
    mod.review_count++;
    mod.rating = Math.round(((currentTotal + review.rating) / mod.review_count) * 10) / 10;

    this.notifyListeners();
    return newReview;
  }

  getInstalledModules(): MarketplaceModule[] {
    return this.listModules({ installed_only: true });
  }

  getRecommendedModules(limit: number = 6): MarketplaceModule[] {
    const notInstalled = this.listModules().filter((m) => !m.installed);
    notInstalled.sort((a, b) => b.rating * b.download_count - a.rating * a.download_count);
    return notInstalled.slice(0, limit);
  }

  subscribe(listener: ModuleMarketChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const modules = this.listModules();
    this.listeners.forEach((cb) => {
      try {
        cb(modules);
      } catch {
        // ignore
      }
    });
  }
}

export const moduleMarket = new ModuleMarket();
export default moduleMarket;
