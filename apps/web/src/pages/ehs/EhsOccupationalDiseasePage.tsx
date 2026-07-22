import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Plus,
  Eye,
  Edit,
  HeartPulse,
  AlertCircle,
  CalendarCheck,
  ClipboardList,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ehsApi } from '@/api/ehs';
import type { CreateOccupationalDiseaseCaseRequest } from '@/api/ehs/types/index';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

interface OccupationalDiseaseCase {
  id: string;
  case_no: string;
  employee_id: string;
  employee_name: string;
  department: string;
  hazard_type: string;
  diagnosis_date: string;
  disease_type: string;
  disease_name: string;
  severity: string;
  status: string;
  description?: string;
  created_at?: string;
}

const hazardTypeOptions = [
  { label: '粉尘', value: '粉尘' },
  { label: '化学', value: '化学' },
  { label: '物理', value: '物理' },
  { label: '生物', value: '生物' },
];

const severityOptions = [
  { label: '轻度', value: '轻度' },
  { label: '中度', value: '中度' },
  { label: '重度', value: '重度' },
];

const statusOptions = [
  { label: '疑似', value: '疑似' },
  { label: '确诊', value: '确诊' },
  { label: '康复', value: '康复' },
];

const EhsOccupationalDiseasePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [hazardTypeFilter, setHazardTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCase, setEditingCase] = useState<OccupationalDiseaseCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<OccupationalDiseaseCase | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    department: '',
    hazard_type: '',
    diagnosis_date: '',
    disease_type: '',
    disease_name: '',
    severity: '',
    status: '',
    description: '',
  });

  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: casesData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.EHS.OCCUPATIONAL_DISEASES,
    queryFn: async () => {
      const response = await ehsApi.occupationalDiseases.listOccupationalDiseaseCases({
        pagesize: 100,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const cases = (casesData as OccupationalDiseaseCase[]) || [];

  const getSeverityChip = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string }> = {
      轻度: { bg: 'success.lighter', color: 'success.dark' },
      中度: { bg: 'warning.100', color: ct.yellow[600] },
      重度: { bg: 'error.lighter', color: 'error.dark' },
    };
    const colors = severityMap[severity] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={severity}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const getStatusChip = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      疑似: { bg: 'warning.100', color: ct.yellow[600] },
      确诊: { bg: 'error.lighter', color: 'error.dark' },
      康复: { bg: 'success.lighter', color: 'success.dark' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesSearch =
        item.case_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.disease_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHazardType = !hazardTypeFilter || item.hazard_type === hazardTypeFilter;
      const matchesSeverity = !severityFilter || item.severity === severityFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;
      return matchesSearch && matchesHazardType && matchesSeverity && matchesStatus;
    });
  }, [cases, searchQuery, hazardTypeFilter, severityFilter, statusFilter]);

  const paginatedCases = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage]);

  const stats = useMemo(
    () => ({
      total: cases.length,
      thisMonth: cases.filter((c) => {
        if (!c.created_at) return false;
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      suspected: cases.filter((c) => c.status === t('ehs.ehs_occupational_disease_page.text_20f4b0')).length,
      confirmed: cases.filter((c) => c.status === t('ehs.ehs_occupational_disease_page.text_fbdb93')).length,
    }),
    [cases]
  );

  const columns: ColumnDef<OccupationalDiseaseCase>[] = [
    {
      id: 'case_no',
      label: t('ehs.ehs_occupational_disease_page.text_47f81f'),
      width: 150,
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {row.case_no}
        </Typography>
      ),
    },
    {
      id: 'employee_name',
      label: t('ehs.ehs_occupational_disease_page.text_50df90'),
      width: 120,
      sortable: true,
      render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.employee_name}</Typography>,
    },
    {
      id: 'department',
      label: t('ehs.ehs_occupational_disease_page.text_1e1459'),
      width: 120,
      render: (row) => row.department || '-',
    },
    {
      id: 'hazard_type',
      label: t('ehs.ehs_occupational_disease_page.type'),
      width: 120,
      align: 'center',
      render: (row) => row.hazard_type || '-',
    },
    {
      id: 'diagnosis_date',
      label: t('ehs.ehs_occupational_disease_page.date'),
      width: 140,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarCheck style={{ width: 14, height: 14 }} />
          {row.diagnosis_date ? new Date(row.diagnosis_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'disease_name',
      label: t('ehs.ehs_occupational_disease_page.name'),
      width: 160,
      render: (row) => row.disease_name || '-',
    },
    {
      id: 'severity',
      label: t('ehs.ehs_occupational_disease_page.text_08fe50'),
      width: 100,
      align: 'center',
      render: (row) => getSeverityChip(row.severity),
    },
    {
      id: 'status',
      label: t('ehs.ehs_occupational_disease_page.status'),
      width: 100,
      align: 'center',
      render: (row) => getStatusChip(row.status),
    },
  ];

  const rowActions: RowAction<OccupationalDiseaseCase>[] = [
    {
      label: t('ehs.ehs_occupational_disease_page.view'),
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedCase(row);
        setShowDetailModal(true);
      },
      color: 'primary',
    },
    {
      label: t('ehs.ehs_occupational_disease_page.edit'),
      icon: <Edit size={16} />,
      onClick: (row) => {
        setEditingCase(row);
        setFormData({
          employee_id: row.employee_id || '',
          employee_name: row.employee_name || '',
          department: row.department || '',
          hazard_type: row.hazard_type || '',
          diagnosis_date: row.diagnosis_date ? row.diagnosis_date.split('T')[0] : '',
          disease_type: row.disease_type || '',
          disease_name: row.disease_name || '',
          severity: row.severity || '',
          status: row.status || '',
          description: row.description || '',
        });
        setShowCreateModal(true);
      },
      color: 'primary',
    },
  ];

  const StatCard: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    bgColor: string;
    iconBgColor: string;
    iconColor: string;
  }> = ({ label, value, icon, bgColor, iconBgColor, iconColor }) => (
    <Card sx={{ bgcolor: bgColor }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: iconBgColor,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'slate.600', fontSize: '0.875rem' }}
            >
              {label}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'slate.900' }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const headerContent = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label={t('ehs.ehs_occupational_disease_page.text_5d971b')}
          value={stats.total}
          icon={<HeartPulse />}
          bgColor='error.light'
          iconBgColor='error.lighter'
          iconColor='error.main'
        />
        <StatCard
          label={t('ehs.ehs_occupational_disease_page.add')}
          value={stats.thisMonth}
          icon={<CalendarCheck />}
          bgColor='background.paper'
          iconBgColor='primary.100'
          iconColor='primary.dark'
        />
        <StatCard
          label={t('ehs.ehs_occupational_disease_page.text_4f8157')}
          value={stats.suspected}
          icon={<AlertCircle />}
          bgColor='background.paper'
          iconBgColor='warning.100'
          iconColor={ct.yellow[600]}
        />
        <StatCard
          label={t('ehs.ehs_occupational_disease_page.text_a3211f')}
          value={stats.confirmed}
          icon={<ClipboardList />}
          bgColor='background.paper'
          iconBgColor='error.lighter'
          iconColor='error.dark'
        />
      </Box>
    ),
    [stats]
  );

  const resetFormData = () => {
    setFormData({
      employee_id: '',
      employee_name: '',
      department: '',
      hazard_type: '',
      diagnosis_date: '',
      disease_type: '',
      disease_name: '',
      severity: '',
      status: '',
      description: '',
    });
    setEditingCase(null);
  };

  const handleCreate = () => {
    resetFormData();
    setShowCreateModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (variables: { id?: string; data: CreateOccupationalDiseaseCaseRequest }) => {
      if (variables.id) {
        return ehsApi.occupationalDiseases.updateOccupationalDiseaseCase(
          variables.id,
          variables.data
        );
      }
      return ehsApi.occupationalDiseases.createOccupationalDiseaseCase(variables.data);
    },
    onSuccess: (_data, variables) => {
      addNotification({
        title: t('ehs.ehs_occupational_disease_page.success'),
        message: variables.id ? t('ehs.ehs_occupational_disease_page.update') : t('ehs.ehs_occupational_disease_page.create'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.OCCUPATIONAL_DISEASES });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('ehs.ehs_occupational_disease_page.error'),
        message: editingCase ? t('ehs.ehs_occupational_disease_page.update_1') : t('ehs.ehs_occupational_disease_page.create_1'),
        type: 'error',
      });
      apiLogger.error(t('ehs.ehs_occupational_disease_page.save'), error);
    },
  });

  const handleSave = () => {
    if (!formData.employee_name.trim()) {
      addNotification({ title: t('ehs.ehs_occupational_disease_page.error'), message: t('ehs.ehs_occupational_disease_page.please_input'), type: 'error' });
      return;
    }
    if (!formData.department.trim()) {
      addNotification({ title: t('ehs.ehs_occupational_disease_page.error'), message: t('ehs.ehs_occupational_disease_page.please_input_1'), type: 'error' });
      return;
    }
    if (!formData.disease_name.trim()) {
      addNotification({ title: t('ehs.ehs_occupational_disease_page.error'), message: t('ehs.ehs_occupational_disease_page.please_input_2'), type: 'error' });
      return;
    }
    const payload: CreateOccupationalDiseaseCaseRequest = {
      employee_id: formData.employee_id,
      employee_name: formData.employee_name,
      department: formData.department || null,
      hazard_factor: formData.hazard_type || null,
      diagnosis_date: formData.diagnosis_date || null,
      disease_type: formData.disease_type,
      disease_name: formData.disease_name,
      severity: (formData.severity as 'mild' | 'moderate' | 'severe' | 'fatal') || undefined,
      status: (formData.status as 'suspected' | 'confirmed' | 'recovered' | 'chronic' | 'deceased') || undefined,
    };
    saveMutation.mutate({ id: editingCase?.id, data: payload });
  };

  const headerActions = [
    {
      label: t('ehs.ehs_occupational_disease_page.add_1'),
      icon: <Plus sx={{ width: 16, height: 16 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'primary' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <HeartPulse sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <ListPageTemplate
        title=''
        columns={columns}
        data={paginatedCases}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total: filteredCases.length,
          onPageChange: setCurrentPage,
        }}
        searchable
        searchPlaceholder={t('ehs.ehs_occupational_disease_page.search')}
        searchValue={searchQuery}
        onSearch={(value) => {
          setSearchQuery(value);
          setCurrentPage(0);
        }}
        filters={[
          {
            id: 'hazard_type',
            label: t('ehs.ehs_occupational_disease_page.type'),
            type: 'select',
            value: hazardTypeFilter,
            onChange: (value) => {
              setHazardTypeFilter(String(value));
              setCurrentPage(0);
            },
            options: [{ label: t('ehs.ehs_occupational_disease_page.all'), value: '' }, ...hazardTypeOptions],
          },
          {
            id: 'severity',
            label: t('ehs.ehs_occupational_disease_page.text_08fe50'),
            type: 'select',
            value: severityFilter,
            onChange: (value) => {
              setSeverityFilter(String(value));
              setCurrentPage(0);
            },
            options: [{ label: t('ehs.ehs_occupational_disease_page.all'), value: '' }, ...severityOptions],
          },
          {
            id: 'status',
            label: t('ehs.ehs_occupational_disease_page.status'),
            type: 'select',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(String(value));
              setCurrentPage(0);
            },
            options: [{ label: t('ehs.ehs_occupational_disease_page.all'), value: '' }, ...statusOptions],
          },
        ]}
        rowActions={rowActions}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.OCCUPATIONAL_DISEASES })
        }
        showRowNumber
        headerContent={headerContent}
      />

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editingCase ? t('ehs.ehs_occupational_disease_page.edit_1') : t('ehs.ehs_occupational_disease_page.add_2')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.ehs_occupational_disease_page.text_88eff5')}
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                placeholder={t('ehs.ehs_occupational_disease_page.please_input')}
              />
              <TextField
                fullWidth
                label={t('ehs.ehs_occupational_disease_page.text_d4b3e6')}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder={t('ehs.ehs_occupational_disease_page.please_input_1')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>危害因素类型</InputLabel>
                <Select
                  value={formData.hazard_type}
                  label={t('ehs.ehs_occupational_disease_page.type')}
                  onChange={(e) => setFormData({ ...formData, hazard_type: e.target.value })}
                >
                  {hazardTypeOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type='date'
                label={t('ehs.ehs_occupational_disease_page.date')}
                value={formData.diagnosis_date}
                onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
            </Box>
            <TextField
              fullWidth
              label={t('ehs.ehs_occupational_disease_page.name_1')}
              value={formData.disease_name}
              onChange={(e) => setFormData({ ...formData, disease_name: e.target.value })}
              placeholder={t('ehs.ehs_occupational_disease_page.please_input_2')}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>严重程度</InputLabel>
                <Select
                  value={formData.severity}
                  label={t('ehs.ehs_occupational_disease_page.text_08fe50')}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  {severityOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status}
                  label={t('ehs.ehs_occupational_disease_page.status')}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statusOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label={t('ehs.ehs_occupational_disease_page.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('ehs.ehs_occupational_disease_page.please_input_3')}
              multiline
              rows={4}
            />
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
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>案例详情</DialogTitle>
        <DialogContent>
          {selectedCase ? (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    案例编号
                  </Typography>
                  <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                    {selectedCase.case_no}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    员工姓名
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{selectedCase.employee_name}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    部门
                  </Typography>
                  <Typography>{selectedCase.department || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    危害因素类型
                  </Typography>
                  <Typography>{selectedCase.hazard_type || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    诊断日期
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarCheck style={{ width: 16, height: 16 }} />
                    {selectedCase.diagnosis_date
                      ? new Date(selectedCase.diagnosis_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    职业病名称
                  </Typography>
                  <Typography>{selectedCase.disease_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    严重程度
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{getSeverityChip(selectedCase.severity)}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    状态
                  </Typography>
                  <Typography sx={{ mt: 0.5 }}>{getStatusChip(selectedCase.status)}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  描述
                </Typography>
                <Typography>{selectedCase.description || t('ehs.ehs_occupational_disease_page.description_1')}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>暂无详情数据</Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsOccupationalDiseasePage;
