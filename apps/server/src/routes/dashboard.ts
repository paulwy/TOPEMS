import { Router, type Response } from 'express';
import {
  getMockFinanceDashboard,
  getMockEhsDashboard,
  getMockLimsDashboard,
  getMockCrmDashboard,
  getMockWmsDashboard,
  getMockHrmDashboard,
  getMockPdmDashboard,
  getMockQmsDashboard,
  getMockMesDashboard,
  getMockPmDashboard,
} from '../mock/dashboard';

const router = Router();

const ok = <T>(data: T) => ({ success: true, code: 200, message: 'OK', data, timestamp: Date.now() });

async function fetchDashboard(
  queryFnName: string,
  mockFn: () => unknown,
  res: Response,
) {
  try {
    const mod = await import('../db/dashboardQueries');
    const fn = mod[queryFnName as keyof typeof mod] as (() => Promise<unknown>) | undefined;
    if (typeof fn === 'function') {
      const data = await fn();
      res.json(ok(data));
      return;
    }
    throw new Error(`Query function ${queryFnName} not found`);
  } catch {
    res.json(ok(mockFn()));
  }
}

router.get('/finance/dashboard', async (_req, res) => {
  await fetchDashboard('getFinanceDashboard', getMockFinanceDashboard, res);
});

router.get('/ehs/dashboard', async (_req, res) => {
  await fetchDashboard('getEhsDashboard', getMockEhsDashboard, res);
});

router.get('/lims/dashboard', async (_req, res) => {
  await fetchDashboard('getLimsDashboard', getMockLimsDashboard, res);
});

router.get('/crm/dashboard', async (_req, res) => {
  await fetchDashboard('getCrmDashboard', getMockCrmDashboard, res);
});

router.get('/wms/dashboard', async (_req, res) => {
  await fetchDashboard('getWmsDashboard', getMockWmsDashboard, res);
});

router.get('/hrm/dashboard', async (_req, res) => {
  await fetchDashboard('getHrmDashboard', getMockHrmDashboard, res);
});

router.get('/pdm/dashboard', async (_req, res) => {
  await fetchDashboard('getPdmDashboard', getMockPdmDashboard, res);
});

router.get('/qms/dashboard', async (_req, res) => {
  await fetchDashboard('getQmsDashboard', getMockQmsDashboard, res);
});

router.get('/mes/dashboard', async (_req, res) => {
  await fetchDashboard('getMesDashboard', getMockMesDashboard, res);
});

router.get('/pm/dashboard', async (_req, res) => {
  await fetchDashboard('getPmDashboard', getMockPmDashboard, res);
});

export default router;