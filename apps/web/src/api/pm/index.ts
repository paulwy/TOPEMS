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
import { pmStatisticsApi } from './statistics';

export * from './types';

export { projectApi, approvalApi } from './project';
export { expenseApi } from './resource';
export { benefitApi } from './benefit';
export { pmAnalyticsApi } from './analytics';
export * from './analytics';
export {
  contractApi,
  contractMilestoneApi,
  contractPaymentApi,
  projectContractApi,
  contractTemplateApi,
} from './contract';
export { budgetApi, budgetItemApi } from './budget';
export { riskApi } from './risk';
export { acceptancePlanApi, acceptanceItemApi, acceptanceRecordApi } from './acceptance';
export { documentApi, documentVersionApi, documentFolderApi } from './document';
export { reportApi } from './report';
export { notificationApi } from './notification';
export { dashboardApi } from './dashboard';
export { pmStatisticsApi } from './statistics';

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

  statistics: pmStatisticsApi,
};

export default pmApi;
