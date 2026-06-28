import type {
  Plugin,
  PluginCategory,
  PluginVersion,
  PluginReview,
  MarketplaceSummary,
  PluginListResponse,
  PluginReviewListResponse,
} from './types';

const MOCK_CATEGORIES: PluginCategory[] = [
  {
    id: '1',
    code: 'all',
    name: '全部插件',
    description: '所有可用插件',
    icon: 'Package',
    sort_order: 0,
    plugin_count: 24,
  },
  {
    id: '2',
    code: 'finance',
    name: '财务管理',
    description: '财务、会计、预算相关插件',
    icon: 'DollarSign',
    sort_order: 1,
    plugin_count: 4,
  },
  {
    id: '3',
    code: 'hr',
    name: '人力资源',
    description: 'HR、招聘、培训相关插件',
    icon: 'Users',
    sort_order: 2,
    plugin_count: 3,
  },
  {
    id: '4',
    code: 'manufacturing',
    name: '生产制造',
    description: 'MES、生产、设备相关插件',
    icon: 'Factory',
    sort_order: 3,
    plugin_count: 5,
  },
  {
    id: '5',
    code: 'quality',
    name: '质量管理',
    description: 'QMS、质检、实验室相关插件',
    icon: 'ShieldCheck',
    sort_order: 4,
    plugin_count: 3,
  },
  {
    id: '6',
    code: 'supply',
    name: '供应链',
    description: '采购、供应商、库存相关插件',
    icon: 'Truck',
    sort_order: 5,
    plugin_count: 4,
  },
  {
    id: '7',
    code: 'crm',
    name: '客户关系',
    description: 'CRM、销售、客服相关插件',
    icon: 'Target',
    sort_order: 6,
    plugin_count: 3,
  },
  {
    id: '8',
    code: 'project',
    name: '项目管理',
    description: '项目、研发、任务相关插件',
    icon: 'FolderKanban',
    sort_order: 7,
    plugin_count: 2,
  },
];

