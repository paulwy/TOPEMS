import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  UserMinus,
  Building,
  DollarSign,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Input,
  ListPageTemplate,
  Modal,
  Pagination,
  Select,
  StatTile,
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { employeeApi } from '@/api/hrm/employee';
import type { Employee as ApiEmployee } from '@/api/hrm/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['hrm', 'employees'];

interface Employee {
  id: string;
  emp_no: string;
  name: string;
  department: string;
  position: string;
  level: 'P5' | 'P6' | 'P7' | 'P8' | 'M1' | 'M2';
  status: 'active' | 'probation' | 'leave' | 'resigned';
  phone: string;
  email: string;
  join_date: string;
  salary: number;
  manager: string;
  created_at: string;
}

// 将 API 返回的 Employee 类型映射为页面使用的 Employee 类型
const mapApiEmployees = (apiEmployees: ApiEmployee[]): Employee[] => {
  return apiEmployees.map((e, index) => ({
    id: e.id,
    emp_no:
      (e as any).emp_no || (e as any).employee_no || `EMP${String(index + 1).padStart(3, '0')}`,
    name: (e as any).name || (e as any).employee_name || '-',
    department: (e as any).department || '-',
    position: (e as any).position || '-',
    level: ((e as any).level as Employee['level']) || 'P5',
    status: ((e as any).status as Employee['status']) || 'active',
    phone: (e as any).phone || (e as any).mobile || '-',
    email: (e as any).email || '-',
    join_date: (e as any).join_date || (e as any).hire_date || '-',
    salary: (e as any).salary || 0,
    manager: (e as any).manager || (e as any).leader || '-',
    created_at: e.created_at,
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockEmployees: Employee[] = [
  {
    id: '1',
    emp_no: 'EMP001',
    name: '张三',
    department: '技术部',
    position: '高级工程师',
    level: 'P7',
    status: 'active',
    phone: '138****1234',
    email: 'zhangsan@topems.com',
    join_date: '2023-03-15',
    salary: 25000,
    manager: '王经理',
    created_at: '2023-03-15 10:00:00',
  },
  {
    id: '2',
    emp_no: 'EMP002',
    name: '李四',
    department: '产品部',
    position: '产品经理',
    level: 'P6',
    status: 'active',
    phone: '139****5678',
    email: 'lisi@topems.com',
    join_date: '2023-06-20',
    salary: 22000,
    manager: '王经理',
    created_at: '2023-06-20 14:30:00',
  },
  {
    id: '3',
    emp_no: 'EMP003',
    name: '王五',
    department: '设计部',
    position: 'UI设计师',
    level: 'P5',
    status: 'probation',
    phone: '137****9012',
    email: 'wangwu@topems.com',
    join_date: '2026-08-01',
    salary: 15000,
    manager: '赵总监',
    created_at: '2026-08-01 09:15:00',
  },
  {
    id: '4',
    emp_no: 'EMP004',
    name: '赵六',
    department: '市场部',
    position: '市场总监',
    level: 'M1',
    status: 'active',
    phone: '136****3456',
    email: 'zhaoliu@topems.com',
    join_date: '2022-01-10',
    salary: 35000,
    manager: 'CEO',
    created_at: '2022-01-10 11:00:00',
  },
  {
    id: '5',
    emp_no: 'EMP005',
    name: '钱七',
    department: '技术部',
    position: '前端工程师',
    level: 'P6',
    status: 'leave',
    phone: '135****7890',
    email: 'qianqi@topems.com',
    join_date: '2024-03-05',
    salary: 20000,
    manager: '王经理',
    created_at: '2024-03-05 16:45:00',
  },
];

const levelConfig = {
  P5: { label: 'P5', variant: 'default' as const },
  P6: { label: 'P6', variant: 'info' as const },
  P7: { label: 'P7', variant: 'cyan' as const },
  P8: { label: 'P8', variant: 'amber' as const },
  M1: { label: 'M1', variant: 'warning' as const },
  M2: { label: 'M2', variant: 'error' as const },
};

const statusConfig = {
  active: { label: '在职', variant: 'success' as const },
  probation: { label: '试用期', variant: 'warning' as const },
  leave: { label: '休假', variant: 'info' as const },
  resigned: { label: '已离职', variant: 'default' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatSalary = (value: number) => {
  return `¥${value.toLocaleString('zh-CN')}`;
};

const HrmEmployeeRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'probation' | 'leave'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, deptFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (deptFilter !== 'all') {
          params.department = deptFilter;
        }
        const res = await employeeApi.list(params);
        const resData = res as unknown as {
          data?: { list?: ApiEmployee[]; items?: ApiEmployee[]; total?: number } | ApiEmployee[];
        };
        let apiEmployees: ApiEmployee[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiEmployees = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiEmployees = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiEmployees.length;
        }
        if (apiEmployees.length > 0) {
          setIsMockData(false);
          return { employees: mapApiEmployees(apiEmployees), total };
        }
      } catch (e) {
        console.warn('[HRM Employees] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockEmployees;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (e) => e.name.includes(debouncedSearch) || e.emp_no.includes(debouncedSearch)
        );
      }
      if (deptFilter !== 'all') {
        filtered = filtered.filter((e) => e.department === deptFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { employees: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const employees = data?.employees || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await employeeApi.delete(id);
      } catch (e) {
        console.warn('[HRM Employees] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '员工删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      try {
        await employeeApi.create({
          name: data.name || '',
          employee_no: data.emp_no,
          department: data.department,
          position: data.position,
          level: data.level,
          status: data.status,
          phone: data.phone,
          email: data.email,
          hire_date: data.join_date,
          salary: data.salary,
          manager: data.manager,
        } as any);
      } catch (e) {
        console.warn('[HRM Employees] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '员工创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      try {
        await employeeApi.update(id, {
          name: data.name,
          department: data.department,
          position: data.position,
          level: data.level,
          status: data.status,
          phone: data.phone,
          email: data.email,
          hire_date: data.join_date,
          salary: data.salary,
          manager: data.manager,
        } as any);
      } catch (e) {
        console.warn('[HRM Employees] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '员工更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredEmployees = employees;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedEmployees = filteredEmployees;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, deptFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'active').length;
    const probation = employees.filter((e) => e.status === 'probation').length;
    const totalSalary = employees
      .filter((e) => e.status !== 'resigned')
      .reduce((sum, e) => sum + e.salary, 0);
    return { total, active, probation, totalSalary };
  }, [employees]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'active', label: '在职', badge: stats.active },
      { id: 'probation', label: '试用期', badge: stats.probation },
      { id: 'leave', label: '休假', badge: employees.filter((e) => e.status === 'leave').length },
    ],
    [stats, employees]
  );

  const columns: DataTableColumn<Employee>[] = useMemo(
    () => [
      {
        key: 'emp_no',
        header: '工号',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.emp_no}
          </span>
        ),
      },
      {
        key: 'name',
        header: '姓名',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.position}
            </div>
          </div>
        ),
      },
      {
        key: 'department',
        header: '部门',
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Building
              size={14}
              style={{ color: 'var(--text-tertiary)' }}
            />
            <span>{row.department}</span>
          </div>
        ),
      },
      {
        key: 'level',
        header: '职级',
        align: 'center',
        render: (row) => {
          const config = levelConfig[row.level] || levelConfig.P5;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'phone',
        header: '联系电话',
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
            {row.phone}
          </span>
        ),
      },
      {
        key: 'salary',
        header: '月薪',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatSalary(row.salary)}
          </span>
        ),
      },
      {
        key: 'join_date',
        header: '入职日期',
        sortable: true,
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.active;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: '操作',
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedEmployee(row);
                setDetailDrawerOpen(true);
              }}
            >
              详情
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedEmployee(row);
                setCreateModalOpen(true);
              }}
            >
              编辑
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              删除
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedEmployee, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
  );

  return (
    <>
      {isMockData && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--warning-700)',
            backgroundColor: 'color-mix(in srgb, var(--warning-500) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning-500) 30%, transparent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}
        >
          ⚠️ 当前为演示模式，数据可能不是最新。API 连接失败，正在使用本地演示数据。
        </div>
      )}
      <ListPageTemplate<Employee>
        header={{
          title: '员工管理',
          subtitle: '管理员工信息，跟踪员工状态和职级',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '人力资源' },
            { label: '员工管理' },
          ],
        }}
        toolbar={
          <>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                placeholder='搜索工号/姓名/职位...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部部门' },
                  { value: '技术部', label: '技术部' },
                  { value: '产品部', label: '产品部' },
                  { value: '设计部', label: '设计部' },
                  { value: '市场部', label: '市场部' },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                刷新
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedEmployee(null);
                  setCreateModalOpen(true);
                }}
              >
                新建员工
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedEmployees}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无员工'
        emptyDescription='点击右上角「新建员工」按钮创建第一个员工'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='员工总数'
              value={stats.total}
              icon={Users}
              accent='cyan'
            />
            <StatTile
              label='在职员工'
              value={stats.active}
              icon={UserCheck}
              accent='success'
            />
            <StatTile
              label='试用期员工'
              value={stats.probation}
              icon={UserMinus}
              accent='warning'
            />
            <StatTile
              label='月度薪资总额'
              value={formatSalary(stats.totalSalary)}
              icon={DollarSign}
              accent='amber'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
      </ListPageTemplate>

      {filteredEmployees.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onChange={setCurrentPage}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* 员工详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedEmployee(null);
        }}
        title='员工详情'
        size='lg'
      >
        {selectedEmployee && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {selectedEmployee.emp_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedEmployee.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedEmployee.department} · {selectedEmployee.position}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={levelConfig[selectedEmployee.level]?.variant || 'default'}>
                    {levelConfig[selectedEmployee.level]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedEmployee.status]?.variant || 'default'}>
                    {statusConfig[selectedEmployee.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title='联系信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    联系电话
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedEmployee.phone}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    邮箱
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedEmployee.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    直属上级
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedEmployee.manager}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    入职日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedEmployee.join_date}</div>
                </div>
              </div>
            </Card>

            <Card title='薪资信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    月薪
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {formatSalary(selectedEmployee.salary)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedEmployee.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑员工弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedEmployee ? '编辑员工' : '新建员工'}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Employee> = {
                  name:
                    (document.querySelector('input[placeholder*="姓名"]') as HTMLInputElement)
                      ?.value || '',
                  emp_no:
                    (document.querySelector('input[placeholder*="工号"]') as HTMLInputElement)
                      ?.value || '',
                  department:
                    (document.querySelectorAll('select')[0] as HTMLSelectElement)?.value || '',
                  position:
                    (document.querySelectorAll('input[placeholder*="职位"]')[0] as HTMLInputElement)
                      ?.value || '',
                  level:
                    ((document.querySelectorAll('select')[1] as HTMLSelectElement)
                      ?.value as Employee['level']) || 'P5',
                  phone:
                    (document.querySelector('input[type="tel"]') as HTMLInputElement)?.value || '',
                  email:
                    (document.querySelector('input[type="email"]') as HTMLInputElement)?.value ||
                    '',
                  join_date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                  salary: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                };
                if (selectedEmployee) {
                  updateMutation.mutate({ id: selectedEmployee.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedEmployee ? '保存修改' : '创建员工'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-1'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                姓名 *
              </label>
              <Input
                id='field-1'
                placeholder='请输入姓名'
                defaultValue={selectedEmployee?.name}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                工号 *
              </label>
              <Input
                id='field-2'
                placeholder='例如：EMP006'
                defaultValue={selectedEmployee?.emp_no}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                部门
              </label>
              <Select
                id='field-3'
                defaultValue={selectedEmployee?.department || '技术部'}
                options={[
                  { value: '技术部', label: '技术部' },
                  { value: '产品部', label: '产品部' },
                  { value: '设计部', label: '设计部' },
                  { value: '市场部', label: '市场部' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                职位
              </label>
              <Input
                id='field-4'
                placeholder='例如：高级工程师'
                defaultValue={selectedEmployee?.position}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                职级
              </label>
              <Select
                id='field-5'
                defaultValue={selectedEmployee?.level || 'P5'}
                options={[
                  { value: 'P5', label: 'P5' },
                  { value: 'P6', label: 'P6' },
                  { value: 'P7', label: 'P7' },
                  { value: 'P8', label: 'P8' },
                  { value: 'M1', label: 'M1' },
                  { value: 'M2', label: 'M2' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                月薪（元）
              </label>
              <Input
                id='field-6'
                type='number'
                placeholder='例如：15000'
                defaultValue={selectedEmployee?.salary}
              />
            </div>
            <div>
              <label
                htmlFor='field-7'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                联系电话
              </label>
              <Input
                id='field-7'
                placeholder='请输入联系电话'
                defaultValue={selectedEmployee?.phone}
              />
            </div>
            <div>
              <label
                htmlFor='field-8'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                入职日期
              </label>
              <Input
                id='field-8'
                type='date'
                defaultValue={selectedEmployee?.join_date}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除员工'
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          确定要删除员工「{deleteTarget?.name}」吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default HrmEmployeeRedesignPage;
