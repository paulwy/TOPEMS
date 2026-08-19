import i18n from '@/i18n';

export interface HelpMappingItem {
  guideId?: string;
  faqCategory?: string;
  title: string;
  description?: string;
}

export function getHelpMapping(): Record<string, HelpMappingItem> {
  return {
  '/iam': {
    guideId: 'iam-getting-started',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.iam_0'),
    description: i18n.t('shared.help-mapping.k0'),
  },
  '/iam/users': {
    guideId: 'iam-user-management',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.k1'),
    description: i18n.t('shared.help-mapping.k2'),
  },
  '/iam/roles': {
    guideId: 'iam-role-management',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.k3'),
    description: i18n.t('shared.help-mapping.k4'),
  },
  '/iam/permissions': {
    guideId: 'iam-permission-management',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.k5'),
    description: i18n.t('shared.help-mapping.k6'),
  },
  '/iam/authentication': {
    guideId: 'iam-authentication',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.k7'),
    description: i18n.t('shared.help-mapping.k8'),
  },
  '/iam/audit': {
    guideId: 'iam-audit-log',
    faqCategory: 'iam',
    title: i18n.t('shared.help-mapping.k9'),
    description: i18n.t('shared.help-mapping.k10'),
  },

  '/workflow': {
    guideId: 'workflow-getting-started',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.workflow_1'),
    description: i18n.t('shared.help-mapping.k11'),
  },
  '/workflow/designer': {
    guideId: 'workflow-designer',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k12'),
    description: i18n.t('shared.help-mapping.k13'),
  },
  '/workflow/approvals': {
    guideId: 'workflow-approvals',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k14'),
    description: i18n.t('shared.help-mapping.k15'),
  },
  '/workflow/delegation': {
    guideId: 'workflow-delegation',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k16'),
    description: i18n.t('shared.help-mapping.k17'),
  },
  '/workflow/monitor': {
    guideId: 'workflow-monitor',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k18'),
    description: i18n.t('shared.help-mapping.k19'),
  },
  '/workflow/statistics': {
    guideId: 'workflow-statistics',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k20'),
    description: i18n.t('shared.help-mapping.k21'),
  },
  '/workflow/versions': {
    guideId: 'workflow-version-management',
    faqCategory: 'workflow',
    title: i18n.t('shared.help-mapping.k22'),
    description: i18n.t('shared.help-mapping.k23'),
  },

  '/crm': {
    guideId: 'crm-getting-started',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.crm_2'),
    description: i18n.t('shared.help-mapping.k24'),
  },
  '/crm/customers': {
    guideId: 'crm-customer-management',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.k25'),
    description: i18n.t('shared.help-mapping.k26'),
  },
  '/crm/opportunities': {
    guideId: 'crm-opportunity',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.k27'),
    description: i18n.t('shared.help-mapping.k28'),
  },
  '/crm/contacts': {
    guideId: 'crm-contact-management',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.k29'),
    description: i18n.t('shared.help-mapping.k30'),
  },
  '/crm/activities': {
    guideId: 'crm-activity-management',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.k31'),
    description: i18n.t('shared.help-mapping.k32'),
  },
  '/crm/reports': {
    guideId: 'crm-report-analysis',
    faqCategory: 'crm',
    title: i18n.t('shared.help-mapping.k33'),
    description: i18n.t('shared.help-mapping.k34'),
  },

  '/erp': {
    guideId: 'erp-getting-started',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.erp_3'),
    description: i18n.t('shared.help-mapping.k35'),
  },
  '/erp/purchase': {
    guideId: 'erp-purchase-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k36'),
    description: i18n.t('shared.help-mapping.k37'),
  },
  '/erp/sales': {
    guideId: 'erp-sales-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k38'),
    description: i18n.t('shared.help-mapping.k39'),
  },
  '/erp/finance': {
    guideId: 'erp-finance-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k40'),
    description: i18n.t('shared.help-mapping.k41'),
  },
  '/erp/budget': {
    guideId: 'erp-budget-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k42'),
    description: i18n.t('shared.help-mapping.k43'),
  },
  '/erp/cost': {
    guideId: 'erp-cost-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k44'),
    description: i18n.t('shared.help-mapping.k45'),
  },
  '/erp/assets': {
    guideId: 'erp-asset-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k46'),
    description: i18n.t('shared.help-mapping.k47'),
  },
  '/erp/tax': {
    guideId: 'erp-tax-management',
    faqCategory: 'erp',
    title: i18n.t('shared.help-mapping.k48'),
    description: i18n.t('shared.help-mapping.k49'),
  },

  '/wms': {
    guideId: 'wms-getting-started',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.wms_4'),
    description: i18n.t('shared.help-mapping.k50'),
  },
  '/wms/inbound': {
    guideId: 'wms-inbound-management',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.k51'),
    description: i18n.t('shared.help-mapping.k52'),
  },
  '/wms/outbound': {
    guideId: 'wms-outbound-management',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.k53'),
    description: i18n.t('shared.help-mapping.k54'),
  },
  '/wms/location': {
    guideId: 'wms-location-management',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.k55'),
    description: i18n.t('shared.help-mapping.k56'),
  },
  '/wms/inventory': {
    guideId: 'wms-inventory-management',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.k57'),
    description: i18n.t('shared.help-mapping.k58'),
  },
  '/wms/counting': {
    guideId: 'wms-counting-management',
    faqCategory: 'wms',
    title: i18n.t('shared.help-mapping.k59'),
    description: i18n.t('shared.help-mapping.k60'),
  },

  '/mes': {
    guideId: 'mes-getting-started',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.mes_5'),
    description: i18n.t('shared.help-mapping.k61'),
  },
  '/mes/production': {
    guideId: 'mes-production-order',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k62'),
    description: i18n.t('shared.help-mapping.k63'),
  },
  '/mes/workshop': {
    guideId: 'mes-workshop-management',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k64'),
    description: i18n.t('shared.help-mapping.k65'),
  },
  '/mes/equipment': {
    guideId: 'mes-equipment-management',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k66'),
    description: i18n.t('shared.help-mapping.k67'),
  },
  '/mes/quality': {
    guideId: 'mes-quality-management',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k68'),
    description: i18n.t('shared.help-mapping.k69'),
  },
  '/mes/scheduling': {
    guideId: 'mes-scheduling',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k70'),
    description: i18n.t('shared.help-mapping.k71'),
  },
  '/mes/analysis': {
    guideId: 'mes-production-analysis',
    faqCategory: 'mes',
    title: i18n.t('shared.help-mapping.k72'),
    description: i18n.t('shared.help-mapping.oee_73'),
  },

  '/hrm': {
    guideId: 'hrm-getting-started',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.hrm_6'),
    description: i18n.t('shared.help-mapping.k74'),
  },
  '/hrm/employees': {
    guideId: 'hrm-employee-management',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k75'),
    description: i18n.t('shared.help-mapping.k76'),
  },
  '/hrm/attendance': {
    guideId: 'hrm-attendance',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k77'),
    description: i18n.t('shared.help-mapping.k78'),
  },
  '/hrm/leave': {
    guideId: 'hrm-leave',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k79'),
    description: i18n.t('shared.help-mapping.k80'),
  },
  '/hrm/payroll': {
    guideId: 'hrm-payroll',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k81'),
    description: i18n.t('shared.help-mapping.k82'),
  },
  '/hrm/performance': {
    guideId: 'hrm-performance',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k83'),
    description: i18n.t('shared.help-mapping.k84'),
  },
  '/hrm/training': {
    guideId: 'hrm-training',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k85'),
    description: i18n.t('shared.help-mapping.k86'),
  },
  '/hrm/recruitment': {
    guideId: 'hrm-recruitment',
    faqCategory: 'hrm',
    title: i18n.t('shared.help-mapping.k87'),
    description: i18n.t('shared.help-mapping.k88'),
  },

  '/qms': {
    guideId: 'qms-getting-started',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.qms_7'),
    description: i18n.t('shared.help-mapping.k89'),
  },
  '/qms/inspection': {
    guideId: 'qms-inspection',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k90'),
    description: i18n.t('shared.help-mapping.k91'),
  },
  '/qms/nonconformance': {
    guideId: 'qms-nonconformance',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k92'),
    description: i18n.t('shared.help-mapping.k93'),
  },
  '/qms/corrective': {
    guideId: 'qms-corrective-action',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k94'),
    description: i18n.t('shared.help-mapping.k95'),
  },
  '/qms/preventive': {
    guideId: 'qms-preventive-action',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k96'),
    description: i18n.t('shared.help-mapping.k97'),
  },
  '/qms/audit': {
    guideId: 'qms-audit',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k98'),
    description: i18n.t('shared.help-mapping.k99'),
  },
  '/qms/documents': {
    guideId: 'qms-document-control',
    faqCategory: 'qms',
    title: i18n.t('shared.help-mapping.k100'),
    description: i18n.t('shared.help-mapping.k101'),
  },

  '/pm': {
    guideId: 'pm-getting-started',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.pm_8'),
    description: i18n.t('shared.help-mapping.k102'),
  },
  '/pm/projects': {
    guideId: 'pm-project-management',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.k103'),
    description: i18n.t('shared.help-mapping.k104'),
  },
  '/pm/tasks': {
    guideId: 'pm-task-management',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.k105'),
    description: i18n.t('shared.help-mapping.k106'),
  },
  '/pm/milestones': {
    guideId: 'pm-milestone-management',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.k107'),
    description: i18n.t('shared.help-mapping.k108'),
  },
  '/pm/budget': {
    guideId: 'pm-budget-management',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.k109'),
    description: i18n.t('shared.help-mapping.k110'),
  },
  '/pm/risk': {
    guideId: 'pm-risk-management',
    faqCategory: 'pm',
    title: i18n.t('shared.help-mapping.k111'),
    description: i18n.t('shared.help-mapping.k112'),
  },

  '/scm': {
    guideId: 'scm-getting-started',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.scm_9'),
    description: i18n.t('shared.help-mapping.k113'),
  },
  '/scm/suppliers': {
    guideId: 'scm-supplier-management',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.k114'),
    description: i18n.t('shared.help-mapping.k115'),
  },
  '/scm/planning': {
    guideId: 'scm-planning',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.k116'),
    description: i18n.t('shared.help-mapping.k117'),
  },
  '/scm/collaboration': {
    guideId: 'scm-collaboration',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.k118'),
    description: i18n.t('shared.help-mapping.k119'),
  },
  '/scm/logistics': {
    guideId: 'scm-logistics',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.k120'),
    description: i18n.t('shared.help-mapping.k121'),
  },
  '/scm/reports': {
    guideId: 'scm-report-analysis',
    faqCategory: 'scm',
    title: i18n.t('shared.help-mapping.k122'),
    description: i18n.t('shared.help-mapping.k123'),
  },

  '/finance': {
    guideId: 'finance-getting-started',
    faqCategory: 'finance',
    title: i18n.t('shared.help-mapping.k124'),
    description: i18n.t('shared.help-mapping.k125'),
  },
  '/finance/voucher': {
    guideId: 'finance-voucher',
    faqCategory: 'finance',
    title: i18n.t('shared.help-mapping.k126'),
    description: i18n.t('shared.help-mapping.k127'),
  },
  '/finance/report': {
    guideId: 'finance-report',
    faqCategory: 'finance',
    title: i18n.t('shared.help-mapping.k128'),
    description: i18n.t('shared.help-mapping.k129'),
  },

  '/admin': {
    guideId: 'admin-getting-started',
    faqCategory: 'system',
    title: i18n.t('shared.help-mapping.k130'),
    description: i18n.t('shared.help-mapping.k131'),
  },
  '/admin/tenant': {
    guideId: 'admin-tenant',
    faqCategory: 'system',
    title: i18n.t('shared.help-mapping.k132'),
    description: i18n.t('shared.help-mapping.k133'),
  },
  '/admin/system-settings': {
    guideId: 'admin-settings',
    faqCategory: 'system',
    title: i18n.t('shared.help-mapping.k134'),
    description: i18n.t('shared.help-mapping.k135'),
  },

  '/lowcode': {
    guideId: 'lowcode-getting-started',
    faqCategory: 'lowcode',
    title: i18n.t('shared.help-mapping.k136'),
    description: i18n.t('shared.help-mapping.k137'),
  },

  '/ai': {
    guideId: 'ai-getting-started',
    faqCategory: 'ai',
    title: i18n.t('shared.help-mapping.ai_10'),
    description: i18n.t('shared.help-mapping.ai_11'),
  },
  };
}

export function findHelpByPath(path: string): HelpMappingItem | undefined {
  if (getHelpMapping()[path]) {
    return getHelpMapping()[path];
  }

  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const parentPath = `/${segments.join('/')}`;
    if (getHelpMapping()[parentPath]) {
      return getHelpMapping()[parentPath];
    }
    segments.pop();
  }

  return undefined;
}