const generateMockPlugins = (): Plugin[] => {
  const plugins: Plugin[] = [];
  const pluginData = [
    {
      code: 'finance',
      name: '财务管理',
      category: 'finance',
      desc: '完整的财务管理模块，包含总账、应收应付、固定资产、财务报表等功能',
      isFree: true,
      installs: 12580,
      rating: 4.8,
      ratingCount: 328,
    },
    {
      code: 'finance-budget',
      name: '预算管理',
      category: 'finance',
      desc: '全面预算编制、执行控制、预算分析一体化解决方案',
      isFree: false,
      price: 29900,
      installs: 3420,
      rating: 4.6,
      ratingCount: 89,
    },
    {
      code: 'finance-cost',
      name: '成本核算',
      category: 'finance',
      desc: '精细化成本核算，支持多维度成本分析和成本控制',
      isFree: false,
      price: 39900,
      installs: 2180,
      rating: 4.5,
      ratingCount: 67,
    },
    {
      code: 'finance-tax',
      name: '税务管理',
      category: 'finance',
      desc: '智能税务申报、发票管理、税务风险预警',
      isFree: false,
      price: 19900,
      installs: 5620,
      rating: 4.7,
      ratingCount: 156,
    },

    {
      code: 'hrm',
      name: '人力资源',
      category: 'hr',
      desc: '全生命周期人力资源管理，从招聘到离职的完整解决方案',
      isFree: true,
      installs: 10240,
      rating: 4.7,
      ratingCount: 256,
    },
    {
      code: 'hr-recruit',
      name: '招聘管理',
      category: 'hr',
      desc: '智能化招聘管理系统，多渠道简历聚合，AI简历筛选',
      isFree: false,
      price: 24900,
      installs: 4560,
      rating: 4.5,
      ratingCount: 112,
    },
    {
      code: 'hr-training',
      name: '培训管理',
      category: 'hr',
      desc: '企业培训平台，在线课程、考试、学习路径管理',
      isFree: false,
      price: 19900,
      installs: 3210,
      rating: 4.4,
      ratingCount: 78,
    },

    {
      code: 'mes',
      name: '生产执行',
      category: 'manufacturing',
      desc: '智能制造执行系统，实现生产过程全面数字化管控',
      isFree: true,
      installs: 8920,
      rating: 4.6,
      ratingCount: 213,
    },
    {
      code: 'mes-equipment',
      name: '设备管理',
      category: 'manufacturing',
      desc: '设备全生命周期管理，预防性维护，OEE分析',
      isFree: false,
      price: 34900,
      installs: 5230,
      rating: 4.7,
      ratingCount: 134,
    },
    {
      code: 'mes-quality',
      name: '生产质检',
      category: 'manufacturing',
      desc: '生产过程质量检验，SPC统计过程控制',
      isFree: false,
      price: 29900,
      installs: 3890,
      rating: 4.5,
      ratingCount: 98,
    },
    {
      code: 'mes-oee',
      name: 'OEE分析',
      category: 'manufacturing',
      desc: '设备综合效率分析，停机原因追踪，效率提升建议',
      isFree: false,
      price: 19900,
      installs: 4120,
      rating: 4.6,
      ratingCount: 105,
    },
    {
      code: 'mes-kanban',
      name: '生产看板',
      category: 'manufacturing',
      desc: '实时生产数据可视化看板，支持定制化布局',
      isFree: false,
      price: 14900,
      installs: 6780,
      rating: 4.8,
      ratingCount: 189,
    },

    {
      code: 'qms',
      name: '质量管理',
      category: 'quality',
      desc: '全面质量管理系统，质量策划、控制、改进闭环',
      isFree: true,
      installs: 6540,
      rating: 4.5,
      ratingCount: 156,
    },
    {
      code: 'lims',
      name: '实验室管理',
      category: 'quality',
      desc: '实验室信息管理系统，样品、检测、报告全流程管理',
      isFree: false,
      price: 49900,
      installs: 2340,
      rating: 4.6,
      ratingCount: 67,
    },
    {
      code: 'ehs',
      name: '环境安全',
      category: 'quality',
      desc: 'EHS管理系统，安全检查、隐患整改、事故管理',
      isFree: false,
      price: 29900,
      installs: 1890,
      rating: 4.4,
      ratingCount: 45,
    },

    {
      code: 'scm',
      name: '供应链管理',
      category: 'supply',
      desc: '端到端供应链管理，采购、库存、物流一体化',
      isFree: true,
      installs: 7890,
      rating: 4.6,
      ratingCount: 189,
    },
    {
      code: 'srm',
      name: '供应商管理',
      category: 'supply',
      desc: '供应商全生命周期管理，准入、评估、绩效管理',
      isFree: false,
      price: 24900,
      installs: 4560,
      rating: 4.5,
      ratingCount: 112,
    },
    {
      code: 'wms',
      name: '仓储管理',
      category: 'supply',
      desc: '智能仓储管理系统，条码、批次、库位精细化管理',
      isFree: false,
      price: 39900,
      installs: 5670,
      rating: 4.7,
      ratingCount: 145,
    },
    {
      code: 'mrp',
      name: 'MRP运算',
      category: 'supply',
      desc: '物料需求计划运算，智能采购建议，生产计划协同',
      isFree: false,
      price: 29900,
      installs: 3450,
      rating: 4.5,
      ratingCount: 87,
    },

    {
      code: 'crm',
      name: '客户关系',
      category: 'crm',
      desc: '全方位客户关系管理，商机、合同、服务全流程',
      isFree: true,
      installs: 9230,
      rating: 4.7,
      ratingCount: 234,
    },
    {
      code: 'crm-service',
      name: '客户服务',
      category: 'crm',
      desc: '客户服务工单系统，支持多渠道接入，SLA管理',
      isFree: false,
      price: 19900,
      installs: 4120,
      rating: 4.6,
      ratingCount: 102,
    },
    {
      code: 'bi',
      name: '商业智能',
      category: 'crm',
      desc: '自助式BI分析平台，丰富图表，数据洞察',
      isFree: false,
      price: 34900,
      installs: 6780,
      rating: 4.8,
      ratingCount: 178,
    },

    {
      code: 'pm',
      name: '项目管理',
      category: 'project',
      desc: '企业级项目管理，任务、进度、资源、成本一体化',
      isFree: true,
      installs: 5670,
      rating: 4.6,
      ratingCount: 145,
    },
    {
      code: 'rs',
      name: '研发管理',
      category: 'project',
      desc: '研发项目全流程管理，需求、设计、开发、测试、发布',
      isFree: false,
      price: 39900,
      installs: 3450,
      rating: 4.5,
      ratingCount: 89,
    },
  ];

  pluginData.forEach((p, index) => {
    plugins.push({
      id: String(index + 1),
      code: p.code,
      name: p.name,
      description: p.desc,
      version: `${1 + Math.floor(index / 5)}.${index % 5}.0`,
      plugin_type: index % 3 === 0 ? 'core' : 'business',
      is_published: true,
      category: p.category,
      is_free: p.isFree,
      price_cents: p.price || 0,
      install_count: p.installs,
      rating: p.rating,
      rating_count: p.ratingCount,
      author_name: index % 4 === 0 ? 'TOPEMS官方' : 'TOPEMS社区',
      is_featured: index < 6,
      tags: [p.category, index % 2 === 0 ? '热门' : '推荐', index % 3 === 0 ? '官方' : '社区'],
      created_at: new Date(Date.now() - index * 86400000 * 7).toISOString(),
    });
  });

  return plugins;
};

