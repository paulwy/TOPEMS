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

export const topNavItems: NavItem[] = [
  {
    label: "首页",
    path: "/dashboard",
    isGroup: true,
    children: [
      { label: "快捷入口", children: [
        { label: "仪表盘", path: "/dashboard" },
        { label: "最近访问", path: "/dashboard/recent" },
        { label: "快捷入口", path: "/dashboard/shortcuts" },
      ]},
      { label: "待办事项", children: [
        { label: "待审批", path: "/flow/approvals" },
        { label: "待处理", path: "/dashboard/tasks" },
        { label: "待跟进", path: "/dashboard/followups" },
      ]},
    ],
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
      { label: "考勤管理", children: [
        { label: "考勤打卡", path: "/hrm/attendance" },
        { label: "请假管理", path: "/hrm/leave" },
      ]},
      { label: "薪酬绩效", children: [
        { label: "薪酬管理", path: "/hrm/payroll" },
        { label: "绩效管理", path: "/hrm/performance" },
      ]},
      { label: "人才发展", children: [
        { label: "招聘管理", path: "/hrm/recruitment" },
        { label: "培训管理", path: "/hrm/training" },
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
        { label: "合同管理", path: "/pm/contracts" },
        { label: "模板库", path: "/pm/templates" },
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
        { label: "报表中心", path: "/bi/reports" },
        { label: "可视化编辑", path: "/bi/visualizations" },
      ]},
      { label: "数据管理", children: [
        { label: "数据源管理", path: "/bi/datasources" },
        { label: "对比分析", path: "/bi/comparison" },
      ]},
    ],
  },
  {
    label: "运营",
    path: "/assets",
    isGroup: true,
    children: [
      { label: "资产设备", children: [
        { label: "资产台账", path: "/assets" },
        { label: "设备管理", path: "/equipment" },
      ]},
      { label: "行政综合", children: [
        { label: "行政管理", path: "/administration" },
        { label: "办公用品", path: "/office-supplies" },
        { label: "车辆管理", path: "/vehicles" },
        { label: "会议室预约", path: "/meeting-rooms" },
      ]},
    ],
  },
  {
    label: "工作流",
    path: "/flow/approvals",
    isGroup: true,
    children: [
      { label: "流程审批", children: [
        { label: "审批中心", path: "/flow/approvals" },
        { label: "实例监控", path: "/flow/instances" },
        { label: "版本管理", path: "/flow/history" },
      ]},
      { label: "流程统计", children: [
        { label: "流程设计器", path: "/workflow-designer" },
        { label: "流程统计", path: "/flow/statistics" },
      ]},
    ],
  },
  {
    label: "协作",
    path: "/im",
    isGroup: true,
    children: [
      { label: "沟通协作", children: [
        { label: "即时通讯", path: "/im" },
        { label: "邮件", path: "/mail" },
        { label: "文件管理", path: "/docs" },
      ]},
      { label: "AI助手", children: [
        { label: "AI助手", path: "/ai" },
        { label: "知识库", path: "/knowledge-base" },
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
      { label: "质量安全", children: [
        { label: "QMS质量管理", path: "/qms" },
        { label: "EHS安全环保", path: "/ehs" },
      ]},
      { label: "供应链", children: [
        { label: "SRM供应商", path: "/srm" },
      ]},
      { label: "地理信息", children: [
        { label: "GIS地图", path: "/gis" },
      ]},
      { label: "系统管理", children: [
        { label: "用户管理", path: "/iam/users" },
        { label: "权限管理", path: "/iam/permissions" },
        { label: "角色管理", path: "/iam/roles" },
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

export interface TabItem {
  label: string;
  path: string;
  closable?: boolean;
  pinned?: boolean;
}

export interface ModuleTabsConfig {
  module: string;
  tabs: TabItem[];
}

export const moduleTabsConfig: ModuleTabsConfig[] = [
  {
    module: "dashboard",
    tabs: [
      { label: "仪表盘", path: "/dashboard", pinned: true },
      { label: "最近访问", path: "/dashboard/recent" },
      { label: "待办事项", path: "/dashboard/tasks" },
    ],
  },
  {
    module: "hrm",
    tabs: [
      { label: "概览", path: "/hrm", pinned: true },
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
      { label: "概览", path: "/crm", pinned: true },
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
      { label: "概览", path: "/pm", pinned: true },
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
      { label: "概览", path: "/bi/dashboard", pinned: true },
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
      { label: "费用报销", path: "/finance", pinned: true },
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
      { label: "资产管理", path: "/assets", pinned: true },
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
      { label: "审批中心", path: "/flow/approvals", pinned: true },
      { label: "实例管理", path: "/flow/instances" },
      { label: "版本历史", path: "/flow/history" },
      { label: "流程设计器", path: "/workflow-designer" },
      { label: "流程统计", path: "/flow/statistics" },
    ],
  },
  {
    module: "ai",
    tabs: [
      { label: "AI聊天", path: "/ai", pinned: true },
      { label: "文档生成", path: "/ai/documents" },
      { label: "文本分析", path: "/ai/analysis" },
      { label: "数据补全", path: "/ai/completion" },
      { label: "编码生成", path: "/ai/code" },
    ],
  },
  {
    module: "collaboration",
    tabs: [
      { label: "即时通讯", path: "/im", pinned: true },
      { label: "邮件", path: "/mail" },
      { label: "文件管理", path: "/docs" },
      { label: "知识库", path: "/knowledge-base" },
    ],
  },
  {
    module: "rd",
    tabs: [
      { label: "LIMS", path: "/lims", pinned: true },
      { label: "RS研发", path: "/rs" },
      { label: "PDM", path: "/pdm" },
    ],
  },
  {
    module: "quality",
    tabs: [
      { label: "QMS", path: "/qms", pinned: true },
      { label: "EHS", path: "/ehs" },
    ],
  },
  {
    module: "system",
    tabs: [
      { label: "用户管理", path: "/iam/users", pinned: true },
      { label: "角色管理", path: "/iam/roles" },
      { label: "权限管理", path: "/iam/permissions" },
      { label: "通知管理", path: "/notifications" },
    ],
  },
];

export function getModuleTabs(module: string): TabItem[] {
  const config = moduleTabsConfig.find((c) => c.module === module);
  return config?.tabs || [];
}

export function getModuleFromPath(path: string): string | null {
  const pathSegments = path.split("/").filter(Boolean);
  if (pathSegments.length === 0) return null;

  const moduleMap: Record<string, string> = {
    dashboard: "dashboard",
    hrm: "hrm",
    crm: "crm",
    pm: "pm",
    bi: "bi",
    finance: "finance",
    erp: "erp",
    assets: "erp",
    equipment: "erp",
    administration: "erp",
    "office-supplies": "erp",
    "meeting-rooms": "erp",
    vehicles: "erp",
    flow: "workflow",
    workflows: "workflow",
    "workflow-designer": "workflow",
    ai: "ai",
    im: "collaboration",
    mail: "collaboration",
    docs: "collaboration",
    "knowledge-base": "collaboration",
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