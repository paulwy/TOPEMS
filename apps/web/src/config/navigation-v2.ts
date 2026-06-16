import type { NavGroup, TabItem, ModuleTabsConfig } from "@/types/navigation";

/**
 * Header全局导航配置
 * 首页入口简化为唯一入口，不展开
 */
export const topNavItems: NavGroup[] = [
  { label: "首页", path: "/dashboard" }, // 唯一入口，不展开
  {
    label: "人力",
    path: "/hrm",
    isGroup: true,
    children: [
      { label: "概览", path: "/hrm" },
      {
        label: "人事管理",
        children: [
          { label: "员工列表", path: "/hrm/employees" },
          { label: "合同管理", path: "/hrm/contracts" },
        ],
      },
      {
        label: "组织管理",
        children: [
          { label: "公司管理", path: "/hrm/companies" },
          { label: "部门管理", path: "/hrm/departments" },
          { label: "岗位管理", path: "/hrm/positions" },
        ],
      },
      {
        label: "考勤管理",
        children: [
          { label: "考勤记录", path: "/hrm/attendance" },
          { label: "请假管理", path: "/hrm/leave" },
        ],
      },
      {
        label: "薪酬绩效",
        children: [
          { label: "薪酬管理", path: "/hrm/payroll" },
          { label: "绩效管理", path: "/hrm/performance" },
        ],
      },
      {
        label: "人才发展",
        children: [
          { label: "招聘管理", path: "/hrm/recruitment" },
          { label: "培训管理", path: "/hrm/training" },
        ],
      },
    ],
  },
  {
    label: "客户",
    path: "/crm",
    isGroup: true,
    children: [
      { label: "概览", path: "/crm" },
      {
        label: "客户关系",
        children: [
          { label: "客户列表", path: "/crm/customers" },
          { label: "商机列表", path: "/crm/opportunities" },
          { label: "联系人", path: "/crm/contacts" },
          { label: "交互记录", path: "/crm/interactions" },
        ],
      },
      {
        label: "销售分析",
        children: [
          { label: "客户评分", path: "/crm/scoring" },
          { label: "销售预测", path: "/crm/forecast" },
          { label: "计费管理", path: "/crm/billing" },
        ],
      },
    ],
  },
  {
    label: "项目",
    path: "/pm",
    isGroup: true,
    children: [
      { label: "概览", path: "/pm" },
      {
        label: "项目管理",
        children: [{ label: "项目列表", path: "/pm/projects" }],
      },
      {
        label: "合同与报表",
        children: [
          { label: "合同列表", path: "/pm/contracts" },
          { label: "模板库", path: "/pm/templates" },
          { label: "项目报表", path: "/pm/reports" },
        ],
      },
    ],
  },
  {
    label: "数据",
    path: "/bi",
    isGroup: true,
    children: [
      { label: "概览", path: "/bi/dashboard" },
      {
        label: "数据可视化",
        children: [
          { label: "分析仪表盘", path: "/bi/dashboard" },
          { label: "报表中心", path: "/bi/reports" },
          { label: "可视化编辑", path: "/bi/visualizations" },
        ],
      },
      {
        label: "数据管理",
        children: [
          { label: "数据源", path: "/bi/datasources" },
          { label: "对比分析", path: "/bi/comparison" },
        ],
      },
    ],
  },
  {
    label: "运营",
    path: "/assets",
    isGroup: true,
    children: [
      { label: "概览", path: "/assets" },
      {
        label: "资产设备",
        children: [
          { label: "资产台账", path: "/assets" },
          { label: "设备管理", path: "/equipment" },
        ],
      },
      {
        label: "行政综合",
        children: [
          { label: "行政管理", path: "/administration" },
          { label: "办公用品", path: "/office-supplies" },
          { label: "车辆管理", path: "/vehicles" },
          { label: "会议室", path: "/meeting-rooms" },
        ],
      },
    ],
  },
  {
    label: "工作流",
    path: "/flow",
    isGroup: true,
    children: [
      { label: "概览", path: "/flow" },
      {
        label: "流程审批",
        children: [
          { label: "审批中心", path: "/flow/approvals" },
          { label: "实例管理", path: "/flow/instances" },
          { label: "版本历史", path: "/flow/history" },
        ],
      },
      {
        label: "流程统计",
        children: [
          { label: "流程设计器", path: "/workflow-designer" },
          { label: "流程统计", path: "/flow/statistics" },
        ],
      },
    ],
  },
  {
    label: "协作",
    path: "/im",
    isGroup: true,
    children: [
      { label: "概览", path: "/im" },
      {
        label: "沟通协作",
        children: [
          { label: "即时通讯", path: "/im" },
          { label: "邮件", path: "/mail" },
          { label: "文件管理", path: "/docs" },
        ],
      },
      {
        label: "AI助手",
        children: [
          { label: "AI助手", path: "/ai" },
          { label: "知识库", path: "/knowledge-base" },
        ],
      },
    ],
  },
  {
    label: "更多",
    isGroup: true,
    children: [
      {
        label: "研发创新",
        children: [
          { label: "LIMS", path: "/lims" },
          { label: "RS研发", path: "/rs" },
          { label: "PDM", path: "/pdm" },
        ],
      },
      {
        label: "质量安全",
        children: [
          { label: "QMS", path: "/qms" },
          { label: "EHS", path: "/ehs" },
        ],
      },
      {
        label: "供应链",
        children: [{ label: "SRM", path: "/srm" }],
      },
      {
        label: "生产",
        children: [
          { label: "MES", path: "/mes" },
          { label: "SCM", path: "/scm" },
          { label: "WMS", path: "/wms" },
        ],
      },
      {
        label: "地理信息",
        children: [{ label: "GIS", path: "/gis" }],
      },
      {
        label: "系统管理",
        children: [
          { label: "概览", path: "/iam" },
          { label: "用户管理", path: "/iam/users" },
          { label: "角色管理", path: "/iam/roles" },
          { label: "权限配置", path: "/iam/permissions" },
          { label: "通知管理", path: "/notifications" },
          { label: "系统集成", path: "/integration" },
        ],
      },
      {
        label: "帮助",
        children: [
          { label: "帮助中心", path: "/help" },
        ],
      },
    ],
  },
];