const MOCK_PLUGINS = generateMockPlugins();

const generateMockVersions = (pluginCode: string): PluginVersion[] => {
  return [
    {
      id: `${pluginCode}-v3`,
      plugin_id: pluginCode,
      version: '2.1.0',
      release_notes: '新增功能模块，优化性能体验，修复已知问题',
      is_stable: true,
      is_latest: true,
      filesize: 15360000,
      min_app_version: '2.0.0',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: `${pluginCode}-v2`,
      plugin_id: pluginCode,
      version: '2.0.1',
      release_notes: '修复若干bug，提升系统稳定性',
      is_stable: true,
      is_latest: false,
      filesize: 14336000,
      min_app_version: '1.8.0',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: `${pluginCode}-v1`,
      plugin_id: pluginCode,
      version: '1.9.5',
      release_notes: '首个稳定版本发布',
      is_stable: true,
      is_latest: false,
      filesize: 12288000,
      min_app_version: '1.5.0',
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
    },
  ];
};

const generateMockReviews = (pluginCode: string): PluginReview[] => {
  const reviews: PluginReview[] = [];
  const reviewContents = [
    {
      rating: 5,
      title: '功能强大',
      content: '插件功能非常强大，完全满足我们的业务需求，推荐使用！',
      user: '张经理',
    },
    {
      rating: 4,
      title: '整体不错',
      content: '整体使用体验很好，希望后续能增加更多定制化功能。',
      user: '李主管',
    },
    {
      rating: 5,
      title: '值得推荐',
      content: '安装简单，配置方便，客服响应也很及时。',
      user: '王工程师',
    },
    {
      rating: 5,
      title: '提升效率',
      content: '自从用了这个插件，工作效率提升了很多，非常满意！',
      user: '赵总监',
    },
    {
      rating: 4,
      title: '性价比高',
      content: '功能齐全，价格合理，是中小企业的好选择。',
      user: '陈老板',
    },
  ];

  reviewContents.forEach((r, index) => {
    reviews.push({
      id: `${pluginCode}-review-${index + 1}`,
      plugin_id: pluginCode,
      user_id: `user-${index + 1}`,
      user_name: r.user,
      rating: r.rating,
      title: r.title,
      content: r.content,
      is_verified_purchase: true,
      is_featured: index < 2,
      helpful_count: Math.floor(Math.random() * 50),
      created_at: new Date(Date.now() - index * 86400000 * 5).toISOString(),
    });
  });

  return reviews;
};

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

