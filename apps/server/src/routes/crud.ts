import { Router } from 'express';
import { authenticateToken } from '../auth';

const router = Router();

const ok = <T>(data: T) => ({ success: true, code: 200, message: 'OK', data, timestamp: Date.now() });
const created = <T>(data: T) => ({ success: true, code: 201, message: 'Created', data, timestamp: Date.now() });
const err = (message: string, code = 400) => ({ success: false, code, message, timestamp: Date.now() });

function createCrudRoutes<T extends { id: string }>(
  prefix: string,
  initialData: T[],
  idPrefix: string,
) {
  const store: T[] = [...initialData];
  let counter = store.length + 1;

  const generateId = () => `${idPrefix}-${String(counter++).padStart(4, '0')}`;

  router.get(`${prefix}`, authenticateToken as any, (req, res) => {
    const page = parseInt((req.query.page as string) || '1');
    const pageSize = parseInt((req.query.page_size as string) || '10');
    const start = (page - 1) * pageSize;
    const items = store.slice(start, start + pageSize);
    res.json(ok({
      items,
      total: store.length,
      page,
      page_size: pageSize,
    }));
  });

  router.get(`${prefix}/:id`, authenticateToken as any, (req, res) => {
    const item = store.find(i => i.id === req.params.id);
    if (!item) {
      res.status(404).json(err('Not found', 404));
      return;
    }
    res.json(ok(item));
  });

  router.post(`${prefix}`, authenticateToken as any, (req, res) => {
    const newItem: T = {
      ...(req.body as Omit<T, 'id'>),
      id: generateId(),
    } as T;
    store.push(newItem);
    res.status(201).json(created(newItem));
  });

  router.put(`${prefix}/:id`, authenticateToken as any, (req, res) => {
    const idx = store.findIndex(i => i.id === req.params.id);
    if (idx === -1) {
      res.status(404).json(err('Not found', 404));
      return;
    }
    store[idx] = { ...store[idx], ...(req.body as Partial<T>), id: store[idx].id };
    res.json(ok(store[idx]));
  });

  router.delete(`${prefix}/:id`, authenticateToken as any, (req, res) => {
    const idx = store.findIndex(i => i.id === req.params.id);
    if (idx === -1) {
      res.status(404).json(err('Not found', 404));
      return;
    }
    store.splice(idx, 1);
    res.json(ok({ success: true }));
  });
}

interface ExpenseApproval {
  id: string;
  expense_no: string;
  employee_id: string;
  expense_date: string;
  expense_type: string;
  status: string;
  items: Array<{ date: string; category: string; amount: number }>;
  created_at: string;
}

interface PurchaseContract {
  id: string;
  contractNo: string;
  supplier_name: string;
  contract_type: string;
  total_amount: number;
  status: string;
  effective_date: string;
  created_at: string;
}

interface FMEAAnalysis {
  id: string;
  title: string;
  process: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  status: string;
  created_at: string;
}

interface SPCChart {
  id: string;
  chart_name: string;
  process: string;
  metric: string;
  ucl: number;
  lcl: number;
  mean: number;
  data_points: number;
  status: string;
  created_at: string;
}

createCrudRoutes<ExpenseApproval>('/finance/expense-approvals', [
  {
    id: 'EXP-0001',
    expense_no: 'EXP-2026-0001',
    employee_id: 'EMP-001',
    expense_date: '2026-07-20',
    expense_type: 'travel',
    status: 'approved',
    items: [{ date: '2026-07-20', category: 'transport', amount: 280 }],
    created_at: '2026-07-20T10:00:00Z',
  },
  {
    id: 'EXP-0002',
    expense_no: 'EXP-2026-0002',
    employee_id: 'EMP-002',
    expense_date: '2026-07-22',
    expense_type: 'meal',
    status: 'pending',
    items: [{ date: '2026-07-22', category: 'meal', amount: 156 }],
    created_at: '2026-07-22T14:30:00Z',
  },
  {
    id: 'EXP-0003',
    expense_no: 'EXP-2026-0003',
    employee_id: 'EMP-003',
    expense_date: '2026-07-23',
    expense_type: 'office',
    status: 'draft',
    items: [{ date: '2026-07-23', category: 'supplies', amount: 340 }],
    created_at: '2026-07-23T09:15:00Z',
  },
], 'EXP');

createCrudRoutes<PurchaseContract>('/scm/purchase-contracts', [
  {
    id: 'PUR-0001',
    contractNo: 'PUR-2026-0001',
    supplier_name: '南京化工有限公司',
    contract_type: '采购合同',
    total_amount: 258000,
    status: 'active',
    effective_date: '2026-06-01',
    created_at: '2026-05-25T10:00:00Z',
  },
  {
    id: 'PUR-0002',
    contractNo: 'PUR-2026-0002',
    supplier_name: '苏州材料科技',
    contract_type: '服务合同',
    total_amount: 86000,
    status: 'pending',
    effective_date: '2026-08-01',
    created_at: '2026-07-15T14:00:00Z',
  },
], 'PUR');

createCrudRoutes<FMEAAnalysis>('/qms/fmea', [
  {
    id: 'FMEA-0001',
    title: '反应釜温度异常',
    process: '化工生产-反应工序',
    severity: 8,
    occurrence: 6,
    detection: 4,
    rpn: 192,
    status: 'open',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'FMEA-0002',
    title: '输送带偏移',
    process: '包装线-输送',
    severity: 5,
    occurrence: 4,
    detection: 3,
    rpn: 60,
    status: 'in_progress',
    created_at: '2026-07-10T11:30:00Z',
  },
  {
    id: 'FMEA-0003',
    title: '电气柜散热不良',
    process: '公用工程-配电',
    severity: 7,
    occurrence: 3,
    detection: 5,
    rpn: 105,
    status: 'closed',
    created_at: '2026-07-18T16:45:00Z',
  },
], 'FMEA');

createCrudRoutes<SPCChart>('/qms/spc/charts', [
  {
    id: 'SPC-0001',
    chart_name: '灌装线A线-重量控制图',
    process: '灌装线A',
    metric: '重量(g)',
    ucl: 510.5,
    lcl: 489.5,
    mean: 500.2,
    data_points: 125,
    status: 'stable',
    created_at: '2026-07-23T08:00:00Z',
  },
  {
    id: 'SPC-0002',
    chart_name: '挤出机B-温度控制图',
    process: '挤出机B',
    metric: '温度(℃)',
    ucl: 185.0,
    lcl: 175.0,
    mean: 180.1,
    data_points: 86,
    status: 'warning',
    created_at: '2026-07-24T06:30:00Z',
  },
], 'SPC');

export default router;
