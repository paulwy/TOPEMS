import { apiClient } from '../client';
import type { ApiResponse } from '../client';

import { projectApi, phaseApi, milestoneApi, approvalApi } from './project';
import { memberApi } from './team';
import { resourceApi, expenseApi } from './resource';
import { benefitApi } from './benefit';
import {
  contractApi,
  contractMilestoneApi,
  contractPaymentApi,
  projectContractApi,
  contractTemplateApi,
} from './contract';
import { budgetApi, budgetItemApi } from './budget';
import { riskApi, riskEventApi } from './risk';
import { qualityCheckApi, defectApi } from './quality';
import { acceptancePlanApi, acceptanceItemApi, acceptanceRecordApi } from './acceptance';
import { settlementApi, settlementItemApi, settlementAdjustmentApi } from './settlement';
import { documentApi, documentVersionApi, documentFolderApi } from './document';
import { reportApi, reportTemplateApi } from './report';
import { notificationApi, notificationSettingApi, notificationTypeApi } from './notification';
import { dashboardApi } from './dashboard';

export * from './types';

export { projectApi, phaseApi, milestoneApi, approvalApi } from './project';
export { memberApi } from './team';
export { resourceApi, expenseApi } from './resource';
export { benefitApi } from './benefit';
export {
  contractApi,
  contractMilestoneApi,
  contractPaymentApi,
  projectContractApi,
  contractTemplateApi,
} from './contract';
export { budgetApi, budgetItemApi } from './budget';
export { riskApi, riskEventApi } from './risk';
export { qualityCheckApi, defectApi } from './quality';
export { acceptancePlanApi, acceptanceItemApi, acceptanceRecordApi } from './acceptance';
export { settlementApi, settlementItemApi, settlementAdjustmentApi } from './settlement';
export { documentApi, documentVersionApi, documentFolderApi } from './document';
export { reportApi, reportTemplateApi } from './report';
export { notificationApi, notificationSettingApi, notificationTypeApi } from './notification';
export { dashboardApi } from './dashboard';

export const pmApi = {
  projects: projectApi,
  phases: phaseApi,
  milestones: milestoneApi,
  members: memberApi,
  resources: resourceApi,
  expenses: expenseApi,
  benefits: benefitApi,
  approval: approvalApi,
  contracts: {
    ...contractApi,
    milestones: contractMilestoneApi,
    payments: contractPaymentApi,
    projectContracts: projectContractApi,
  },
  contractTemplates: contractTemplateApi,
  budgets: {
    ...budgetApi,
    items: budgetItemApi,
  },
  risks: {
    ...riskApi,
    events: riskEventApi,
  },
  quality: {
    checks: qualityCheckApi,
    defects: defectApi,
  },
  acceptance: {
    plans: acceptancePlanApi,
    items: acceptanceItemApi,
    records: acceptanceRecordApi,
  },
  settlement: {
    ...settlementApi,
    items: settlementItemApi,
    adjustments: settlementAdjustmentApi,
  },
  document: {
    ...documentApi,
    versions: documentVersionApi,
    folders: documentFolderApi,
  },
  report: {
    ...reportApi,
    templates: reportTemplateApi,
  },
  notification: {
    ...notificationApi,
    settings: notificationSettingApi,
    types: notificationTypeApi,
  },

  getStatistics: dashboardApi.getStatistics,
};

export default pmApi;