export const mockMarketplaceApi = {
  getSummary: async (): Promise<{ success: boolean; data: MarketplaceSummary }> => {
    const featured = MOCK_PLUGINS.filter((p) => p.is_featured).slice(0, 6);
    const topRated = [...MOCK_PLUGINS]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
    const newest = [...MOCK_PLUGINS]
      .sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      )
      .slice(0, 6);

    return delay({
      success: true,
      data: {
        total_plugins: MOCK_PLUGINS.length,
        categories: MOCK_CATEGORIES,
        featured_plugins: featured,
        new_plugins: newest,
        top_rated: topRated,
      },
    });
  },

  getCategories: async (): Promise<{ success: boolean; data: PluginCategory[] }> => {
    return delay({ success: true, data: MOCK_CATEGORIES });
  },

  listPlugins: async (params?: {
    search?: string;
    category?: string;
    sort_by?: 'popular' | 'rating' | 'newest' | 'price';
    sort_order?: 'asc' | 'desc';
    page?: number;
    pagesize?: number;
    is_free?: boolean;
  }): Promise<{ success: boolean; data: PluginListResponse }> => {
    let result = [...MOCK_PLUGINS];

    if (params?.search) {
      const term = params.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.tags?.some((t) => t.toLowerCase().includes(term))
      );
    }

    if (params?.category && params.category !== 'all') {
      result = result.filter((p) => p.category === params.category);
    }

    if (params?.is_free !== undefined) {
      result = result.filter((p) => p.is_free === params.is_free);
    }

    switch (params?.sort_by) {
      case 'popular':
        result.sort((a, b) => (b.install_count || 0) - (a.install_count || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        result.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        break;
      case 'price':
        result.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
        break;
    }

    if (params?.sort_order === 'asc') {
      result.reverse();
    }

    const page = params?.page || 1;
    const pagesize = params?.pagesize || 20;
    const total = result.length;
    const start = (page - 1) * pagesize;
    const paginated = result.slice(start, start + pagesize);

    return delay({
      success: true,
      data: {
        plugins: paginated,
        total,
        page,
        pagesize,
        total_pages: Math.ceil(total / pagesize),
      },
    });
  },

  getPlugin: async (code: string): Promise<{ success: boolean; data: Plugin | null }> => {
    const plugin = MOCK_PLUGINS.find((p) => p.code === code) || null;
    return delay({ success: !!plugin, data: plugin });
  },

  getVersions: async (code: string): Promise<{ success: boolean; data: PluginVersion[] }> => {
    return delay({ success: true, data: generateMockVersions(code) });
  },

  getReviews: async (
    code: string,
    params?: {
      page?: number;
      pagesize?: number;
      sort_by?: 'date' | 'helpful' | 'rating';
      sort_order?: 'asc' | 'desc';
      rating_min?: number;
      is_verified?: boolean;
    }
  ): Promise<{ success: boolean; data: PluginReviewListResponse }> => {
    let reviews = generateMockReviews(code);

    if (params?.rating_min) {
      reviews = reviews.filter((r) => (r.rating || 0) >= params.rating_min!);
    }

    if (params?.is_verified) {
      reviews = reviews.filter((r) => r.is_verified_purchase);
    }

    switch (params?.sort_by) {
      case 'helpful':
        reviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
        break;
      case 'rating':
        reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'date':
      default:
        reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (params?.sort_order === 'asc') {
      reviews.reverse();
    }

    const page = params?.page || 1;
    const pagesize = params?.pagesize || 10;
    const total = reviews.length;
    const start = (page - 1) * pagesize;
    const paginated = reviews.slice(start, start + pagesize);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

    return delay({
      success: true,
      data: {
        reviews: paginated,
        total,
        page,
        pagesize,
        total_pages: Math.ceil(total / pagesize),
        average_rating: avgRating,
      },
    });
  },

  submitReview: async (
    code: string,
    data: { rating: number; title?: string; content?: string }
  ): Promise<{ success: boolean; data: PluginReview }> => {
    const newReview: PluginReview = {
      id: `${code}-review-${Date.now()}`,
      plugin_id: code,
      user_id: 'current-user',
      user_name: '当前用户',
      rating: data.rating,
      title: data.title,
      content: data.content,
      is_verified_purchase: true,
      is_featured: false,
      helpful_count: 0,
      created_at: new Date().toISOString(),
    };

    return delay({ success: true, data: newReview });
  },
};

export default mockMarketplaceApi;
