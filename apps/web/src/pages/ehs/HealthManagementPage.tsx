import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Plus, Eye, Activity, FileText, Users, Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate } from '@/components';
import type { ColumnDef, RowAction, FilterConfig } from '@/components';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ehsApi } from '@/api/ehs';
import type { HealthRecord } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const HealthManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    gender: '' as 'male' | 'female' | null,
    birthday: '',
    department: '',
    position: '',
    workplace: '',
    blood_type: '',
    allergy_history: '',
    medical_history: '',
    contact_info: '',
    status: 'active' as const,
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: recordsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.HEALTH_RECORDS, searchTerm, statusFilter],
    queryFn: async () => {
      const response = await ehsApi.listHealthRecords({
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as any;
        const rawRecords = Array.isArray(data) ? data : data.data || [];
        return rawRecords.map((item: { [key: string]: unknown }) => ({
          ...item,
          status:
            item.status === 'active'
              ? 'active'
              : item.status === 'inactive'
                ? 'inactive'
                : item.status === 'suspended'
                  ? '暂停'
                  : item.status,
        }));
      }
      return [];
    },
  });
  const records = (recordsData as HealthRecord[]) || [];

  const recordDetailQuery = useQuery<HealthRecord | null>({
    queryKey: QUERY_KEYS.EHS.HEALTH_RECORD(selectedRecord?.id || ''),
    queryFn: async () => {
      if (!selectedRecord?.id) return null;
      const response = await ehsApi.getHealthRecord(selectedRecord.id);
      if (response.success && response.data) {
        return response.data as HealthRecord;
      }
      return null;
    },
    enabled: !!selectedRecord?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  const detailLoading = recordDetailQuery.isFetching;

  useEffect(() => {
    if (recordDetailQuery.data) {
      setSelectedRecord(recordDetailQuery.data);
    }
  }, [recordDetailQuery.data]);

  useEffect(() => {
    if (recordDetailQuery.isError) {
      apiLogger.error('加载健康档案详情失败:', recordDetailQuery.error);
      addNotification({ title: '错误', message: '加载详情失败', type: 'error' });
    }
  }, [recordDetailQuery.isError, recordDetailQuery.error, addNotification]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      inactive: { bg: 'error.lighter', color: 'error.dark' },
      suspended: { bg: 'warning.lighter', color: 'warning.dark' },
      暂停: { bg: 'warning.lighter', color: 'warning.dark' },
    };
    const statusLabels: Record<string, string> = {
      active: '正常',
      inactive: '无效',
      suspended: '暂停',
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    const label = statusLabels[status] || status;
    return (
      <Chip
        label={label}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns = useMemo<ColumnDef<HealthRecord>[]>(
    () => [
      {
        id: 'record_no',
        label: '档案编号',
        render: (row) => (row as any).record_no || '-',
      },
      {
        id: 'employee_name',
        label: '员工姓名',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.employee_name}
          </Typography>
        ),
      },
      {
        id: 'department',
        label: '部门',
        render: (row) => row.department || '-',
      },
      {
        id: 'position',
        label: '岗位',
        render: (row) => row.position || '-',
      },
      {
        id: 'workplace',
        label: '工作场所',
        render: (row) => row.workplace || '-',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const handleViewDetail = (record: HealthRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const rowActions = useMemo<RowAction<HealthRecord>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '正常' },
          { value: 'inactive', label: '无效' },
          { value: 'suspended', label: '暂停' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((record as any).record_no || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const handleCreate = () => {
    setFormData({
      employee_id: '',
      employee_name: '',
      gender: null,
      birthday: '',
      department: '',
      position: '',
      workplace: '',
      blood_type: '',
      allergy_history: '',
      medical_history: '',
      contact_info: '',
      status: 'active',
    });
    setShowCreateModal(true);
  };

  const createRecordMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createHealthRecord>[0]) =>
      ehsApi.createHealthRecord(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '健康档案创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.HEALTH_RECORDS });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建健康档案失败:', error);
    },
  });

  const handleSave = () => {
    createRecordMutation.mutate({
      employee_id: formData.employee_id,
      employee_name: formData.employee_name,
      gender: formData.gender,
      birthday: formData.birthday || null,
      department: formData.department || null,
      position: formData.position || null,
      workplace: formData.workplace || null,
      blood_type: formData.blood_type || null,
      allergy_history: formData.allergy_history || null,
      medical_history: formData.medical_history || null,
      contact_info: formData.contact_info || null,
      status: formData.status,
    });
  };

  const stats = useMemo(
    () => ({
      total: records.length,
      active: records.filter((r) => r.status === 'active').length,
      followUp: records.filter((r) => r.status === 'suspended').length,
    }),
    [records]
  );

  const headerActions = [
    {
      label: '新增档案',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'success' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <Heart sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[500]} 0%, ${ct.pink[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'pink.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'pink.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'pink.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  健康档案总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'success.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  正常
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.active}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'warning.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  待跟进
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.followUp}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ListPageTemplate<HealthRecord>
        title='健康档案列表'
        columns={columns}
        data={filteredRecords}
        loading={loading}
        searchable
        searchPlaceholder='搜索员工姓名或档案编号...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.HEALTH_RECORDS })}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增健康档案</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='员工编号 *'
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                placeholder='请输入员工编号'
              />
              <TextField
                fullWidth
                label='员工姓名 *'
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                placeholder='请输入员工姓名'
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>性别</InputLabel>
                <Select
                  value={formData.gender || ''}
                  label='性别'
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gender: e.target.value as 'male' | 'female' | null,
                    })
                  }
                >
                  <MenuItem value='male'>男</MenuItem>
                  <MenuItem value='female'>女</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='出生日期'
                type='date'
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='部门'
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder='请输入部门'
              />
              <TextField
                fullWidth
                label='岗位'
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder='请输入岗位'
              />
            </Box>
            <TextField
              fullWidth
              label='工作场所'
              value={formData.workplace}
              onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
              placeholder='请输入工作场所'
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label='血型'
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                placeholder='如：A型'
              />
              <TextField
                fullWidth
                label='联系方式'
                value={formData.contact_info}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder='请输入联系方式'
              />
            </Box>
            <TextField
              fullWidth
              label='过敏史'
              value={formData.allergy_history}
              onChange={(e) => setFormData({ ...formData, allergy_history: e.target.value })}
              placeholder='请输入过敏史'
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label='既往病史'
              value={formData.medical_history}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
              placeholder='请输入既往病史'
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label='状态'
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as typeof formData.status })
                }
              >
                <MenuItem value='active'>正常</MenuItem>
                <MenuItem value='inactive'>无效</MenuItem>
                <MenuItem value='suspended'>暂停</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'pink.dark' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>健康档案详情</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'pink.main',
                  borderTopColor: 'pink.dark',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
            </Box>
          ) : (
            selectedRecord && (
              <Box
                sx={{
                  pt: 2,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    档案编号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{(selectedRecord as any).record_no || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    员工姓名
                  </Box>
                  <Box>{selectedRecord.employee_name}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    性别
                  </Box>
                  <Box>
                    {selectedRecord.gender === 'male'
                      ? '男'
                      : selectedRecord.gender === 'female'
                        ? '女'
                        : '-'}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    出生日期
                  </Box>
                  <Box>{selectedRecord.birthday || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    部门
                  </Box>
                  <Box>{selectedRecord.department || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    岗位
                  </Box>
                  <Box>{selectedRecord.position || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    工作场所
                  </Box>
                  <Box>{selectedRecord.workplace || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    血型
                  </Box>
                  <Box>{selectedRecord.blood_type || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    联系方式
                  </Box>
                  <Box>{selectedRecord.contact_info || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    状态
                  </Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedRecord.status)}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    过敏史
                  </Box>
                  <Box>{selectedRecord.allergy_history || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    既往病史
                  </Box>
                  <Box>{selectedRecord.medical_history || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    危害因素
                  </Box>
                  <Box>
                    {Array.isArray(selectedRecord.hazard_factors)
                      ? selectedRecord.hazard_factors.join(', ')
                      : '-'}
                  </Box>
                </Box>
              </Box>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default HealthManagementPage;
