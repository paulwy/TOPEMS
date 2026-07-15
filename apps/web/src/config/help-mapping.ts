export interface HelpMappingItem {
  guideId?: string;
  faqCategory?: string;
  title: string;
  description?: string;
}

export const helpMapping: Record<string, HelpMappingItem> = {
  '/iam': {
    guideId: 'iam-getting-started',
    faqCategory: 'iam',
    title: 'IAM身份管理帮助',
    description: '用户管理、角色权限、认证授权等功能指南',
  },
  '/iam/users': {
    guideId: 'iam-user-management',
    faqCategory: 'iam',
    title: '用户管理帮助',
    description: '用户创建、编辑、禁用、重置密码等操作',
  },
  '/iam/roles': {
    guideId: 'iam-role-management',
    faqCategory: 'iam',
    title: '角色管理帮助',
    description: '角色创建、权限分配、角色继承等操作',
  },
  '/iam/permissions': {
    guideId: 'iam-permission-management',
    faqCategory: 'iam',
    title: '权限管理帮助',
    description: '权限点配置、权限组管理、数据权限等',
  },
  '/iam/authentication': {
    guideId: 'iam-authentication',
    faqCategory: 'iam',
    title: '认证方式帮助',
    description: '密码策略、多因素认证、单点登录配置',
  },
  '/iam/audit': {
    guideId: 'iam-audit-log',
    faqCategory: 'iam',
    title: '审计日志帮助',
    description: '操作日志查看、安全事件追踪、合规审计',
  },

  '/workflow': {
    guideId: 'workflow-getting-started',
    faqCategory: 'workflow',
    title: 'Workflow工作流帮助',
    description: '流程设计、审批流转、任务管理等功能',
  },
  '/workflow/designer': {
    guideId: 'workflow-designer',
    faqCategory: 'workflow',
    title: '流程设计器帮助',
    description: '可视化流程设计、节点配置、流程模板',
  },
  '/workflow/approvals': {
    guideId: 'workflow-approvals',
    faqCategory: 'workflow',
    title: '审批管理帮助',
    description: '审批操作、意见填写、批量审批等',
  },
  '/workflow/delegation': {
    guideId: 'workflow-delegation',
    faqCategory: 'workflow',
    title: '委托设置帮助',
    description: '审批委托、权限代理、时间范围设置',
  },
  '/workflow/monitor': {
    guideId: 'workflow-monitor',
    faqCategory: 'workflow',
    title: '流程监控帮助',
    description: '流程追踪、异常处理、超时提醒',
  },
  '/workflow/statistics': {
    guideId: 'workflow-statistics',
    faqCategory: 'workflow',
    title: '流程统计帮助',
    description: '审批效率分析、流程报表、数据导出',
  },
  '/workflow/versions': {
    guideId: 'workflow-version-management',
    faqCategory: 'workflow',
    title: '流程版本管理',
    description: '流程版本控制、回滚、发布管理',
  },

  '/crm': {
    guideId: 'crm-getting-started',
    faqCategory: 'crm',
    title: 'CRM客户管理帮助',
    description: '客户档案、商机追踪、销售管理等功能',
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
  '/crm/contacts': {
    guideId: 'crm-contact-management',
    faqCategory: 'crm',
    title: '联系人管理帮助',
    description: '联系人信息、关联客户、沟通记录等',
  },
  '/crm/activities': {
    guideId: 'crm-activity-management',
    faqCategory: 'crm',
    title: '活动管理帮助',
    description: '跟进记录、电话日志、会议安排等',
  },
  '/crm/reports': {
    guideId: 'crm-report-analysis',
    faqCategory: 'crm',
    title: '销售报表帮助',
    description: '销售漏斗分析、业绩报表、客户分析',
  },

  '/erp': {
    guideId: 'erp-getting-started',
    faqCategory: 'erp',
    title: 'ERP企业资源帮助',
    description: '财务、采购、销售、库存一体化管理',
  },
  '/erp/purchase': {
    guideId: 'erp-purchase-management',
    faqCategory: 'erp',
    title: '采购管理帮助',
    description: '采购申请、采购订单、供应商管理',
  },
  '/erp/sales': {
    guideId: 'erp-sales-management',
    faqCategory: 'erp',
    title: '销售管理帮助',
    description: '销售订单、发货管理、客户收款',
  },
  '/erp/finance': {
    guideId: 'erp-finance-management',
    faqCategory: 'erp',
    title: '财务管理帮助',
    description: '总账、应收应付、财务报表',
  },
  '/erp/budget': {
    guideId: 'erp-budget-management',
    faqCategory: 'erp',
    title: '预算管理帮助',
    description: '预算编制、预算控制、预算分析',
  },
  '/erp/cost': {
    guideId: 'erp-cost-management',
    faqCategory: 'erp',
    title: '成本管理帮助',
    description: '成本核算、成本分析、成本控制',
  },
  '/erp/assets': {
    guideId: 'erp-asset-management',
    faqCategory: 'erp',
    title: '资产管理帮助',
    description: '固定资产、折旧管理、资产盘点',
  },
  '/erp/tax': {
    guideId: 'erp-tax-management',
    faqCategory: 'erp',
    title: '税务管理帮助',
    description: '税种设置、税金计算、税务申报',
  },

  '/wms': {
    guideId: 'wms-getting-started',
    faqCategory: 'wms',
    title: 'WMS仓储管理帮助',
    description: '入库、出库、库位、盘点管理',
  },
  '/wms/inbound': {
    guideId: 'wms-inbound-management',
    faqCategory: 'wms',
    title: '入库管理帮助',
    description: '采购入库、生产入库、退货入库流程',
  },
  '/wms/outbound': {
    guideId: 'wms-outbound-management',
    faqCategory: 'wms',
    title: '出库管理帮助',
    description: '销售出库、领料出库、调拨出库流程',
  },
  '/wms/location': {
    guideId: 'wms-location-management',
    faqCategory: 'wms',
    title: '库位管理帮助',
    description: '库位编码、货位分配、库位优化',
  },
  '/wms/inventory': {
    guideId: 'wms-inventory-management',
    faqCategory: 'wms',
    title: '库存管理帮助',
    description: '库存查询、库存预警、库存调拨',
  },
  '/wms/counting': {
    guideId: 'wms-counting-management',
    faqCategory: 'wms',
    title: '盘点管理帮助',
    description: '盘点计划、盘点执行、差异处理',
  },

  '/mes': {
    guideId: 'mes-getting-started',
    faqCategory: 'mes',
    title: 'MES生产制造帮助',
    description: '生产计划、工序管理、设备监控',
  },
  '/mes/production': {
    guideId: 'mes-production-order',
    faqCategory: 'mes',
    title: '生产订单帮助',
    description: '生产订单创建、下达、报工、完工流程',
  },
  '/mes/workshop': {
    guideId: 'mes-workshop-management',
    faqCategory: 'mes',
    title: '车间管理帮助',
    description: '工序流转、工位管理、派工调度',
  },
  '/mes/equipment': {
    guideId: 'mes-equipment-management',
    faqCategory: 'mes',
    title: '设备管理帮助',
    description: '设备台账、设备维护、设备状态监控',
  },
  '/mes/quality': {
    guideId: 'mes-quality-management',
    faqCategory: 'mes',
    title: '质量检验帮助',
    description: '工序检验、成品检验、不合格品处理',
  },
  '/mes/scheduling': {
    guideId: 'mes-scheduling',
    faqCategory: 'mes',
    title: '生产调度帮助',
    description: '产能规划、生产排程、进度追踪',
  },
  '/mes/analysis': {
    guideId: 'mes-production-analysis',
    faqCategory: 'mes',
    title: '产能分析帮助',
    description: '产量统计、效率分析、OEE计算',
  },

  '/hrm': {
    guideId: 'hrm-getting-started',
    faqCategory: 'hrm',
    title: 'HRM人力资源帮助',
    description: '员工管理、考勤、薪酬、绩效等功能',
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
  '/hrm/payroll': {
    guideId: 'hrm-payroll',
    faqCategory: 'hrm',
    title: '薪酬管理帮助',
    description: '薪资核算、工资发放、社保公积金',
  },
  '/hrm/performance': {
    guideId: 'hrm-performance',
    faqCategory: 'hrm',
    title: '绩效管理帮助',
    description: '绩效目标、考核评估、绩效结果应用',
  },
  '/hrm/training': {
    guideId: 'hrm-training',
    faqCategory: 'hrm',
    title: '培训管理帮助',
    description: '培训计划、课程管理、培训记录',
  },
  '/hrm/recruitment': {
    guideId: 'hrm-recruitment',
    faqCategory: 'hrm',
    title: '招聘管理帮助',
    description: '职位发布、候选人管理、面试流程',
  },

  '/qms': {
    guideId: 'qms-getting-started',
    faqCategory: 'qms',
    title: 'QMS质量管理帮助',
    description: '质量管控、审核、不合格品处理',
  },
  '/qms/inspection': {
    guideId: 'qms-inspection',
    faqCategory: 'qms',
    title: '质量检验帮助',
    description: '检验计划、检验执行、检验记录',
  },
  '/qms/nonconformance': {
    guideId: 'qms-nonconformance',
    faqCategory: 'qms',
    title: '不合格品管理帮助',
    description: '不合格品识别、评审、处理流程',
  },
  '/qms/corrective': {
    guideId: 'qms-corrective-action',
    faqCategory: 'qms',
    title: '纠正措施帮助',
    description: '问题分析、措施制定、效果验证',
  },
  '/qms/preventive': {
    guideId: 'qms-preventive-action',
    faqCategory: 'qms',
    title: '预防措施帮助',
    description: '风险识别、预防计划、持续改进',
  },
  '/qms/audit': {
    guideId: 'qms-audit',
    faqCategory: 'qms',
    title: '审核管理帮助',
    description: '内部审核、外部审核、审核报告',
  },
  '/qms/documents': {
    guideId: 'qms-document-control',
    faqCategory: 'qms',
    title: '文档控制帮助',
    description: '质量文档、版本管理、审批发布',
  },

  '/pm': {
    guideId: 'pm-getting-started',
    faqCategory: 'pm',
    title: 'PM项目管理帮助',
    description: '项目立项、任务分配、进度跟踪',
  },
  '/pm/projects': {
    guideId: 'pm-project-management',
    faqCategory: 'pm',
    title: '项目管理帮助',
    description: '项目创建、规划、执行、监控、收尾',
  },
  '/pm/tasks': {
    guideId: 'pm-task-management',
    faqCategory: 'pm',
    title: '任务管理帮助',
    description: '任务创建、分配、跟踪、完成等功能',
  },
  '/pm/milestones': {
    guideId: 'pm-milestone-management',
    faqCategory: 'pm',
    title: '里程碑管理帮助',
    description: '里程碑设置、进度追踪、里程碑变更',
  },
  '/pm/budget': {
    guideId: 'pm-budget-management',
    faqCategory: 'pm',
    title: '项目预算帮助',
    description: '预算编制、成本控制、预算分析',
  },
  '/pm/risk': {
    guideId: 'pm-risk-management',
    faqCategory: 'pm',
    title: '风险管理帮助',
    description: '风险识别、评估、应对措施',
  },

  '/scm': {
    guideId: 'scm-getting-started',
    faqCategory: 'scm',
    title: 'SCM供应链帮助',
    description: '供应商、采购、物流协同管理',
  },
  '/scm/suppliers': {
    guideId: 'scm-supplier-management',
    faqCategory: 'scm',
    title: '供应商管理帮助',
    description: '供应商档案、评估、绩效、准入',
  },
  '/scm/planning': {
    guideId: 'scm-planning',
    faqCategory: 'scm',
    title: '采购计划帮助',
    description: '需求预测、采购计划、库存策略',
  },
  '/scm/collaboration': {
    guideId: 'scm-collaboration',
    faqCategory: 'scm',
    title: '订单协同帮助',
    description: '供应商协同、订单确认、发货通知',
  },
  '/scm/logistics': {
    guideId: 'scm-logistics',
    faqCategory: 'scm',
    title: '物流追踪帮助',
    description: '运输管理、配送跟踪、签收确认',
  },
  '/scm/reports': {
    guideId: 'scm-report-analysis',
    faqCategory: 'scm',
    title: '供应链报表帮助',
    description: '供应商绩效、采购分析、交付统计',
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
    const parentPath = `/${segments.join('/')}`;
    if (helpMapping[parentPath]) {
      return helpMapping[parentPath];
    }
    segments.pop();
  }

  return undefined;
}
