import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Clock,
  FileTextIcon,
} from 'lucide-react';
import type { Contract, ContractRenewal, Employee, PaginatedResult } from '@/api/hrm';
import { contractApi, contractRenewalApi, employeeApi } from '@/api/hrm';
import { ListPageTemplate, MuiStatCard as StatCard } from '@/components';
import type { ColumnDef, RowAction } from '@/components';

import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Stack,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
  FormLabel,
  Alert,
  Snackbar,
  Chip,
} from '@mui/material';
import { ActionButton } from '@/components/common/ActionButton';
import { FormField } from '@/components/common/FormField';
import { FormSelect } from '@/components/common/FormSelect';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Dialog } from '@/components/common/Dialog';
import { FileUpload, PageContainer } from '@/components/common';

const contractTypes = [
  { value: 'labor', label: '劳动合同' },
  { value: 'probation', label: '试用期合同' },
  { value: 'part-time', label: '兼职合同' },
  { value: 'project', label: '项目合同' },
  { value: 'consulting', label: '咨询合同' },
];

const statusMap: Record<
  string,
  { text: string; color: 'success' | 'error' | 'default' | 'warning' }
> = {
  active: { text: '生效中', color: 'success' },
  expired: { text: '已到期', color: 'error' },
  terminated: { text: '已终止', color: 'default' },
  pending: { text: '待审批', color: 'warning' },
};

const renewalStatusMap: Record<
  string,
  { text: string; color: 'success' | 'error' | 'default' | 'warning' | 'info' }
