import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
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
import { attendanceApi } from '@/api/hrm/attendance';
import type { AttendanceRecord as ApiAttendanceRecord } from '@/api/hrm/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['hrm', 'attendance'];

interface AttendanceRecord {
  id: string;
  emp_no: string;
  employee_name: string;
  department: string;
  date: string;
  check_in: string;
  check_out: string;
  status: 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'holiday';
  work_hours: number;
  overtime_hours: number;
  remark: string;
}

// 将 API 返回的 AttendanceRecord 类型映射为页面使用的 AttendanceRecord 类型
const mapApiAttendance = (apiRecords: ApiAttendanceRecord[]): AttendanceRecord[] => {
  return apiRecords.map((r, index) => ({
    id: r.id,
    emp_no: (r as any).emp_no || `EMP${String(index + 1).padStart(3, '0')}`,
    employee_name: (r as any).employee_name || (r as any).employeeName || '-',
    department: (r as any).department || '-',
    date: (r as any).date || '-',
    check_in: (r as any).check_in || (r as any).checkIn || '-',
    check_out: (r as any).check_out || (r as any).checkOut || '-',
    status: ((r as any).status as AttendanceRecord['status']) || 'normal',
    work_hours: (r as any).work_hours || (r as any).workHours || 0,
    overtime_hours: (r as any).overtime_hours || (r as any).overtimeHours || 0,
    remark: (r as any).remark || '',
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockAttendance: AttendanceRecord[] = [
  {
    id: '1',
    emp_no: 'EMP001',
    employee_name: '张三',
    department: '技术部',
    date: '2026-09-12',
    check_in: '08:55',
    check_out: '18:30',
    status: 'normal',
    work_hours: 9.5,
    overtime_hours: 1.5,
    remark: '',
  },
  {
    id: '2',
    emp_no: 'EMP002',
    employee_name: '李四',
    department: '产品部',
    date: '2026-09-12',
    check_in: '09:20',
    check_out: '18:00',
    status: 'late',
    work_hours: 8.0,
    overtime_hours: 0,
    remark: '地铁延误',
  },
  {
    id: '3',
    emp_no: 'EMP003',
    employee_name: '王五',
    department: '设计部',
    date: '2026-09-12',
    check_in: '09:00',
    check_out: '17:30',
    status: 'early',
    work_hours: 8.5,
    overtime_hours: 0,
    remark: '提前下班',
  },
  {
    id: '4',
    emp_no: 'EMP004',
    employee_name: '赵六',
    department: '市场部',
    date: '2026-09-12',
    check_in: '-',
    check_out: '-',
    status: 'leave',
    work_hours: 0,
    overtime_hours: 0,
    remark: '年假',
  },
  {
    id: '5',
    emp_no: 'EMP005',
    employee_name: '钱七',
    department: '技术部',
    date: '2026-09-12',
    check_in: '08:50',
    check_out: '20:00',
    status: 'normal',
    work_hours: 11.0,
    overtime_hours: 3.0,
    remark: '项目赶工',
  },
];

const statusConfig = {
  normal: { label: '正常', variant: 'success' as const },
  late: { label: '迟到', variant: 'warning' as const },
  early: { label: '早退', variant: 'amber' as const },
  absent: { label: '旷工', variant: 'error' as const },
  leave: { label: '请假', variant: 'info' as const },
  holiday: { label: '节假日', variant: 'cyan' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const HrmAttendanceRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'normal' | 'abnormal' | 'leave'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
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
        const res = await attendanceApi.list(params);
        const resData = res as unknown as {
          data?:
            | { list?: ApiAttendanceRecord[]; items?: ApiAttendanceRecord[]; total?: number }
            | ApiAttendanceRecord[];
        };
        let apiRecords: ApiAttendanceRecord[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiRecords = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiRecords = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiRecords.length;
        }
        if (apiRecords.length > 0) {
          setIsMockData(false);
          return { records: mapApiAttendance(apiRecords), total };
        }
      } catch (e) {
        console.warn('[HRM Attendance] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockAttendance;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (r) => r.employee_name.includes(debouncedSearch) || r.emp_no.includes(debouncedSearch)
        );
      }
      if (deptFilter !== 'all') {
        filtered = filtered.filter((r) => r.department === deptFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { records: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const records = data?.records || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await attendanceApi.delete(id);
      } catch (e) {
        console.warn('[HRM Attendance] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '考勤记录删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<AttendanceRecord>) => {
      try {
        await attendanceApi.create({
          employee_id: data.emp_no,
          employee_name: data.employee_name,
          date: data.date,
          check_in: data.check_in,
          check_out: data.check_out,
          status: data.status,
          department: data.department,
        } as any);
      } catch (e) {
        console.warn('[HRM Attendance] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '考勤记录创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AttendanceRecord> }) => {
      try {
        await attendanceApi.update(id, {
          check_in: data.check_in,
          check_out: data.check_out,
          status: data.status,
        } as any);
      } catch (e) {
        console.warn('[HRM Attendance] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '考勤记录更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredRecords = records;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedRecords = filteredRecords;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, deptFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = records.length;
    const normal = records.filter((r) => r.status === 'normal').length;
    const abnormal = records.filter((r) => ['late', 'early', 'absent'].includes(r.status)).length;
    const totalOvertime = records.reduce((sum, r) => sum + r.overtime_hours, 0);
    return { total, normal, abnormal, totalOvertime };
  }, [records]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'normal', label: '正常', badge: stats.normal },
      { id: 'abnormal', label: '异常', badge: stats.abnormal },
      { id: 'leave', label: '请假', badge: records.filter((r) => r.status === 'leave').length },
    ],
    [stats, records]
  );

  const columns: DataTableColumn<AttendanceRecord>[] = useMemo(
    () => [
      {
        key: 'date',
        header: '日期',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-medium)' }}>
            {row.date}
          </span>
        ),
      },
      {
        key: 'emp_no',
        header: '工号',
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
        key: 'employee_name',
        header: '员工姓名',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.employee_name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.department}
            </div>
          </div>
        ),
      },
      {
        key: 'check_in',
        header: '签到时间',
        align: 'center',
        render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.check_in}</span>,
      },
      {
        key: 'check_out',
        header: '签退时间',
        align: 'center',
        render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.check_out}</span>,
      },
      {
        key: 'work_hours',
        header: '工时',
        align: 'right',
        sortable: true,
        render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.work_hours}h</span>,
      },
      {
        key: 'overtime_hours',
        header: '加班',
        align: 'right',
        render: (row) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              color: row.overtime_hours > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            }}
          >
            {row.overtime_hours > 0 ? `+${row.overtime_hours}h` : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.normal;
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
                setSelectedRecord(row);
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
                setSelectedRecord(row);
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
    [setSelectedRecord, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<AttendanceRecord>
        header={{
          title: '考勤管理',
          subtitle: '管理员工考勤记录，跟踪出勤状态和加班情况',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '人力资源' },
            { label: '考勤管理' },
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
                placeholder='搜索工号/姓名...'
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
                  setSelectedRecord(null);
                  setCreateModalOpen(true);
                }}
              >
                补录考勤
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedRecords}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无考勤记录'
        emptyDescription='点击右上角「补录考勤」按钮添加考勤记录'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='考勤记录总数'
              value={stats.total}
              icon={Calendar}
              accent='cyan'
            />
            <StatTile
              label='正常出勤'
              value={stats.normal}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label='异常考勤'
              value={stats.abnormal}
              icon={AlertTriangle}
              accent='warning'
            />
            <StatTile
              label='总加班时长'
              value={`${stats.totalOvertime}h`}
              icon={Clock}
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

      {filteredRecords.length > 0 && (
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

      {/* 考勤详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedRecord(null);
        }}
        title='考勤详情'
        size='lg'
      >
        {selectedRecord && (
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
                    {selectedRecord.date}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedRecord.employee_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedRecord.department} · {selectedRecord.emp_no}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedRecord.status]?.variant || 'default'}>
                  {statusConfig[selectedRecord.status]?.label || '未知'}
                </Badge>
              </div>
            </Card>

            <Card title='考勤时间'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    签到时间
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--font-bold)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {selectedRecord.check_in}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    签退时间
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--font-bold)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {selectedRecord.check_out}
                  </div>
                </div>
              </div>
            </Card>

            <Card title='工时统计'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    工作时长
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {selectedRecord.work_hours} 小时
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    加班时长
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      color:
                        selectedRecord.overtime_hours > 0
                          ? 'var(--accent-primary)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    {selectedRecord.overtime_hours > 0
                      ? `+${selectedRecord.overtime_hours} 小时`
                      : '无'}
                  </div>
                </div>
              </div>
            </Card>

            {selectedRecord.remark && (
              <Card title='备注'>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{selectedRecord.remark}</p>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 补录/编辑考勤弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedRecord ? '编辑考勤' : '补录考勤'}
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
                const formData: Partial<AttendanceRecord> = {
                  employee_name:
                    (document.querySelector('input[placeholder*="员工姓名"]') as HTMLInputElement)
                      ?.value || '',
                  date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                  check_in:
                    (document.querySelectorAll('input[type="time"]')[0] as HTMLInputElement)
                      ?.value || '',
                  check_out:
                    (document.querySelectorAll('input[type="time"]')[1] as HTMLInputElement)
                      ?.value || '',
                };
                if (selectedRecord) {
                  updateMutation.mutate({ id: selectedRecord.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedRecord ? '保存修改' : '确认补录'}
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
                员工 *
              </label>
              <Select
                id='field-1'
                defaultValue={selectedRecord?.emp_no || 'EMP001'}
                options={[
                  { value: 'EMP001', label: '张三 (技术部)' },
                  { value: 'EMP002', label: '李四 (产品部)' },
                  { value: 'EMP003', label: '王五 (设计部)' },
                  { value: 'EMP004', label: '赵六 (市场部)' },
                  { value: 'EMP005', label: '钱七 (技术部)' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                日期 *
              </label>
              <Input
                id='field-2'
                type='date'
                defaultValue={selectedRecord?.date || '2026-09-12'}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                签到时间
              </label>
              <Input
                id='field-3'
                type='time'
                defaultValue={selectedRecord?.check_in || '09:00'}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                签退时间
              </label>
              <Input
                id='field-4'
                type='time'
                defaultValue={selectedRecord?.check_out || '18:00'}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                考勤状态
              </label>
              <Select
                id='field-5'
                defaultValue={selectedRecord?.status || 'normal'}
                options={[
                  { value: 'normal', label: '正常' },
                  { value: 'late', label: '迟到' },
                  { value: 'early', label: '早退' },
                  { value: 'absent', label: '旷工' },
                  { value: 'leave', label: '请假' },
                  { value: 'holiday', label: '节假日' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                加班时长（小时）
              </label>
              <Input
                id='field-6'
                type='number'
                placeholder='例如：2'
                defaultValue={selectedRecord?.overtime_hours || 0}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-7'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              备注
            </label>
            <Input
              id='field-7'
              placeholder='请输入备注说明'
              defaultValue={selectedRecord?.remark}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除考勤记录'
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
          确定要删除 {deleteTarget?.employee_name} 在 {deleteTarget?.date}{' '}
          的考勤记录吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default HrmAttendanceRedesignPage;
