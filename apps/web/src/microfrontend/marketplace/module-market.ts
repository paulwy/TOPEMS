import i18n from '@/i18n';

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
    name: i18n.t('microfrontend.module-market.k0'),
    description: i18n.t('microfrontend.module-market.k1'),
    icon: 'briefcase',
    module_count: 0,
  },
  {
    id: 'dashboard',
    name: i18n.t('microfrontend.module-market.k2'),
    description: i18n.t('microfrontend.module-market.k3'),
    icon: 'gauge',
    module_count: 0,
  },
  {
    id: 'tools',
    name: i18n.t('microfrontend.module-market.k5'),
    description: i18n.t('microfrontend.module-market.k4'),
    icon: 'wrench',
    module_count: 0,
  },
  {
    id: 'integration',
    name: i18n.t('microfrontend.module-market.k7'),
    description: i18n.t('microfrontend.module-market.k6'),
    icon: 'plug',
    module_count: 0,
  },
  {
    id: 'theme',
    name: i18n.t('microfrontend.module-market.k8'),
    description: i18n.t('microfrontend.module-market.ui_0'),
    icon: 'palette',
    module_count: 0,
  },
];

const PRESET_MODULES: MarketplaceModule[] = [
  {
    id: 'crm-module',
    name: i18n.t('microfrontend.module-market.crm_1'),
    description: i18n.t('microfrontend.module-market.k9'),
    category: 'business',
    tags: [
      'CRM',
      i18n.t('microfrontend.module-market.k12'),
      i18n.t('microfrontend.module-market.k11'),
      i18n.t('microfrontend.module-market.k10'),
    ],
    author: 'TOPEMS Team',
    version: '2.3.1',
    versions: ['2.3.1', '2.2.0', '2.1.5', '2.0.0'],
    rating: 4.8,
    review_count: 156,
    download_count: 3240,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k17'),
      i18n.t('microfrontend.module-market.k16'),
      i18n.t('microfrontend.module-market.k15'),
      i18n.t('microfrontend.module-market.k14'),
      i18n.t('microfrontend.module-market.k13'),
    ],
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
    name: i18n.t('microfrontend.module-market.mes_2'),
    description: i18n.t('microfrontend.module-market.k18'),
    category: 'dashboard',
    tags: [
      'MES',
      i18n.t('microfrontend.module-market.k21'),
      i18n.t('microfrontend.module-market.k20'),
      i18n.t('microfrontend.module-market.k19'),
    ],
    author: 'TOPEMS Team',
    version: '1.8.2',
    versions: ['1.8.2', '1.7.0', '1.6.3'],
    rating: 4.6,
    review_count: 89,
    download_count: 1820,
    installed: true,
    installed_version: '1.8.0',
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k25'),
      i18n.t('microfrontend.module-market.k24'),
      i18n.t('microfrontend.module-market.oee_3'),
      i18n.t('microfrontend.module-market.k23'),
      i18n.t('microfrontend.module-market.k22'),
    ],
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
    name: i18n.t('microfrontend.module-market.bi_4'),
    description: i18n.t('microfrontend.module-market.k26'),
    category: 'dashboard',
    tags: [
      'BI',
      i18n.t('microfrontend.module-market.k29'),
      i18n.t('microfrontend.module-market.k28'),
      i18n.t('microfrontend.module-market.k27'),
    ],
    author: 'TOPEMS Team',
    version: '3.1.0',
    versions: ['3.1.0', '3.0.2', '2.5.0', '2.0.0'],
    rating: 4.9,
    review_count: 234,
    download_count: 5680,
    installed: true,
    installed_version: '3.0.2',
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k34'),
      i18n.t('microfrontend.module-market.k33'),
      i18n.t('microfrontend.module-market.k32'),
      i18n.t('microfrontend.module-market.k31'),
      i18n.t('microfrontend.module-market.k30'),
    ],
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
    name: i18n.t('microfrontend.module-market.k35'),
    description: i18n.t('microfrontend.module-market.k36'),
    category: 'tools',
    tags: [
      i18n.t('microfrontend.module-market.k40'),
      i18n.t('microfrontend.module-market.k39'),
      i18n.t('microfrontend.module-market.k38'),
      i18n.t('microfrontend.module-market.k37'),
    ],
    author: 'TOPEMS Team',
    version: '2.0.1',
    versions: ['2.0.1', '2.0.0', '1.9.5'],
    rating: 4.7,
    review_count: 178,
    download_count: 4200,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k45'),
      i18n.t('microfrontend.module-market.k44'),
      i18n.t('microfrontend.module-market.k43'),
      i18n.t('microfrontend.module-market.k42'),
      i18n.t('microfrontend.module-market.k41'),
    ],
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
    name: i18n.t('microfrontend.module-market.k46'),
    description: i18n.t('microfrontend.module-market.k47'),
    category: 'tools',
    tags: [
      i18n.t('microfrontend.module-market.k50'),
      'BPMN',
      i18n.t('microfrontend.module-market.k49'),
      i18n.t('microfrontend.module-market.k48'),
    ],
    author: 'TOPEMS Team',
    version: '1.5.3',
    versions: ['1.5.3', '1.4.2', '1.3.0'],
    rating: 4.5,
    review_count: 112,
    download_count: 2560,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.bpmn_5'),
      i18n.t('microfrontend.module-market.k54'),
      i18n.t('microfrontend.module-market.k53'),
      i18n.t('microfrontend.module-market.k52'),
      i18n.t('microfrontend.module-market.k51'),
    ],
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
    name: i18n.t('microfrontend.module-market.erp_6'),
    description: i18n.t('microfrontend.module-market.k55'),
    category: 'integration',
    tags: [
      'ERP',
      i18n.t('microfrontend.module-market.k57'),
      'SAP',
      i18n.t('microfrontend.module-market.k56'),
    ],
    author: 'TOPEMS Team',
    version: '2.2.0',
    versions: ['2.2.0', '2.1.0', '2.0.0'],
    rating: 4.4,
    review_count: 67,
    download_count: 980,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.sap_8'),
      i18n.t('microfrontend.module-market.oracle_7'),
      i18n.t('microfrontend.module-market.k60'),
      i18n.t('microfrontend.module-market.k59'),
      i18n.t('microfrontend.module-market.k58'),
    ],
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
    name: i18n.t('microfrontend.module-market.oauth_9'),
    description: i18n.t('microfrontend.module-market.k61'),
    category: 'integration',
    tags: [
      'OAuth',
      'SSO',
      i18n.t('microfrontend.module-market.k63'),
      i18n.t('microfrontend.module-market.k62'),
    ],
    author: 'TOPEMS Team',
    version: '1.3.1',
    versions: ['1.3.1', '1.2.0', '1.1.0'],
    rating: 4.6,
    review_count: 95,
    download_count: 1890,
    installed: true,
    installed_version: '1.3.0',
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k67'),
      i18n.t('microfrontend.module-market.k66'),
      i18n.t('microfrontend.module-market.k65'),
      'AD/LDAP',
      i18n.t('microfrontend.module-market.k64'),
    ],
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
    name: i18n.t('microfrontend.module-market.k68'),
    description: i18n.t('microfrontend.module-market.k69'),
    category: 'theme',
    tags: [
      i18n.t('microfrontend.module-market.k73'),
      i18n.t('microfrontend.module-market.k72'),
      i18n.t('microfrontend.module-market.k71'),
      i18n.t('microfrontend.module-market.k70'),
    ],
    author: 'TOPEMS Team',
    version: '1.2.0',
    versions: ['1.2.0', '1.1.0', '1.0.0'],
    rating: 4.8,
    review_count: 201,
    download_count: 6780,
    installed: true,
    installed_version: '1.1.0',
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k78'),
      i18n.t('microfrontend.module-market.k77'),
      i18n.t('microfrontend.module-market.k76'),
      i18n.t('microfrontend.module-market.k75'),
      i18n.t('microfrontend.module-market.k74'),
    ],
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
    name: i18n.t('microfrontend.module-market.materialdesign_10'),
    description: i18n.t('microfrontend.module-market.k11'),
    category: 'theme',
    tags: [
      'Material',
      'Material You',
      i18n.t('microfrontend.module-market.k80'),
      i18n.t('microfrontend.module-market.k79'),
    ],
    author: 'TOPEMS Team',
    version: '2.0.0',
    versions: ['2.0.0', '1.5.0', '1.0.0'],
    rating: 4.7,
    review_count: 145,
    download_count: 4320,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.materialyou_12'),
      i18n.t('microfrontend.module-market.k84'),
      i18n.t('microfrontend.module-market.k83'),
      i18n.t('microfrontend.module-market.k82'),
      i18n.t('microfrontend.module-market.k81'),
    ],
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
    name: i18n.t('microfrontend.module-market.k85'),
    description: i18n.t('microfrontend.module-market.k86'),
    category: 'business',
    tags: [
      i18n.t('microfrontend.module-market.k88'),
      'QMS',
      i18n.t('microfrontend.module-market.k87'),
      'SPC',
    ],
    author: 'TOPEMS Team',
    version: '1.6.0',
    versions: ['1.6.0', '1.5.2', '1.4.0'],
    rating: 4.5,
    review_count: 78,
    download_count: 1450,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k92'),
      i18n.t('microfrontend.module-market.k91'),
      i18n.t('microfrontend.module-market.k90'),
      i18n.t('microfrontend.module-market.spc_13'),
      i18n.t('microfrontend.module-market.k89'),
    ],
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
    name: i18n.t('microfrontend.module-market.k93'),
    description: i18n.t('microfrontend.module-market.k94'),
    category: 'business',
    tags: [
      i18n.t('microfrontend.module-market.k97'),
      i18n.t('microfrontend.module-market.k96'),
      'EAM',
      i18n.t('microfrontend.module-market.k95'),
    ],
    author: 'TOPEMS Team',
    version: '1.4.1',
    versions: ['1.4.1', '1.3.0', '1.2.0'],
    rating: 4.6,
    review_count: 92,
    download_count: 1680,
    installed: false,
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k102'),
      i18n.t('microfrontend.module-market.k101'),
      i18n.t('microfrontend.module-market.k100'),
      i18n.t('microfrontend.module-market.k99'),
      i18n.t('microfrontend.module-market.k98'),
    ],
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
    name: i18n.t('microfrontend.module-market.k103'),
    description: i18n.t('microfrontend.module-market.k104'),
    category: 'tools',
    tags: [
      i18n.t('microfrontend.module-market.k108'),
      i18n.t('microfrontend.module-market.k107'),
      i18n.t('microfrontend.module-market.k106'),
      i18n.t('microfrontend.module-market.k105'),
    ],
    author: 'TOPEMS Team',
    version: '2.1.0',
    versions: ['2.1.0', '2.0.0', '1.5.0'],
    rating: 4.7,
    review_count: 134,
    download_count: 3200,
    installed: true,
    installed_version: '2.0.0',
    screenshots: [],
    features: [
      i18n.t('microfrontend.module-market.k113'),
      i18n.t('microfrontend.module-market.k112'),
      i18n.t('microfrontend.module-market.k111'),
      i18n.t('microfrontend.module-market.k110'),
      i18n.t('microfrontend.module-market.k109'),
    ],
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
    user_name: i18n.t('microfrontend.module-market.k114'),
    rating: 5,
    comment: i18n.t('microfrontend.module-market.k115'),
    created_at: Date.now() - 86400000 * 30,
    helpful_count: 23,
  },
  {
    id: 'r2',
    module_id: 'crm-module',
    user_id: 'u2',
    user_name: i18n.t('microfrontend.module-market.k116'),
    rating: 4,
    comment: i18n.t('microfrontend.module-market.k117'),
    created_at: Date.now() - 86400000 * 20,
    helpful_count: 8,
  },
  {
    id: 'r3',
    module_id: 'bi-advanced',
    user_id: 'u3',
    user_name: i18n.t('microfrontend.module-market.k118'),
    rating: 5,
    comment: i18n.t('microfrontend.module-market.k119'),
    created_at: Date.now() - 86400000 * 15,
    helpful_count: 45,
  },
  {
    id: 'r4',
    module_id: 'mes-dashboard',
    user_id: 'u4',
    user_name: i18n.t('microfrontend.module-market.k120'),
    rating: 4,
    comment: i18n.t('microfrontend.module-market.k121'),
    created_at: Date.now() - 86400000 * 10,
    helpful_count: 12,
  },
  {
    id: 'r5',
    module_id: 'form-builder',
    user_id: 'u5',
    user_name: i18n.t('microfrontend.module-market.k122'),
    rating: 5,
    comment: i18n.t('microfrontend.module-market.k123'),
    created_at: Date.now() - 86400000 * 5,
    helpful_count: 34,
  },
  {
    id: 'r6',
    module_id: 'dark-theme',
    user_id: 'u6',
    user_name: i18n.t('microfrontend.module-market.k124'),
    rating: 5,
    comment: i18n.t('microfrontend.module-market.k125'),
    created_at: Date.now() - 86400000 * 3,
    helpful_count: 56,
  },
  {
    id: 'r7',
    module_id: 'workflow-engine',
    user_id: 'u7',
    user_name: i18n.t('microfrontend.module-market.k126'),
    rating: 4,
    comment: i18n.t('microfrontend.module-market.k127'),
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