> = {
  pending: { text: '待审批', color: 'warning' },
  approved: { text: '已批准', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
  executed: { text: '已执行', color: 'info' },
};

const renewalTypes = [
  { value: 'regular', label: '常规续签' },
  { value: 'promotion', label: '升职续签' },
  { value: 'demotion', label: '降职续签' },
  { value: 'transfer', label: '调岗续签' },
];

interface FormState {
  employee_id: string;
  contract_no: string;
  contract_type: string;
  party_a_name: string;
  party_a_contact: string;
  party_b_name: string;
  party_b_contact: string;
  start_date: string;
  end_date: string;
  salary: string;
  probation_period_days: string;
  reminder_days: string;
  contract_file_path: string;
  notes: string;
}

interface RenewFormState {
  renewal_type: string;
  new_start_date: string;
  new_end_date: string;
  new_salary: string;
  renewal_reason: string;
}

export default function ContractManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Contract>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 20,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // 统计卡片数据
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [formState, setFormState] = useState<FormState>({
    employee_id: '',
    contract_no: '',
    contract_type: '',
    party_a_name: '',
    party_a_contact: '',
    party_b_name: '',
    party_b_contact: '',
    start_date: '',
    end_date: '',
    salary: '',
    probation_period_days: '',
    reminder_days: '30',
    contract_file_path: '',
    notes: '',
  });

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewFormState, setRenewFormState] = useState<RenewFormState>({
    renewal_type: 'regular',
    new_start_date: '',
    new_end_date: '',
    new_salary: '',
    renewal_reason: '',
  });
  const [renewContractId, setRenewContractId] = useState('');

  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);
  const [showRenewals, setShowRenewals] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    onConfirm: () => void;
  } | null>(null);
  const [contractAttachments, setContractAttachments] = useState<string[]>([]);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  }, []);

  const showConfirm = useCallback((title: string, onConfirm: () => void) => {
    setConfirmDialog({ title, onConfirm });
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, showExpiringOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: 20,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (showExpiringOnly) {
        const result = await contractApi.getExpiring({
          days: 30,
          page: currentPage,
          page_size: 20,
        });
        if (result.code === 0 && result.data) {
          setData(result.data);
          // 计算即将到期统计
          const expiringCount = result.data.items.filter((c) => hasExpiringSoon(c.end_date)).length;
          setStats((prev) => ({ ...prev, expiring: expiringCount }));
        } else {
          showNotification('error', result.message || '获取即将到期合同失败');
        }
      } else {
        const result = await contractApi.list(params);
        if (result.code === 0 && result.data) {
          setData(result.data);
          // 计算各项统计
          const activeCount = result.data.items.filter((c) => c.status === 'active').length;
          const expiredCount = result.data.items.filter((c) => c.status === 'expired').length;
          const expiringCount = result.data.items.filter((c) => hasExpiringSoon(c.end_date)).length;
          setStats({
            total: result.data.total,
            active: activeCount,
            expired: expiredCount,
            expiring: expiringCount,
          });
        } else {
          showNotification('error', result.message || '获取合同列表失败');
        }
      }
    } catch (error: unknown) {
      showNotification('error', '获取合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await employeeApi.list({ page: 1, page_size: 100 });
      if (result.code === 0 && result.data) {
        setEmployees(result.data.items);
      }
    } catch (error: unknown) {
      showNotification('error', '获取员工列表失败');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleCreate = () => {
    setModalType('create');
    setCurrentContract(null);
    setFormState({
      employee_id: '',
      contract_no: '',
      contract_type: '',
      party_a_name: '',
      party_a_contact: '',
      party_b_name: '',
      party_b_contact: '',
      start_date: '',
      end_date: '',
      salary: '',
      probation_period_days: '',
      reminder_days: '30',
      contract_file_path: '',
      notes: '',
    });
    setContractAttachments([]);
    setModalVisible(true);
  };

  const handleEdit = (contract: Contract) => {
    setModalType('edit');
    setCurrentContract(contract);
    setFormState({
      employee_id: contract.employee_id || '',
      contract_no: contract.contract_no || '',
      contract_type: contract.contract_type || '',
      party_a_name: contract.party_a_name || '',
      party_a_contact: contract.party_a_contact || '',
      party_b_name: contract.party_b_name || '',
      party_b_contact: contract.party_b_contact || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      salary: contract.salary?.toString() || '',
      probation_period_days: contract.probation_period_days?.toString() || '',
      reminder_days: contract.reminder_days?.toString() || '30',
      contract_file_path: contract.contract_file_path || '',
      notes: contract.notes || '',
    });
    setContractAttachments(contract.contract_file_path ? [contract.contract_file_path] : []);
    setModalVisible(true);
  };

  const handleView = async (contract: Contract) => {
    setModalType('view');
    setCurrentContract(contract);
    const result = await contractRenewalApi.list({ contract_id: contract.id });
    if (result.code === 0 && result.data) {
      setRenewals(result.data.items);
    }
    setShowRenewals(false);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await contractApi.delete(id);
      if (result.code === 0) {
        showNotification('success', '删除成功');
        loadData();
      } else {
        showNotification('error', result.message || '删除失败');
      }
    } catch (error: unknown) {
      showNotification('error', '删除失败');
    }
  };

  const handleSave = async () => {
    if (!formState.employee_id) {
      showNotification('error', '请选择员工');
      return;
    }
    if (!formState.contract_type) {
      showNotification('error', '请选择合同类型');
      return;
    }
    if (!formState.start_date) {
      showNotification('error', '请选择开始日期');
      return;
    }

    const values = {
      ...formState,
      salary: formState.salary ? parseInt(formState.salary) : undefined,
      probation_period_days: formState.probation_period_days
        ? parseInt(formState.probation_period_days)
        : undefined,
      reminder_days: formState.reminder_days ? parseInt(formState.reminder_days) : undefined,
    };

    try {
      if (modalType === 'create') {
        const result = await contractApi.create(values);
        if (result.code === 0) {
          showNotification('success', '创建成功');
          setModalVisible(false);
          loadData();
        } else {
          showNotification('error', result.message || '创建失败');
        }
      } else if (currentContract) {
        const result = await contractApi.update(currentContract.id, values);
        if (result.code === 0) {
          showNotification('success', '更新成功');
          setModalVisible(false);
          loadData();
        } else {
          showNotification('error', result.message || '更新失败');
        }
      }
    } catch (error: unknown) {
      showNotification('error', '保存失败');
    }
  };

  const handleRenew = (contract: Contract) => {
    setRenewContractId(contract.id);
    setRenewFormState({
      renewal_type: 'regular',
      new_start_date: contract.end_date || new Date().toISOString().split('T')[0],
      new_end_date: '',
      new_salary: '',
      renewal_reason: '',
    });
    setRenewModalVisible(true);
  };

  const handleSubmitRenew = async () => {
    if (!renewFormState.new_start_date) {
      showNotification('error', '请选择新合同开始日期');
      return;
    }

    const values = {
      ...renewFormState,
      new_salary: renewFormState.new_salary ? parseInt(renewFormState.new_salary) : undefined,
    };

    try {
      const result = await contractApi.renew(renewContractId, values);
      if (result.code === 0) {
        showNotification('success', '续签申请提交成功');
        setRenewModalVisible(false);
      } else {
        showNotification('error', result.message || '提交失败');
      }
    } catch (error: unknown) {
      showNotification('error', '提交失败');
    }
  };

  const handleApproveRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.approve(id);
      if (result.code === 0) {
        showNotification('success', '续签申请已批准');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error: unknown) {
      showNotification('error', '操作失败');
    }
  };

  const handleRejectRenewal = async (id: string) => {
    const reason = prompt('请输入拒绝理由：');
    if (!reason) return;
    try {
      const result = await contractRenewalApi.reject(id, reason);
      if (result.code === 0) {
        showNotification('success', '续签申请已拒绝');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error: unknown) {
      showNotification('error', '操作失败');
    }
  };

  const handleExecuteRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.execute(id);
      if (result.code === 0) {
        showNotification('success', '合同续签已执行');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error: unknown) {
      showNotification('error', '操作失败');
    }
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return '-';
    return employees.find((e) => e.id === id)?.name || '-';
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const hasExpiringSoon = (endDate?: string) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days > 0 && days <= 30;
  };

  // 统计卡片数据
  const statCards = useMemo(
    () => [
      {
        id: 'total',
        title: '合同总数',
        value: stats.total,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '生效中',
        value: stats.active,
        icon: <Check size={24} />,
        color: 'success' as const,
      },
      {
        id: 'expiring',
        title: '即将到期',
        value: stats.expiring,
        icon: <AlertCircle size={24} />,
        color: 'warning' as const,
      },
      {
        id: 'expired',
        title: '已到期',
        value: stats.expired,
        icon: <Clock size={24} />,
        color: 'error' as const,
      },
    ],
    [stats]
  );

  // 列定义
  const columns: ColumnDef<Contract>[] = useMemo(
    () => [
      {
        id: 'contract_no',
        label: '合同编号',
        width: 128,
        render: (row) => (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <FileTextIcon
              size={16}
              style={{ color: 'primary.main' }}
            />
            <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
              {row.contract_no || '-'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'employee',
        label: '员工',
        render: (row) => getEmployeeName(row.employee_id),
      },
      {
        id: 'contract_type',
        label: '合同类型',
        render: (row) =>
          contractTypes.find((t) => t.value === row.contract_type)?.label || row.contract_type,
      },
      {
        id: 'salary',
        label: '薪资',
        width: 96,
        render: (row) => (row.salary ? `${row.salary.toLocaleString()}` : '-'),
      },
      {
        id: 'validity',
        label: '有效期',
        width: 192,
        render: (row) => {
          const days = getDaysUntilExpiry(row.end_date);
          const isExpiringSoon = hasExpiringSoon(row.end_date);
          return (
            <Box>
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Calendar
                  size={14}
                  style={{ color: 'text.disabled' }}
                />
                <Typography
                  variant='body2'
                  sx={{
                    color: isExpiringSoon ? 'warning.main' : 'grey.600',
                    fontWeight: isExpiringSoon ? 500 : 400,
                  }}
                >
                  {new Date(row.start_date).toLocaleDateString('zh-CN')} ~{' '}
                  {row.end_date ? new Date(row.end_date).toLocaleDateString('zh-CN') : '无固定期限'}
                </Typography>
              </Stack>
              {isExpiringSoon && days !== null && (
                <Stack
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    mt: 0.5,
                  }}
                >
                  <AlertCircle
                    size={12}
                    style={{ color: '#ea580c' }}
                  />
                  <Typography
                    variant='caption'
                    sx={{ color: 'warning.main' }}
                  >
                    剩余{days}天到期
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        },
      },
      {
        id: 'status',
        label: '状态',
        width: 80,
        render: (row) => (
          <StatusBadge
            status={row.status}
            label={statusMap[row.status]?.text || row.status}
            color={statusMap[row.status]?.color || 'default'}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees]
  );

  // 行操作
  const rowActions: RowAction<Contract>[] = useMemo(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: handleView,
      },
      {
        label: '编辑',
        icon: <Edit2 size={16} />,
        onClick: handleEdit,
      },
      {
        label: '续签',
        icon: <RefreshCw size={16} />,
        color: 'success',
        show: (row) => row.status === 'active',
        onClick: handleRenew,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        confirm: true,
        confirmMessage: '确定删除该合同吗?',
        onClick: (row) => handleDelete(row.id),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          severity={notification?.type}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title={confirmDialog?.title}
        maxWidth='sm'
        cancelButton={{ label: '取消' }}
        confirmButton={{
          label: '确定',
          onClick: () => {
            confirmDialog?.onConfirm();
            setConfirmDialog(null);
          },
          color: 'error',
        }}
      ></Dialog>

      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 1,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 2 }}>
          {/* 面包屑导航 */}
          <Box sx={{ mb: 2 }}>
            <Typography
              component='a'
              href='/hrm'
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              人力资源
            </Typography>
            <Typography
              component='span'
              sx={{ mx: 1, color: 'text.disabled' }}
            >
              /
            </Typography>
            <Typography
              component='span'
              sx={{ color: 'text.primary', fontSize: '0.875rem' }}
            >
              合同管理
            </Typography>
          </Box>

          <Stack
            direction='row'
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, color: 'grey.900' }}
              >
                合同管理
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500', mt: 0.5 }}
              >
                管理员工合同信息，包括合同创建、到期提醒和续签流程
              </Typography>
            </Box>
            <ActionButton
              label='新建合同'
              icon={<Plus size={18} />}
              onClick={handleCreate}
              variant='primary'
            />
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        {/* 统计卡片 */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {statCards.map((stat) => (
              <StatCard
                key={stat.id}
                {...stat}
              />
            ))}
          </Box>
        </Box>

        <Card sx={{ boxShadow: 1 }}>
          <ListPageTemplate
            columns={columns}
            data={data.items}
            loading={loading}
            rowActions={rowActions}
            getRowId={(row) => row.id}
            pagination={{
              page: currentPage,
              pageSize: data.page_size,
              total: data.total,
              onPageChange: setCurrentPage,
            }}
            searchable
            searchPlaceholder='搜索合同编号或员工姓名'
            searchValue={searchText}
            onSearch={(value) => {
              setSearchText(value);
              setCurrentPage(1);
            }}
            filters={[
              {
                id: 'status',
                label: '状态',
                type: 'select',
                options: [
                  { label: '全部状态', value: '' },
                  { label: '生效中', value: 'active' },
                  { label: '已到期', value: 'expired' },
                  { label: '已终止', value: 'terminated' },
                ],
                value: statusFilter,
              },
              {
                id: 'expiring',
                label: '仅显示即将到期',
                type: 'select',
                options: [
                  { label: '全部', value: 'false' },
                  { label: '30天内到期', value: 'true' },
                ],
                value: showExpiringOnly ? 'true' : 'false',
              },
            ]}
            onFilterChange={(filters) => {
              if (filters.status !== undefined) {
                setStatusFilter(filters.status as string);
              }
              if (filters.expiring !== undefined) {
                setShowExpiringOnly(filters.expiring === 'true');
              }
              setCurrentPage(1);
            }}
            actions={[
              {
                label: '刷新',
                icon: <RefreshCw size={16} />,
                onClick: loadData,
              },
            ]}
            emptyMessage='暂无合同数据'
          />
        </Card>
      </Box>

      <Dialog
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalType === 'create' ? '新建合同' : modalType === 'edit' ? '编辑合同' : '合同详情'}
        maxWidth='md'
        fullWidth
        cancelButton={modalType !== 'view' ? { label: '取消' } : undefined}
        confirmButton={
          modalType !== 'view'
            ? { label: modalType === 'create' ? '创建' : '保存', onClick: handleSave }
            : { label: '关闭' }
        }
      >
        {modalType !== 'view' ? (
          <Stack spacing={2}>
            <FormSelect
              name='employee_id'
              label='员工 *'
              value={formState.employee_id}
              options={[
                { value: '', label: '请选择员工' },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
              onChange={(value) => setFormState((s) => ({ ...s, employee_id: value as string }))}
            />

            <FormField
              name='contract_no'
              label='合同编号'
              value={formState.contract_no}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((s) => ({ ...s, contract_no: e.target.value }))
              }
              disabled={modalType === 'create'}
              placeholder={modalType === 'create' ? '自动生成' : ''}
              fullWidth
            />

            <FormSelect
              name='contract_type'
              label='合同类型 *'
              value={formState.contract_type}
              options={[{ value: '', label: '请选择合同类型' }, ...contractTypes]}
              onChange={(value) => setFormState((s) => ({ ...s, contract_type: value as string }))}
            />

            <Stack
              direction='row'
              spacing={2}
            >
              <FormField
                name='party_a_name'
                label='甲方名称'
                value={formState.party_a_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, party_a_name: e.target.value }))
                }
                placeholder='公司名称'
                fullWidth
              />
              <FormField
                name='party_a_contact'
                label='甲方联系人'
                value={formState.party_a_contact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, party_a_contact: e.target.value }))
                }
                placeholder='联系人姓名'
                fullWidth
              />
            </Stack>

            <Stack
              direction='row'
              spacing={2}
            >
              <FormField
                name='party_b_name'
                label='乙方名称'
                value={formState.party_b_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, party_b_name: e.target.value }))
                }
                placeholder='员工姓名'
                fullWidth
              />
              <FormField
                name='party_b_contact'
                label='乙方联系人'
                value={formState.party_b_contact}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, party_b_contact: e.target.value }))
                }
                placeholder='员工联系方式'
                fullWidth
              />
            </Stack>

            <Stack
              direction='row'
              spacing={2}
            >
              <FormField
                name='start_date'
                label='开始日期 *'
                type='date'
                value={formState.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, start_date: e.target.value }))
                }
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormField
                name='end_date'
                label='结束日期'
                type='date'
                value={formState.end_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, end_date: e.target.value }))
                }
                placeholder='无固定期限'
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack
              direction='row'
              spacing={2}
            >
              <FormField
                name='salary'
                label='薪资'
                type='number'
                value={formState.salary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, salary: e.target.value }))
                }
                placeholder='0'
                fullWidth
              />
              <FormField
                name='probation_period_days'
                label='试用期(天)'
                type='number'
                value={formState.probation_period_days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, probation_period_days: e.target.value }))
                }
                placeholder='0'
                fullWidth
              />
              <FormField
                name='reminder_days'
                label='提前提醒天数'
                type='number'
                value={formState.reminder_days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormState((s) => ({ ...s, reminder_days: e.target.value }))
                }
                placeholder='30'
                fullWidth
              />
            </Stack>

            <Box>
              <FormLabel sx={{ mb: 1, display: 'block' }}>合同附件</FormLabel>
              <FileUpload
                value={contractAttachments}
                onChange={setContractAttachments}
                accept={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                maxCount={5}
                maxSize={20}
                maxTotalSize={50}
                uploadText='上传合同附件'
              />
            </Box>

            <FormField
              name='notes'
              label='备注'
              value={formState.notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormState((s) => ({ ...s, notes: e.target.value }))
              }
              multiline
              rows={3}
              placeholder='备注信息'
              fullWidth
            />
          </Stack>
        ) : (
          <Box>
            {currentContract && (
              <Stack spacing={2}>
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        合同编号
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {currentContract.contract_no || '-'}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        员工
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {getEmployeeName(currentContract.employee_id)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        合同类型
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {contractTypes.find((t) => t.value === currentContract.contract_type)
                          ?.label || currentContract.contract_type}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        状态
                      </Typography>
                      <Chip
                        size='small'
                        label={statusMap[currentContract.status]?.text || currentContract.status}
                        color={statusMap[currentContract.status]?.color || 'default'}
                      />
                    </CardContent>
                  </Card>
                </Stack>
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        薪资
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {currentContract.salary?.toLocaleString() || '-'}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        试用期
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>
                        {currentContract.probation_period_days || 0} 天
                      </Typography>
                    </CardContent>
                  </Card>
                </Stack>
                <Card sx={{ bgcolor: 'grey.50', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500' }}
                    >
                      有效期
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      {new Date(currentContract.start_date).toLocaleDateString('zh-CN')}~{' '}
                      {currentContract.end_date
                        ? new Date(currentContract.end_date).toLocaleDateString('zh-CN')
                        : '无固定期限'}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ bgcolor: 'grey.50', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500' }}
                    >
                      甲方信息
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      {currentContract.party_a_name || '-'}
                    </Typography>
                    <Typography variant='body2'>
                      {currentContract.party_a_contact || '-'}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ bgcolor: 'grey.50', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500' }}
                    >
                      乙方信息
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      {currentContract.party_b_name || '-'}
                    </Typography>
                    <Typography variant='body2'>
                      {currentContract.party_b_contact || '-'}
                    </Typography>
                  </CardContent>
                </Card>
                {currentContract.notes && (
                  <Card sx={{ bgcolor: 'grey.50', boxShadow: 'none' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        备注
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>{currentContract.notes}</Typography>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            )}

            {showRenewals && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 500, mb: 1.5 }}>续签记录</Typography>
                {renewals.length === 0 ? (
                  <Typography sx={{ color: 'grey.500', textAlign: 'center', py: 2 }}>
                    暂无续签记录
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {renewals.map((renewal) => (
                      <Card
                        key={renewal.id}
                        sx={{ border: 1, borderColor: 'divider' }}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Stack
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1,
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontWeight: 500 }}>
                                {renewalTypes.find((t) => t.value === renewal.renewal_type)
                                  ?.label || renewal.renewal_type}
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ color: 'grey.500', ml: 1 }}
                              >
                                {new Date(renewal.created_at).toLocaleString('zh-CN')}
                              </Typography>
                            </Box>
                            <StatusBadge
                              status={renewal.status}
                              label={renewalStatusMap[renewal.status]?.text || renewal.status}
                              color={renewalStatusMap[renewal.status]?.color || 'default'}
                            />
                          </Stack>
                          <Typography
                            variant='body2'
                            sx={{ color: 'grey.600', mb: 1 }}
                          >
                            新合同期限:{' '}
                            {new Date(renewal.new_start_date).toLocaleDateString('zh-CN')} ~{' '}
                            {renewal.new_end_date
                              ? new Date(renewal.new_end_date).toLocaleDateString('zh-CN')
                              : '无固定期限'}
                          </Typography>
                          {renewal.new_salary && (
                            <Typography
                              variant='body2'
                              sx={{ color: 'grey.600', mb: 1 }}
                            >
                              新薪资: {renewal.new_salary.toLocaleString()}
                            </Typography>
                          )}
                          {renewal.renewal_reason && (
                            <Typography
                              variant='body2'
                              sx={{ color: 'grey.600', mb: 1 }}
                            >
                              续签原因: {renewal.renewal_reason}
                            </Typography>
                          )}
                          {renewal.rejection_reason && (
                            <Typography
                              variant='body2'
                              sx={{ color: 'error.main' }}
                            >
                              拒绝理由: {renewal.rejection_reason}
                            </Typography>
                          )}
                          <Stack
                            direction='row'
                            spacing={1}
                            sx={{ mt: 1.5 }}
                          >
                            {renewal.status === 'pending' && (
                              <>
                                <ActionButton
                                  label='批准'
                                  icon={<Check size={12} />}
                                  onClick={() => handleApproveRenewal(renewal.id)}
                                  variant='success'
                                  size='small'
                                />
                                <ActionButton
                                  label='拒绝'
                                  icon={<X size={12} />}
                                  onClick={() => handleRejectRenewal(renewal.id)}
                                  variant='danger'
                                  size='small'
                                />
                              </>
                            )}
                            {renewal.status === 'approved' && (
                              <ActionButton
                                label='执行续签'
                                icon={<RefreshCw size={12} />}
                                onClick={() => handleExecuteRenewal(renewal.id)}
                                variant='secondary'
                                size='small'
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        )}
      </Dialog>

      <Dialog
        open={renewModalVisible}
        onClose={() => setRenewModalVisible(false)}
        title='合同续签申请'
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: '取消' }}
        confirmButton={{ label: '提交申请', onClick: handleSubmitRenew }}
      >
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          <FormSelect
            name='renewal_type'
            label='续签类型 *'
            value={renewFormState.renewal_type}
            options={renewalTypes}
            onChange={(value) =>
              setRenewFormState((s) => ({ ...s, renewal_type: value as string }))
            }
          />

          <Stack
            direction='row'
            spacing={2}
          >
            <FormField
              name='new_start_date'
              label='新合同开始日期 *'
              type='date'
              value={renewFormState.new_start_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRenewFormState((s) => ({ ...s, new_start_date: e.target.value }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormField
              name='new_end_date'
              label='新合同结束日期'
              type='date'
              value={renewFormState.new_end_date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRenewFormState((s) => ({ ...s, new_end_date: e.target.value }))
              }
              placeholder='无固定期限'
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <FormField
            name='new_salary'
            label='新薪资'
            type='number'
            value={renewFormState.new_salary}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRenewFormState((s) => ({ ...s, new_salary: e.target.value }))
            }
            placeholder='不修改请留空'
            fullWidth
          />

          <FormField
            name='renewal_reason'
            label='续签原因'
            value={renewFormState.renewal_reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setRenewFormState((s) => ({ ...s, renewal_reason: e.target.value }))
            }
            multiline
            rows={3}
            placeholder='请说明续签原因'
            fullWidth
          />
        </Stack>
      </Dialog>
    </PageContainer>
  );
}
