const mockPlugins = [
  {
    id: '1',
    code: 'hrm',
    name: '人力资源管理',
    description: '完整的人力资源管理解决方案，包括员工管理、考勤、休假、合同管理等功能',
    version: '2.0.0',
    plugin_type: 'business',
    is_published: true,
    category: 'hr',
    is_free: true,
    install_count: 1234,
    rating: 4.8,
    rating_count: 234,
    author_name: 'TOPEMS',
    is_featured: true,
    tags: ['人力资源', '员工管理', '考勤', '招聘'],
  },
  {
    id: '2',
    code: 'crm',
    name: '客户关系管理',
    description: '全面的客户关系管理系统，支持客户管理、商机跟踪、销售自动化',
    version: '1.5.0',
    plugin_type: 'business',
    is_published: true,
    category: 'sales',
    is_free: true,
    install_count: 892,
    rating: 4.6,
    rating_count: 156,
    author_name: 'TOPEMS',
    is_featured: true,
    tags: ['客户', '销售', '商机', '营销'],
  },
  {
    id: '3',
    code: 'erp',
    name: '企业资源计划',
    description: '集成化企业资源计划系统，覆盖采购、销售、库存、财务等核心业务',
    version: '3.1.0',
    plugin_type: 'business',
    is_published: true,
    category: 'finance',
    is_free: false,
    price_cents: 99900,
    install_count: 567,
    rating: 4.9,
    rating_count: 89,
    author_name: 'TOPEMS',
    is_featured: true,
    tags: ['财务', '采购', '销售', '库存'],
  },
  {
    id: '4',
    code: 'wms',
    name: '仓储管理系统',
    description: '智能仓储管理系统，支持入库、出库、库存盘点、仓库规划',
    version: '2.2.0',
    plugin_type: 'business',
    is_published: true,
    category: 'logistics',
    is_free: false,
    price_cents: 49900,
    install_count: 432,
    rating: 4.7,
    rating_count: 67,
    author_name: 'TOPEMS',
    is_featured: false,
    tags: ['仓库', '库存', '物流', '仓储'],
  },
  {
    id: '5',
    code: 'mes',
    name: '生产制造执行',
    description: '制造执行系统，支持生产计划、工单管理、质量追溯、设备管理',
    version: '2.3.0',
    plugin_type: 'business',
    is_published: true,
    category: 'manufacturing',
    is_free: false,
    price_cents: 79900,
    install_count: 345,
    rating: 4.5,
    rating_count: 45,
    author_name: 'TOPEMS',
    is_featured: false,
    tags: ['生产', '制造', '工单', '质量'],
  },
  {
    id: '6',
    code: 'ai',
    name: '智能助手',
    description: 'AI驱动的智能助手，支持智能问答、文档生成、数据分析',
    version: '1.2.0',
    plugin_type: 'plugin',
    is_published: true,
    category: 'ai',
    is_free: true,
    install_count: 2100,
    rating: 4.9,
    rating_count: 345,
    author_name: 'TOPEMS',
    is_featured: true,
    tags: ['AI', '智能', 'GPT', '自动化'],
  },
  {
    id: '7',
    code: 'bi',
    name: '商业智能',
    description: '强大的商业智能分析平台，支持多维分析、可视化报表、数据挖掘',
    version: '1.8.0',
    plugin_type: 'plugin',
    is_published: true,
    category: 'analytics',
    is_free: false,
    price_cents: 129900,
    install_count: 234,
    rating: 4.8,
    rating_count: 34,
    author_name: 'TOPEMS',
    is_featured: false,
    tags: ['BI', '报表', '分析', '数据'],
  },
  {
    id: '8',
    code: 'mobile',
    name: '移动端',
    description: '企业移动办公解决方案，支持iOS和Android平台',
    version: '1.5.0',
    plugin_type: 'plugin',
    is_published: true,
    category: 'mobile',
    is_free: true,
    install_count: 1567,
    rating: 4.4,
    rating_count: 123,
    author_name: 'TOPEMS',
    is_featured: false,
    tags: ['移动', '手机', 'iOS', 'Android'],
  },
];