/**
 * 模块Tab配置
 * 每个模块入口页展示模块Tab，用于模块内页面切换
 */
export const moduleTabsConfig: ModuleTabsConfig[] = [
  {
    module: "hrm",
    tabs: [
      { label: "概览", path: "/hrm", pinned: true },
      { label: "员工", path: "/hrm/employees" },
      { label: "部门", path: "/hrm/departments" },
      { label: "岗位", path: "/hrm/positions" },
      { label: "考勤", path: "/hrm/attendance" },
      { label: "薪酬", path: "/hrm/payroll" },
      { label: "绩效", path: "/hrm/performance" },
      { label: "招聘", path: "/hrm/recruitment" },
      { label: "培训", path: "/hrm/training" },
      { label: "合同", path: "/hrm/contracts" },
    ],
  },
  {
    module: "crm",
    tabs: [
      { label: "概览", path: "/crm/dashboard", pinned: true },
      { label: "客户", path: "/crm/customers" },
      { label: "商机", path: "/crm/opportunities" },
      { label: "联系人", path: "/crm/contacts" },
      { label: "交互", path: "/crm/interactions" },
      { label: "评分", path: "/crm/scoring" },
      { label: "预测", path: "/crm/forecast" },
      { label: "计费", path: "/crm/billing" },
    ],
  },
  {
    module: "pm",
    tabs: [
      { label: "概览", path: "/pm", pinned: true },
      { label: "项目", path: "/pm/projects" },
      { label: "合同", path: "/pm/contracts" },
      { label: "模板", path: "/pm/templates" },
      { label: "报表", path: "/pm/reports" },
    ],
  },
  {
    module: "bi",
    tabs: [
      { label: "概览", path: "/bi/dashboard", pinned: true },
      { label: "仪表盘", path: "/bi/dashboard" },
      { label: "报表", path: "/bi/reports" },
      { label: "可视化", path: "/bi/visualizations" },
      { label: "数据源", path: "/bi/datasources" },
      { label: "对比", path: "/bi/comparison" },
    ],
  },
  {
    module: "assets",
    tabs: [
      { label: "概览", path: "/assets", pinned: true },
      { label: "资产台账", path: "/assets" },
      { label: "设备管理", path: "/equipment" },
      { label: "行政管理", path: "/administration" },
      { label: "办公用品", path: "/office-supplies" },
      { label: "车辆管理", path: "/vehicles" },
      { label: "会议室", path: "/meeting-rooms" },
    ],
  },
  {
    module: "flow",
    tabs: [
      { label: "概览", path: "/flow", pinned: true },
      { label: "审批中心", path: "/flow/approvals" },
      { label: "实例管理", path: "/flow/instances" },
      { label: "版本历史", path: "/flow/history" },
      { label: "流程设计器", path: "/workflow-designer" },
      { label: "流程统计", path: "/flow/statistics" },
    ],
  },
  {
    module: "im",
    tabs: [
      { label: "概览", path: "/im", pinned: true },
      { label: "即时通讯", path: "/im" },
      { label: "邮件", path: "/mail" },
      { label: "文件管理", path: "/docs" },
      { label: "AI助手", path: "/ai" },
      { label: "知识库", path: "/knowledge-base" },
    ],
  },
  {
    module: "lims",
    tabs: [
      { label: "概览", path: "/lims", pinned: true },
      { label: "样品", path: "/lims/samples" },
      { label: "检测任务", path: "/lims/tasks" },
      { label: "流程管理", path: "/lims/processes" },
      { label: "仪器", path: "/lims/instruments" },
    ],
  },
  {
    module: "rs",
    tabs: [
      { label: "概览", path: "/rs", pinned: true },
      { label: "项目", path: "/rs/projects" },
      { label: "配方", path: "/rs/formulas" },
      { label: "材料", path: "/rs/materials" },
    ],
  },
  {
    module: "pdm",
    tabs: [
      { label: "概览", path: "/pdm", pinned: true },
      { label: "工艺管理", path: "/pdm/processes" },
      { label: "工序管理", path: "/pdm/steps" },
      { label: "配方管理", path: "/pdm/formulas" },
      { label: "批次管理", path: "/pdm/batches" },
    ],
  },
  {
    module: "qms",
    tabs: [
      { label: "概览", path: "/qms", pinned: true },
      { label: "质量审核", path: "/qms/audit" },
      { label: "质量标准", path: "/qms/standards" },
      { label: "质量检查", path: "/qms/checks" },
      { label: "不合格品", path: "/qms/issues" },
      { label: "持续改进", path: "/qms/improvements" },
    ],
  },
  {
    module: "ehs",
    tabs: [
      { label: "概览", path: "/ehs", pinned: true },
      { label: "风险评估", path: "/ehs/hazards" },
      { label: "应急预案", path: "/ehs/plans" },
      { label: "安全演练", path: "/ehs/drills" },
      { label: "安全检查", path: "/ehs/checks" },
    ],
  },
  {
    module: "srm",
    tabs: [
      { label: "概览", path: "/srm", pinned: true },
      { label: "供应商", path: "/srm/suppliers" },
      { label: "采购订单", path: "/srm/orders" },
    ],
  },
  {
    module: "mes",
    tabs: [
      { label: "概览", path: "/mes", pinned: true },
      { label: "生产订单", path: "/mes/orders" },
      { label: "工序", path: "/mes/processes" },
      { label: "工作站", path: "/mes/workstations" },
      { label: "生产记录", path: "/mes/records" },
    ],
  },
  {
    module: "scm",
    tabs: [
      { label: "概览", path: "/scm", pinned: true },
      { label: "供应商", path: "/scm/suppliers" },
      { label: "采购订单", path: "/scm/purchase-orders" },
      { label: "采购明细", path: "/scm/purchase-items" },
      { label: "评估", path: "/scm/evaluations" },
    ],
  },
  {
    module: "wms",
    tabs: [
      { label: "概览", path: "/wms", pinned: true },
      { label: "仓库", path: "/wms/warehouses" },
      { label: "库存", path: "/wms/inventory" },
      { label: "入库", path: "/wms/inbound-orders" },
      { label: "出库", path: "/wms/outbound-orders" },
    ],
  },
  {
    module: "gis",
    tabs: [
      { label: "概览", path: "/gis", pinned: true },
    ],
  },
  {
    module: "ai",
    tabs: [
      { label: "概览", path: "/ai", pinned: true },
      { label: "AI聊天", path: "/ai/chat" },
      { label: "文档生成", path: "/ai/documents" },
      { label: "文本分析", path: "/ai/analysis" },
      { label: "数据补全", path: "/ai/completion" },
      { label: "编码生成", path: "/ai/code" },
    ],
  },
  {
    module: "iam",
    tabs: [
      { label: "概览", path: "/iam", pinned: true },
      { label: "用户管理", path: "/iam/users" },
      { label: "角色管理", path: "/iam/roles" },
      { label: "权限配置", path: "/iam/permissions" },
      { label: "通知管理", path: "/notifications" },
      { label: "系统集成", path: "/integration" },
    ],
  },
];

