import apiClient from '../client';
import type { ApiResponse } from '../client';

export * from './types';

export { companyApi } from './company';
export { departmentApi } from './department';
export { employeeApi, roleApi, positionApi, employeePerformanceApi } from './employee';
export { attendanceApi } from './attendance';
export { leaveApi } from './leave';
export { jobOpeningApi, candidateApi, interviewApi } from './recruitment';
export { payrollApi, payrollItemApi, salaryAdjustmentApi } from './payroll';
export { performanceReviewApi, performanceGoalApi } from './performance';
export { contractApi, contractRenewalApi } from './contract';
export { trainingPlanApi, trainingCourseApi, trainingRecordApi } from './training';

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

export const hrmApi = {
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

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.hrm.get('/health');
  },
};

export default hrmApi;