const mockInstalledPlugins = [
  {
    id: '1',
    tenant_id: 'tenant_001',
    plugin_id: 'hrm',
    installed_version: '1.8.0',
    isactive: true,
    license_type: 'free',
    activated_at: '2024-01-15T10:00:00Z',
    last_used_at: '2024-07-10T14:30:00Z',
    usage_count: 12345,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-07-10T14:30:00Z',
    plugin_code: 'hrm',
    plugin_name: '人力资源管理',
    plugin_description: '完整的人力资源管理解决方案',
    plugin_version: '1.8.0',
    plugin_category: 'hr',
    runtime_status: 'running',
    runtime_url: '/hrm',
    last_heartbeat: '2024-07-13T10:00:00Z',
  },
  {
    id: '2',
    tenant_id: 'tenant_001',
    plugin_id: 'crm',
    installed_version: '1.5.0',
    isactive: true,
    license_type: 'free',
    activated_at: '2024-02-20T09:00:00Z',
    last_used_at: '2024-07-12T16:45:00Z',
    usage_count: 8765,
    created_at: '2024-02-20T09:00:00Z',
    updated_at: '2024-07-12T16:45:00Z',
    plugin_code: 'crm',
    plugin_name: '客户关系管理',
    plugin_description: '全面的客户关系管理系统',
    plugin_version: '1.5.0',
    plugin_category: 'sales',
    runtime_status: 'running',
    runtime_url: '/crm',
    last_heartbeat: '2024-07-13T10:00:00Z',
  },
  {
    id: '3',
    tenant_id: 'tenant_001',
    plugin_id: 'erp',
    installed_version: '2.9.0',
    isactive: true,
    license_type: 'paid',
    license_expires_at: '2025-01-15T00:00:00Z',
    activated_at: '2024-01-15T11:00:00Z',
    last_used_at: '2024-07-13T09:00:00Z',
    usage_count: 23456,
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-07-13T09:00:00Z',
    plugin_code: 'erp',
    plugin_name: '企业资源计划',
    plugin_description: '集成化企业资源计划系统',
    plugin_version: '2.9.0',
    plugin_category: 'finance',
    runtime_status: 'running',
    runtime_url: '/erp',
    last_heartbeat: '2024-07-13T10:00:00Z',
  },
  {
    id: '4',
    tenant_id: 'tenant_001',
    plugin_id: 'ai',
    installed_version: '1.0.0',
    isactive: false,
    license_type: 'free',
    activated_at: '2024-03-10T14:00:00Z',
    last_used_at: '2024-06-01T10:00:00Z',
    usage_count: 3456,
    created_at: '2024-03-10T14:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    plugin_code: 'ai',
    plugin_name: '智能助手',
    plugin_description: 'AI驱动的智能助手',
    plugin_version: '1.0.0',
    plugin_category: 'ai',
    runtime_status: 'stopped',
    runtime_url: '/ai',
    last_heartbeat: '2024-06-01T10:00:00Z',
  },
];

const mockPluginVersions = {
  hrm: [
    {
      id: 'v1',
      plugin_id: '1',
      version: '2.0.0',
      release_notes: '优化员工管理界面，新增考勤统计报表，修复若干bug',
      is_stable: true,
      is_latest: true,
      download_url: 'http://localhost:8000/plugins/hrm/2.0.0.zip',
      filesize: 10240000,
      min_app_version: '5.0.0',
      created_at: '2024-07-01T00:00:00Z',
    },
    {
      id: 'v2',
      plugin_id: '1',
      version: '1.9.0',
      release_notes: '新增员工自助服务功能，优化移动端适配',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/hrm/1.9.0.zip',
      filesize: 8192000,
      min_app_version: '5.0.0',
      created_at: '2024-06-01T00:00:00Z',
    },
    {
      id: 'v3',
      plugin_id: '1',
      version: '1.8.0',
      release_notes: '初始版本发布',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/hrm/1.8.0.zip',
      filesize: 7168000,
      min_app_version: '5.0.0',
      created_at: '2024-01-15T00:00:00Z',
    },
  ],
  erp: [
    {
      id: 'e1',
      plugin_id: '3',
      version: '3.1.0',
      release_notes: '新增财务报表功能，优化采购流程，性能提升30%',
      is_stable: true,
      is_latest: true,
      download_url: 'http://localhost:8000/plugins/erp/3.1.0.zip',
      filesize: 25600000,
      min_app_version: '5.5.0',
      created_at: '2024-07-05T00:00:00Z',
    },
    {
      id: 'e2',
      plugin_id: '3',
      version: '3.0.0',
      release_notes: '重构核心架构，支持多租户部署',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/erp/3.0.0.zip',
      filesize: 23552000,
      min_app_version: '5.5.0',
      created_at: '2024-05-01T00:00:00Z',
    },
    {
      id: 'e3',
      plugin_id: '3',
      version: '2.9.0',
      release_notes: '优化库存管理模块',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/erp/2.9.0.zip',
      filesize: 20480000,
      min_app_version: '5.0.0',
      created_at: '2024-01-15T00:00:00Z',
    },
  ],
  ai: [
    {
      id: 'a1',
      plugin_id: '6',
      version: '1.2.0',
      release_notes: '集成GPT-4支持，新增文档总结功能，优化对话体验',
      is_stable: true,
      is_latest: true,
      download_url: 'http://localhost:8000/plugins/ai/1.2.0.zip',
      filesize: 5120000,
      min_app_version: '5.0.0',
      created_at: '2024-06-20T00:00:00Z',
    },
    {
      id: 'a2',
      plugin_id: '6',
      version: '1.1.0',
      release_notes: '优化问答引擎，支持多轮对话',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/ai/1.1.0.zip',
      filesize: 4096000,
      min_app_version: '5.0.0',
      created_at: '2024-04-01T00:00:00Z',
    },
    {
      id: 'a3',
      plugin_id: '6',
      version: '1.0.0',
      release_notes: '初始版本发布',
      is_stable: true,
      is_latest: false,
      download_url: 'http://localhost:8000/plugins/ai/1.0.0.zip',
      filesize: 3072000,
      min_app_version: '5.0.0',
      created_at: '2024-03-10T00:00:00Z',
    },
  ],
};