/**
 * 根据模块名获取Tab配置
 */
export function getModuleTabs(module: string): TabItem[] {
  const config = moduleTabsConfig.find((c) => c.module === module);
  return config?.tabs || [];
}

/**
 * 根据路径获取模块名
 */
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
    assets: "assets",
    equipment: "assets",
    administration: "assets",
    "office-supplies": "assets",
    "meeting-rooms": "assets",
    vehicles: "assets",
    flow: "flow",
    "workflow-designer": "flow",
    workflows: "flow",
    im: "im",
    mail: "im",
    docs: "im",
    documents: "im",
    "document-center": "im",
    "knowledge-base": "im",
    ai: "ai",
    lims: "lims",
    rs: "rs",
    pdm: "pdm",
    qms: "qms",
    ehs: "ehs",
    srm: "srm",
    mes: "mes",
    scm: "scm",
    wms: "wms",
    gis: "gis",
    iam: "iam",
    users: "iam",
    roles: "iam",
    permissions: "iam",
    audit: "iam",
    system: "iam",
    dictionaries: "iam",
    database: "iam",
    migration: "iam",
    debug: "iam",
    notifications: "iam",
    help: "help",
    templates: "docs",
    profile: "dashboard",
    addressbook: "dashboard",
    announcements: "erp",
    budget: "erp",
    performance: "performance",
    "mobile-workstation": "mobile",
  };

  const firstSegment = pathSegments[0];
  return moduleMap[firstSegment] || firstSegment || null;
}
