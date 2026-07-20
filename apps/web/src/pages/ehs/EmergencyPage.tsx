import React, { useState, useMemo } from 'react';
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
import { Plus, Eye, Activity, FileText, Users, AlertCircle } from 'lucide-react';
import { ListPageTemplate } from '@/components';
import type { ColumnDef, RowAction, FilterConfig } from '@/components';
import { PageContainer } from '@/components/common';
import { ehsApi } from '@/api/ehs';
import type { DrillRecord, CreateDrillRecordRequest } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useCrudOperations, type CrudOperations } from '@/hooks/useCrudQueries';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const drillCrudApi: CrudOperations<DrillRecord, CreateDrillRecordRequest> = {
  list: (params) => ehsApi.listDrills(params),
  get: (id) => ehsApi.getDrill(id),
  create: (data) => ehsApi.createDrill(data),
  update: (id, data) => ehsApi.updateDrill(id, data),
  delete: (id) =>
    ehsApi.deleteDrill(id) as unknown as Promise<{
      success: boolean;
      code: number;
      message: string;
      data?: string;
    }>,
};

const EmergencyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formData, setFormData] = useState({
    drill_no: '',
    drill_name: '',
    plan_id: '' as string | null,
    drill_date: '',
    participants: '',
    duration_hours: '',
    location: '',
    summary: '',
    issues_found: '',
    improvements: '',
    status: 'draft' as const,
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    data: drills,
    loading,
    refresh,
    create: createDrill,
  } = useCrudOperations<DrillRecord, CreateDrillRecordRequest>({
    api: drillCrudApi,
    queryKey: 'ehs-emergency-drills',
    defaultPageSize: 100,
  });

  const loadDrillDetail = async (drillId: string) => {
    try {
      setDetailLoading(true);
      const response = await ehsApi.getDrill(drillId);
      if (response.success && response.data) {
        setSelectedDrill(response.data as DrillRecord);
      }
    } catch (err: unknown) {
      apiLogger.error(t('ehs.emergency_page.detail'), err);
      addNotification({ title: t('ehs.emergency_page.error'), message: t('ehs.emergency_page.detail_1'), type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      draft: { bg: 'grey.100', color: 'text.secondary' },
      planned: { bg: 'info.lighter', color: 'info.dark' },
      ongoing: { bg: 'warning.lighter', color: 'warning.dark' },
      completed: { bg: 'success.lighter', color: 'success.dark' },
      cancelled: { bg: 'error.lighter', color: 'error.dark' },
    };
    const statusLabels: Record<string, string> = {
      draft: t('ehs.emergency_page.text_22b433'),
      planned: t('ehs.emergency_page.plan'),
      ongoing: t('ehs.emergency_page.in_progress'),
      completed: t('ehs.emergency_page.completed'),
      cancelled: t('ehs.emergency_page.cancelled'),
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

  const columns = useMemo<ColumnDef<DrillRecord>[]>(
    () => [
      {
        id: 'drill_no',
        label: t('ehs.emergency_page.text_855fce'),
        render: (row) => row.drill_no,
      },
      {
        id: 'drill_name',
        label: t('ehs.emergency_page.name'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.drill_name}
          </Typography>
        ),
      },
      {
        id: 'drill_date',
        label: t('ehs.emergency_page.date'),
        render: (row) => row.drill_date || '-',
      },
      {
        id: 'duration_hours',
        label: t('ehs.emergency_page.text_68f989'),
        render: (row) => row.duration_hours || '-',
      },
      {
        id: 'location',
        label: t('ehs.emergency_page.text_fc1a7d'),
        render: (row) => row.location || '-',
      },
      {
        id: 'status',
        label: t('ehs.emergency_page.status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const handleViewDetail = async (drill: DrillRecord) => {
    setSelectedDrill(drill);
    setShowDetailModal(true);
    await loadDrillDetail(drill.id);
  };

  const rowActions = useMemo<RowAction<DrillRecord>[]>(
    () => [
      {
        label: t('ehs.emergency_page.detail_2'),
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
        label: t('ehs.emergency_page.status'),
        type: 'select',
        options: [
          { value: '', label: t('ehs.emergency_page.all') },
          { value: 'draft', label: t('ehs.emergency_page.text_22b433') },
          { value: 'planned', label: t('ehs.emergency_page.plan') },
          { value: 'ongoing', label: t('ehs.emergency_page.in_progress') },
          { value: 'completed', label: t('ehs.emergency_page.completed') },
          { value: 'cancelled', label: t('ehs.emergency_page.cancelled') },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const filteredDrills = useMemo(() => {
    return drills.filter((drill) => {
      const matchesSearch =
        drill.drill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drill.drill_no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || drill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drills, searchTerm, statusFilter]);

  const handleCreate = () => {
    setFormData({
      drill_no: '',
      drill_name: '',
      plan_id: null,
      drill_date: '',
      participants: '',
      duration_hours: '',
      location: '',
      summary: '',
      issues_found: '',
      improvements: '',
      status: 'draft',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await createDrill({
        drill_no: formData.drill_no,
        drill_name: formData.drill_name,
        plan_id: formData.plan_id || null,
        drill_date: formData.drill_date || null,
        participants: formData.participants
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s),
        duration_hours: Number(formData.duration_hours) || 0,
        location: formData.location || null,
        summary: formData.summary || null,
        issues_found: formData.issues_found || null,
        improvements: formData.improvements || null,
      });
      addNotification({ title: t('ehs.emergency_page.success'), message: t('ehs.emergency_page.create'), type: 'success' });
      setShowCreateModal(false);
    } catch (err: unknown) {
      addNotification({ title: t('ehs.emergency_page.error'), message: t('ehs.emergency_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.emergency_page.create_2'), err);
    }
  };

  const stats = useMemo(
    () => ({
      total: drills.length,
      completed: drills.filter((d) => d.status === 'completed').length,
      planned: drills.filter((d) => d.status === 'planned' || d.status === 'ongoing').length,
    }),
    [drills]
  );

  const headerActions = [
    {
      label: t('ehs.emergency_page.add'),
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
        pageIcon: <AlertCircle sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
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
        <Card sx={{ bgcolor: 'warning.light' }}>
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
                <FileText sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  演练总数
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
                <Activity sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已完成
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.completed}
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
                  bgcolor: 'info.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertCircle sx={{ width: 20, height: 20, color: 'info.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  计划/进行中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.planned}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ListPageTemplate<DrillRecord>
        title={t('ehs.emergency_page.list')}
        columns={columns}
        data={filteredDrills}
        loading={loading}
        searchable
        searchPlaceholder={t('ehs.emergency_page.search')}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        onRefresh={refresh}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增应急演练</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.emergency_page.text_ebb463')}
                value={formData.drill_no}
                onChange={(e) => setFormData({ ...formData, drill_no: e.target.value })}
                placeholder={t('ehs.emergency_page.please_input')}
              />
              <TextField
                fullWidth
                label={t('ehs.emergency_page.name_1')}
                value={formData.drill_name}
                onChange={(e) => setFormData({ ...formData, drill_name: e.target.value })}
                placeholder={t('ehs.emergency_page.please_input_1')}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.emergency_page.date')}
                type='date'
                value={formData.drill_date}
                onChange={(e) => setFormData({ ...formData, drill_date: e.target.value })}
              />
              <TextField
                fullWidth
                label={t('ehs.emergency_page.text_68f989')}
                type='number'
                value={formData.duration_hours}
                onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                placeholder={t('ehs.emergency_page.please_input_2')}
              />
            </Box>
            <TextField
              fullWidth
              label={t('ehs.emergency_page.text_fc1a7d')}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('ehs.emergency_page.please_input_3')}
            />
            <TextField
              fullWidth
              label={t('ehs.emergency_page.participant')}
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder={t('ehs.emergency_page.participant_1')}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label={t('ehs.emergency_page.text_8f8a23')}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder={t('ehs.emergency_page.please_input_4')}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label={t('ehs.emergency_page.text_fa77ab')}
              value={formData.issues_found}
              onChange={(e) => setFormData({ ...formData, issues_found: e.target.value })}
              placeholder={t('ehs.emergency_page.please_input_5')}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label={t('ehs.emergency_page.text_a8f639')}
              value={formData.improvements}
              onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
              placeholder={t('ehs.emergency_page.please_input_6')}
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label={t('ehs.emergency_page.status')}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as typeof formData.status })
                }
              >
                <MenuItem value='draft'>草稿</MenuItem>
                <MenuItem value='planned'>已计划</MenuItem>
                <MenuItem value='ongoing'>进行中</MenuItem>
                <MenuItem value='completed'>已完成</MenuItem>
                <MenuItem value='cancelled'>已取消</MenuItem>
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
            sx={{ bgcolor: 'warning.dark' }}
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
        <DialogTitle>应急演练详情</DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'warning.main',
                  borderTopColor: 'warning.dark',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
            </Box>
          ) : (
            selectedDrill && (
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
                    演练编号
                  </Box>
                  <Box sx={{ fontWeight: 500 }}>{selectedDrill.drill_no}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    演练名称
                  </Box>
                  <Box>{selectedDrill.drill_name}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    演练日期
                  </Box>
                  <Box>{selectedDrill.drill_date || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    时长(小时)
                  </Box>
                  <Box>{selectedDrill.duration_hours || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    地点
                  </Box>
                  <Box>{selectedDrill.location || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    状态
                  </Box>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedDrill.status)}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    参与人员
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Users style={{ width: 16, height: 16 }} />
                    {Array.isArray(selectedDrill.participants)
                      ? selectedDrill.participants.join(', ')
                      : selectedDrill.participants || '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    演练概要
                  </Box>
                  <Box>{selectedDrill.summary || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    发现问题
                  </Box>
                  <Box>{selectedDrill.issues_found || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Box
                    component='span'
                    sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                  >
                    改进措施
                  </Box>
                  <Box>{selectedDrill.improvements || '-'}</Box>
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

export default EmergencyPage;