const mockCategories = [
  { id: '1', name: '人力资源', code: 'hr', description: '人力资源相关插件', plugin_count: 1 },
  { id: '2', name: '销售', code: 'sales', description: '销售管理相关插件', plugin_count: 1 },
  { id: '3', name: '财务', code: 'finance', description: '财务管理相关插件', plugin_count: 1 },
  { id: '4', name: '物流', code: 'logistics', description: '物流仓储相关插件', plugin_count: 1 },
  { id: '5', name: '制造', code: 'manufacturing', description: '生产制造相关插件', plugin_count: 1 },
  { id: '6', name: 'AI', code: 'ai', description: '人工智能相关插件', plugin_count: 1 },
  { id: '7', name: '分析', code: 'analytics', description: '数据分析相关插件', plugin_count: 1 },
  { id: '8', name: '移动', code: 'mobile', description: '移动应用相关插件', plugin_count: 1 },
];

const pluginMock = {
  plugins: mockPlugins,
  installedPlugins: mockInstalledPlugins,
  pluginVersions: mockPluginVersions,
  categories: mockCategories,

  getMarketplacePlugins: () => mockPlugins,

  getInstalledPlugins: () => mockInstalledPlugins,

  getPluginVersions: (code) => mockPluginVersions[code] || [],

  getCategories: () => mockCategories,

  getMarketplaceSummary: () => ({
    total_plugins: mockPlugins.length,
    categories: mockCategories,
    featured_plugins: mockPlugins.filter(p => p.is_featured),
    new_plugins: mockPlugins.slice(0, 3),
    top_rated: [...mockPlugins].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3),
  }),

  getPluginListResponse: () => ({
    plugins: mockPlugins,
    total: mockPlugins.length,
    page: 1,
    pagesize: 20,
    total_pages: 1,
  }),

  getPlugin: (code) => mockPlugins.find(p => p.code === code),

  getInstalledPlugin: (code) => mockInstalledPlugins.find(p => p.plugin_code === code),

  installPlugin: (code) => {
    const plugin = mockPlugins.find(p => p.code === code);
    if (!plugin) return null;

    const existing = mockInstalledPlugins.find(p => p.plugin_code === code);
    if (existing) return existing;

    const newPlugin = {
      id: `new_${code}`,
      tenant_id: 'tenant_001',
      plugin_id: code,
      installed_version: plugin.version,
      isactive: true,
      license_type: plugin.is_free ? 'free' : 'trial',
      activated_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plugin_code: plugin.code,
      plugin_name: plugin.name,
      plugin_description: plugin.description,
      plugin_version: plugin.version,
      plugin_category: plugin.category,
      runtime_status: 'running',
      runtime_url: `/${code}`,
      last_heartbeat: new Date().toISOString(),
    };

    mockInstalledPlugins.push(newPlugin);
    return newPlugin;
  },

  uninstallPlugin: (code, tier = 'uninstall') => {
    const index = mockInstalledPlugins.findIndex(p => p.plugin_code === code);
    if (index === -1) return false;

    switch (tier) {
      case 'disable':
        mockInstalledPlugins[index].isactive = false;
        mockInstalledPlugins[index].runtime_status = 'stopped';
        break;
      case 'uninstall':
        mockInstalledPlugins.splice(index, 1);
        break;
      case 'delete':
        mockInstalledPlugins.splice(index, 1);
        break;
    }
    return true;
  },

  enablePlugin: (code) => {
    const plugin = mockInstalledPlugins.find(p => p.plugin_code === code);
    if (!plugin) return null;
    plugin.isactive = true;
    plugin.runtime_status = 'running';
    plugin.activated_at = new Date().toISOString();
    return plugin;
  },

  disablePlugin: (code) => {
    const plugin = mockInstalledPlugins.find(p => p.plugin_code === code);
    if (!plugin) return null;
    plugin.isactive = false;
    plugin.runtime_status = 'stopped';
    return plugin;
  },

  upgradePlugin: (code, version) => {
    const plugin = mockInstalledPlugins.find(p => p.plugin_code === code);
    if (!plugin) return null;

    const versions = mockPluginVersions[code];
    if (!versions) return null;

    const targetVersion = version
      ? versions.find(v => v.version === version)
      : versions.find(v => v.is_latest);

    if (!targetVersion) return null;

    plugin.installed_version = targetVersion.version;
    plugin.plugin_version = targetVersion.version;
    plugin.updated_at = new Date().toISOString();
    plugin.last_heartbeat = new Date().toISOString();

    return plugin;
  },
};

module.exports = pluginMock;
