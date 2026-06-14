// 导航配置
// TOPEMS 全局导航菜单配置

export interface NavMenuItem {
  label: string;
  path?: string;
}

export interface NavItem {
  label: string;
  path?: string;
  icon?: string;
  children?: NavMenuItem[] | NavItem[];
  badge?: string | number;
  isGroup?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

// 顶部导航配置
export const topNavItems: NavItem[] = [
  {
    label: "首页",
    path: "/dashboard",
  },
  {
    label: "人力",
    path: "/hrm/employees",
    isGroup: true,
    children: [
      { label: "人事管理", children: [
        { label: "员工管理", path: "/hrm/employees" },
        { label: "部门管理", path: "/hrm/departments" },
        { label: "岗位管理", path: "/hrm/positions" },
        { label: "公司管理", path: "/hrm/companies" },
      ]},
      { label: "考勤与薪酬", children: [
        { label: "考勤管理", path: "/hrm/attendance" },
        { label: "请假管理", path: "/hrm/leave" },
        { label: "薪酬管理", path: "/hrm/payroll" },
      ]},
      { label: "人才发展", children: [
        { label: "招聘管理", path: "/hrm/recruitment" },
        { label: "培训管理", path: "/hrm/training" },
        { label: "绩效管理", path: "/hrm/performance" },
        { label: "合同管理", path: "/hrm/contracts" },
      ]},
    ],
  },
  {
    label: "客户",
    path: "/crm/customers",
    isGroup: true,
    children: [
      { label: "客户关系", children: [
        { label: "客户管理", path: "/crm/customers" },
        { label: "商机管理", path: "/crm/opportunities" },
        { label: "联系人管理", path: "/crm/contacts" },
        { label: "交互记录", path: "/crm/interactions" },
      ]},
      { label: "销售分析", children: [
        { label: "客户评分", path: "/crm/scoring" },
        { label: "销售预测", path: "/crm/forecast" },
      ]},
    ],
  },
  {
    label: "项目",
    path: "/pm/projects",
    isGroup: true,
    children: [
      { label: "项目管理", children: [
        { label: "项目列表", path: "/pm/projects" },
        { label: "新建项目", path: "/pm/projects/create" },
      ]},
      { label: "合同与报表", children: [
        { label: "合同列表", path: "/pm/contracts" },
        { label: "项目模板", path: "/pm/templates" },
        { label: "项目报表", path: "/pm/reports" },
      ]},
    ],
  },
  {
    label: "数据",
    path: "/bi/dashboard",
    isGroup: true,
    children: [
      { label: "数据可视化", children: [
        { label: "分析仪表盘", path: "/bi/dashboard" },
        { label: "数据报表", path: "/bi/reports" },
        { label: "可视化编辑", path: "/bi/visualizations" },
      ]},
      { label: "数据管理", children: [
        { label: "数据源管理", path: "/bi/datasources" },
        { label: "对比分析", path: "/bi/comparison" },
      ]},
    ],
  },
  {
    label: "财务",
    path: "/finance",
    isGroup: true,
    children: [
      { label: "财务会计", children: [
        { label: "费用报销", path: "/finance" },
        { label: "凭证管理", path: "/finance/vouchers" },
        { label: "应收应付", path: "/finance/receivable-payable" },
      ]},
      { label: "报表与分析", children: [
        { label: "财务报表", path: "/finance/reports" },
        { label: "预算管理", path: "/finance/budget" },
        { label: "财务分析", path: "/bi/analytics" },
      ]},
      { label: "资产与结构", children: [
        { label: "固定资产", path: "/finance/fixed-assets" },
        { label: "银行账户", path: "/finance/bank-accounts" },
        { label: "公司结构", path: "/finance/company-structure" },
      ]},
    ],
  },
  {
    label: "运营",
    path: "/assets",
    isGroup: true,
    children: [
      { label: "资产设备", children: [
        { label: "资产管理", path: "/assets" },
        { label: "设备管理", path: "/equipment" },
      ]},
      { label: "行政后勤", children: [
        { label: "行政管理", path: "/administration" },
        { label: "办公用品", path: "/office-supplies" },
        { label: "会议室预约", path: "/meeting-rooms" },
        { label: "车辆管理", path: "/vehicles" },
      ]},
    ],
  },
  {
    label: "工作流",
    path: "/workflows",
    isGroup: true,
    children: [
      { label: "流程审批", children: [
        { label: "审批中心", path: "/flow/approvals" },
        { label: "实例管理", path: "/flow/instances" },
        { label: "版本历史", path: "/flow/history" },
      ]},
      { label: "设计与统计", children: [
        { label: "流程设计器", path: "/workflow-designer" },
        { label: "流程统计", path: "/flow/statistics" },
      ]},
    ],
  },
  {
    label: "协作",
    path: "/docs",
    isGroup: true,
    children: [
      { label: "沟通与消息", children: [
        { label: "即时通讯", path: "/im" },
        { label: "邮件", path: "/mail" },
        { label: "文件管理", path: "/docs" },
      ]},
      { label: "智能助手", children: [
        { label: "AI助手", path: "/ai" },
        { label: "通知中心", path: "/flow/notifications" },
      ]},
    ],
  },
  {
    label: "更多",
    isGroup: true,
    children: [
      { label: "研发创新", children: [
        { label: "LIMS实验室", path: "/lims" },
        { label: "RS研发", path: "/rs" },
        { label: "PDM产品数据", path: "/pdm" },
      ]},
      { label: "质量与安全", children: [
        { label: "QMS质量管理", path: "/qms" },
        { label: "EHS安全环保", path: "/ehs" },
      ]},
      { label: "供应链", children: [
        { label: "SRM供应商", path: "/srm" },
      ]},
      { label: "地理信息", children: [
        { label: "GIS地图", path: "/gis" },
      ]},
      { label: "系统与支持", children: [
        { label: "用户与权限", path: "/iam/users" },
        { label: "通知管理", path: "/notifications" },
        { label: "外部ERP集成", path: "/integration" },
      ]},
      { label: "帮助", children: [
        { label: "帮助中心", path: "/help" },
        { label: "使用文档", path: "/docs/guide" },
      ]},
    ],
  },
];

// Tab配置
export interface TabItem {
  label: string;
  path: string;
  closable?: boolean;
}

export interface ModuleTabsConfig {
  module: string;
  tabs: TabItem[];
}

// 模块Tab配置
export const moduleTabsConfig: ModuleTabsConfig[] = [
  {
    module: "hrm",
    tabs: [
      { label: "概览", path: "/hrm" },
      { label: "员工管理", path: "/hrm/employees" },
      { label: "部门管理", path: "/hrm/departments" },
      { label: "岗位管理", path: "/hrm/positions" },
      { label: "考勤管理", path: "/hrm/attendance" },
      { label: "请假管理", path: "/hrm/leave" },
      { label: "薪酬管理", path: "/hrm/payroll" },
      { label: "绩效管理", path: "/hrm/performance" },
      { label: "招聘管理", path: "/hrm/recruitment" },
      { label: "培训管理", path: "/hrm/training" },
      { label: "合同管理", path: "/hrm/contracts" },
    ],
  },
  {
    module: "crm",
    tabs: [
      { label: "概览", path: "/crm" },
      { label: "客户管理", path: "/crm/customers" },
      { label: "商机管理", path: "/crm/opportunities" },
      { label: "联系人", path: "/crm/contacts" },
      { label: "交互记录", path: "/crm/interactions" },
      { label: "客户评分", path: "/crm/scoring" },
      { label: "销售预测", path: "/crm/forecast" },
    ],
  },
  {
    module: "pm",
    tabs: [
      { label: "概览", path: "/pm" },
      { label: "项目列表", path: "/pm/projects" },
      { label: "新建项目", path: "/pm/projects/create" },
      { label: "合同列表", path: "/pm/contracts" },
      { label: "项目模板", path: "/pm/templates" },
      { label: "项目报表", path: "/pm/reports" },
    ],
  },
  {
    module: "bi",
    tabs: [
      { label: "概览", path: "/bi/dashboard" },
      { label: "分析仪表盘", path: "/bi/dashboard" },
      { label: "数据报表", path: "/bi/reports" },
      { label: "可视化编辑", path: "/bi/visualizations" },
      { label: "数据源", path: "/bi/datasources" },
      { label: "对比分析", path: "/bi/comparison" },
    ],
  },
  {
    module: "finance",
    tabs: [
      { label: "费用报销", path: "/finance" },
      { label: "凭证管理", path: "/finance/vouchers" },
      { label: "应收应付", path: "/finance/receivable-payable" },
      { label: "财务报表", path: "/finance/reports" },
      { label: "预算管理", path: "/finance/budget" },
      { label: "固定资产", path: "/finance/fixed-assets" },
      { label: "银行账户", path: "/finance/bank-accounts" },
    ],
  },
  {
    module: "erp",
    tabs: [
      { label: "资产管理", path: "/assets" },
      { label: "设备管理", path: "/equipment" },
      { label: "行政管理", path: "/administration" },
      { label: "办公用品", path: "/office-supplies" },
      { label: "会议室预约", path: "/meeting-rooms" },
      { label: "车辆管理", path: "/vehicles" },
    ],
  },
  {
    module: "workflow",
    tabs: [
      { label: "概览", path: "/workflows" },
      { label: "审批中心", path: "/flow/approvals" },
      { label: "实例管理", path: "/flow/instances" },
      { label: "版本历史", path: "/flow/history" },
      { label: "流程设计器", path: "/workflow-designer" },
      { label: "流程统计", path: "/flow/statistics" },
    ],
  },
  {
    module: "ai",
    tabs: [
      { label: "概览", path: "/ai" },
      { label: "AI聊天", path: "/ai" },
      { label: "文档生成", path: "/ai" },
      { label: "文本分析", path: "/ai" },
    ],
  },
  {
    module: "docs",
    tabs: [
      { label: "概览", path: "/docs" },
      { label: "文件管理", path: "/docs" },
      { label: "文档中心", path: "/docs" },
    ],
  },
];

// 获取模块Tab
export function getModuleTabs(module: string): TabItem[] {
  const config = moduleTabsConfig.find((c) => c.module === module);
  return config?.tabs || [];
}

// 判断路径属于哪个模块
export function getModuleFromPath(path: string): string | null {
  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.length === 0) return null;

  // 直接匹配常见模块
  const moduleMap: Record<string, string> = {
    hrm: "hrm",
    crm: "crm",
    pm: "pm",
    bi: "bi",
    erp: "erp",
    workflow: "workflow",
    ai: "ai",
    im: "collaboration",
    mail: "collaboration",
    docs: "collaboration",
    lims: "rd",
    rs: "rd",
    pdm: "rd",
    qms: "quality",
    ehs: "quality",
    srm: "supply",
    gis: "gis",
    iam: "system",
    notifications: "system",
    integration: "system",
    help: "help",
  };

  const firstSegment = pathSegments[0];
  return moduleMap[firstSegment] || firstSegment || null;
}
