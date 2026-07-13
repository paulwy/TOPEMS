export interface HelpMappingItem {
  guideId?: string;
  faqCategory?: string;
  title: string;
  description?: string;
}

export const helpMapping: Record<string, HelpMappingItem> = {
  '/hrm': {
    guideId: 'hrm-getting-started',
    faqCategory: 'hrm',
    title: '人力资源模块帮助',
    description: '员工管理、考勤、休假等HR功能使用指南',
  },
  '/hrm/employees': {
    guideId: 'hrm-employee-management',
    faqCategory: 'hrm',
    title: '员工管理帮助',
    description: '员工入职、信息维护、离职等操作指南',
  },
  '/hrm/attendance': {
    guideId: 'hrm-attendance',
    faqCategory: 'hrm',
    title: '考勤管理帮助',
    description: '打卡、排班、请假、加班等考勤功能说明',
  },
  '/hrm/leave': {
    guideId: 'hrm-leave',
    faqCategory: 'hrm',
    title: '休假管理帮助',
    description: '年假、病假、事假等各类假期申请与审批',
  },
  '/crm': {
    guideId: 'crm-getting-started',
    faqCategory: 'crm',
    title: '客户关系管理帮助',
    description: '客户、商机、联系人等CRM功能使用指南',
  },
  '/crm/customers': {
    guideId: 'crm-customer-management',
    faqCategory: 'crm',
    title: '客户管理帮助',
    description: '客户信息维护、客户分层、客户跟进等操作',
  },
  '/crm/opportunities': {
    guideId: 'crm-opportunity',
    faqCategory: 'crm',
    title: '商机管理帮助',
    description: '商机跟进、销售漏斗、商机转化等功能说明',
  },
  '/erp': {
    guideId: 'erp-getting-started',
    faqCategory: 'finance',
    title: 'ERP模块帮助',
    description: '采购、销售、库存等ERP核心功能指南',
  },
  '/erp/purchase-order': {
    guideId: 'erp-purchase',
    faqCategory: 'finance',
    title: '采购订单帮助',
    description: '采购申请、审批、下单、收货完整流程',
  },
  '/erp/sales-order': {
    guideId: 'erp-sales',
    faqCategory: 'finance',
    title: '销售订单帮助',
    description: '销售订单创建、发货、收款等操作指南',
  },
  '/erp/inventory-management': {
    guideId: 'erp-inventory',
    faqCategory: 'finance',
    title: '库存管理帮助',
    description: '库存查询、调拨、盘点等库存功能说明',
  },
  '/wms': {
    guideId: 'wms-getting-started',
    faqCategory: 'supply-chain',
    title: '仓储管理帮助',
    description: '入库、出库、库位管理等WMS功能指南',
  },
  '/wms/inventory': {
    guideId: 'wms-inventory',
    faqCategory: 'supply-chain',
    title: '库存查询帮助',
    description: '实时库存、库存预警、库存分析等功能',
  },
  '/mes': {
    guideId: 'mes-getting-started',
    faqCategory: 'manufacturing',
    title: '生产制造帮助',
    description: '生产订单、工序、设备等MES功能指南',
  },
  '/mes/production': {
    guideId: 'mes-production',
    faqCategory: 'manufacturing',
    title: '生产订单帮助',
    description: '生产订单创建、下达、报工、完工等流程',
  },
  '/finance': {
    guideId: 'finance-getting-started',
    faqCategory: 'finance',
    title: '财务管理帮助',
    description: '凭证、账簿、报表等财务功能指南',
  },
  '/finance/voucher': {
    guideId: 'finance-voucher',
    faqCategory: 'finance',
    title: '凭证管理帮助',
    description: '凭证录入、审核、记账、结账操作指南',
  },
  '/finance/report': {
    guideId: 'finance-report',
    faqCategory: 'finance',
    title: '财务报表帮助',
    description: '资产负债表、利润表、现金流量表说明',
  },
  '/pm': {
    guideId: 'pm-getting-started',
    faqCategory: 'project',
    title: '项目管理帮助',
    description: '项目创建、任务管理、进度跟踪等功能指南',
  },
  '/pm/projects': {
    guideId: 'pm-project',
    faqCategory: 'project',
    title: '项目管理帮助',
    description: '项目立项、团队配置、里程碑设置等操作',
  },
  '/pm/tasks': {
    guideId: 'pm-task',
    faqCategory: 'project',
    title: '任务管理帮助',
    description: '任务创建、分配、跟踪、完成等功能说明',
  },
  '/workflow': {
    guideId: 'workflow-getting-started',
    faqCategory: 'workflow',
    title: '工作流帮助',
    description: '流程设计、审批、委托等工作流功能指南',
  },
  '/workflow/tasks': {
    guideId: 'workflow-task',
    faqCategory: 'workflow',
    title: '审批任务帮助',
    description: '待办审批、已办审批、审批意见等操作',
  },
  '/admin': {
    guideId: 'admin-getting-started',
    faqCategory: 'system',
    title: '系统管理帮助',
    description: '系统设置、租户管理、日志审计等功能',
  },
  '/admin/tenant': {
    guideId: 'admin-tenant',
    faqCategory: 'system',
    title: '租户管理帮助',
    description: '租户创建、配置、用户管理等操作指南',
  },
  '/admin/system-settings': {
    guideId: 'admin-settings',
    faqCategory: 'system',
    title: '系统设置帮助',
    description: '基础配置、参数设置、字典管理等功能',
  },
  '/lowcode': {
    guideId: 'lowcode-getting-started',
    faqCategory: 'lowcode',
    title: '低代码平台帮助',
    description: '应用创建、页面设计、表单配置等指南',
  },
  '/ai': {
    guideId: 'ai-getting-started',
    faqCategory: 'ai',
    title: 'AI智能助手帮助',
    description: 'AI对话、文档分析、代码生成等功能指南',
  },
};

export function findHelpByPath(path: string): HelpMappingItem | undefined {
  if (helpMapping[path]) {
    return helpMapping[path];
  }

  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const parentPath = '/' + segments.join('/');
    if (helpMapping[parentPath]) {
      return helpMapping[parentPath];
    }
    segments.pop();
  }

  return undefined;
}
