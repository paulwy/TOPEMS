import apiClient from '../client';
import type { ApiResponse } from '../client';

export * from './types';

export { projectApi } from './project';
export { experimentApi } from './experiment';
export { formulaApi } from './formula';
export { materialApi } from './material';
export { auditRsApi } from './audit';
export { rsStatisticsApi } from './statistics';
export { bugApi } from './bug';
export { testApi } from './test';
export { buildApi } from './build';
export { deployApi } from './deploy';

import { projectApi } from './project';
import { experimentApi } from './experiment';
import { formulaApi } from './formula';
import { materialApi } from './material';
import { auditRsApi } from './audit';
import { rsStatisticsApi } from './statistics';
import { bugApi } from './bug';
import { testApi } from './test';
import { buildApi } from './build';
import { deployApi } from './deploy';

export const rsApi = {
  listProjects: projectApi.listProjects,
  getProject: projectApi.getProject,
  createProject: projectApi.createProject,
  updateProject: projectApi.updateProject,
  deleteProject: projectApi.deleteProject,
  batchCreateProjects: projectApi.batchCreateProjects,
  batchDeleteProjects: projectApi.batchDeleteProjects,
  exportProjects: projectApi.exportProjects,
  importProjects: projectApi.importProjects,
  getProjectDashboard: projectApi.getProjectDashboard,
  getProjectGantt: projectApi.getProjectGantt,

  listExperiments: experimentApi.listExperiments,
  getExperiment: experimentApi.getExperiment,
  createExperiment: experimentApi.createExperiment,
  updateExperiment: experimentApi.updateExperiment,
  deleteExperiment: experimentApi.deleteExperiment,
  listExperimentsByProject: experimentApi.listExperimentsByProject,
  listLabExperiments: experimentApi.listLabExperiments,
  listPilotExperiments: experimentApi.listPilotExperiments,
  listScaleupExperiments: experimentApi.listScaleupExperiments,
  advancePhase: experimentApi.advancePhase,
  traceBatch: experimentApi.traceBatch,

  getExperimentRecords: experimentApi.getExperimentRecords,
  createExperimentRecord: experimentApi.createExperimentRecord,

  getStatistics: rsStatisticsApi.getStatistics,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.rs.get('/health');
  },

  listBugs: bugApi.listBugs,
  getBug: bugApi.getBug,
  createBug: bugApi.createBug,
  updateBug: bugApi.updateBug,
  deleteBug: bugApi.deleteBug,

  listTests: testApi.listTests,
  getTest: testApi.getTest,
  createTest: testApi.createTest,
  updateTest: testApi.updateTest,
  deleteTest: testApi.deleteTest,

  listBuilds: buildApi.listBuilds,
  getBuild: buildApi.getBuild,
  createBuild: buildApi.createBuild,

  listDeploys: deployApi.listDeploys,
  getDeploy: deployApi.getDeploy,
  createDeploy: deployApi.createDeploy,
};

export default rsApi;
