import apiClient from '../client';
import type { ApiResponse } from '../client';

import { hrmDashboardApi } from './dashboard';
import { companyApi } from './company';
import { departmentApi } from './department';
import { employeeApi, roleApi, positionApi, employeePerformanceApi } from './employee';
import { attendanceApi } from './attendance';
import { leaveApi } from './leave';
import { jobOpeningApi, candidateApi, interviewApi } from './recruitment';
import { payrollApi, payrollItemApi, salaryAdjustmentApi } from './payroll';
import { performanceReviewApi, performanceGoalApi } from './performance';
import { contractApi, contractRenewalApi } from './contract';
import { trainingPlanApi, trainingCourseApi, trainingRecordApi } from './training';
import { hrmReportsApi } from './hrmReports';
import { hrmAuditApi } from './hrmAudit';
import { hrmSetupApi } from './hrmSetup';

export * from './types';

export { companyApi } from './company';
export { hrmDashboardApi } from './dashboard';
export { departmentApi } from './department';
export { employeeApi, roleApi, positionApi, employeePerformanceApi } from './employee';
export { attendanceApi } from './attendance';
export { leaveApi } from './leave';
export { payrollApi, salaryAdjustmentApi } from './payroll';
export { performanceReviewApi } from './performance';
export { contractApi, contractRenewalApi } from './contract';
export { trainingCourseApi } from './training';
export { hrmReportsApi } from './hrmReports';
export { hrmAuditApi } from './hrmAudit';
export { hrmSetupApi } from './hrmSetup';

export const hrmApi = {
  dashboard: hrmDashboardApi,
  companies: companyApi,
  departments: departmentApi,
  employees: employeeApi,
  positions: positionApi,
  roles: roleApi,
  leave: leaveApi,
  attendance: attendanceApi,
  jobOpenings: jobOpeningApi,
  candidates: candidateApi,
  interviews: interviewApi,
  payroll: payrollApi,
  payrollItems: payrollItemApi,
  salaryAdjustments: salaryAdjustmentApi,
  performanceReviews: performanceReviewApi,
  performanceGoals: performanceGoalApi,
  employeePerformance: employeePerformanceApi,
  contracts: contractApi,
  contractRenewals: contractRenewalApi,
  trainingPlans: trainingPlanApi,
  trainingCourses: trainingCourseApi,
  trainingRecords: trainingRecordApi,
  reports: hrmReportsApi,
  audit: hrmAuditApi,
  setup: hrmSetupApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.hrm.get('/health');
  },
};

export default hrmApi;
