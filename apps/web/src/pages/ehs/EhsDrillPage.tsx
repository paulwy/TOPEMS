import React, { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Plus, Eye, Clock, Users, Calendar } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { DrillRecord } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EhsDrillPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;
  const [formData, setFormData] = useState({
    drill_no: '',
    name: '',
    drill_type: '',
    date: '',
    participants: '',
    location: '',
    duration: '',
    evaluation: '',
    issues: '',
  });

  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: t('ehs.ehs_drill_page.completed'),
      scheduled: t('ehs.ehs_drill_page.plan'),
      in_progress: t('ehs.ehs_drill_page.in_progress'),
    };
    return statusMap[status] || status;
  };

  const drillsQuery = useQuery<DrillRecord[]>({
    queryKey: ['ehs-drills'],
    queryFn: async () => {
      const response = await ehsApi.listDrills();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const drillsData = (
          Array.isArray(data)
            ? (data as unknown as Record<string, unknown>[])
            : (data.data as unknown as Record<string, unknown>[]) || []
        ) as unknown as Record<string, unknown>[];
        return drillsData.map((item) => ({
          ...item,
          status: translateStatus(item.status as string),
        })) as DrillRecord[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const drills = drillsQuery.data || [];
  const loading = drillsQuery.isLoading;

  const drillDetailQuery = useQuery<DrillRecord | null>({
    queryKey: ['ehs-drill-detail', selectedDrill?.id],
    queryFn: async () => {
      if (!selectedDrill?.id) return null;
      const response = await ehsApi.getDrill(selectedDrill.id);
      if (response.success && response.data) {
        const drillData = response.data as unknown as Record<string, unknown>;
        return {
          ...drillData,
          status: translateStatus(drillData.status as string),
        } as DrillRecord;
      }
      return null;
    },
    enabled: !!selectedDrill?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  const detailLoading = drillDetailQuery.isFetching;

  const createDrillMutation = useMutation({
    mutationFn: async (data: any) => {
      return ehsApi.createDrill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-drills'] });
      addNotification({ title: t('ehs.ehs_drill_page.success'), message: t('ehs.ehs_drill_page.create'), type: 'success' });
      setShowCreateModal(false);
    },
    onError: (err) => {
      addNotification({ title: t('ehs.ehs_drill_page.error'), message: t('ehs.ehs_drill_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.ehs_drill_page.create_2'), err);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      已完成: { bg: 'success.lighter', color: 'success.dark' },
      已计划: { bg: 'primary.100', color: 'primary.main' },
      进行中: { bg: 'warning.100', color: ct.yellow[600] },
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

  const filteredDrills = useMemo(() => {
    return drills.filter((drill) => {
      const matchesSearch =
        drill.drill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drill.drill_no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || drill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [drills, searchTerm, statusFilter]);

  const paginatedDrills = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredDrills.slice(start, start + pageSize);
  }, [filteredDrills, currentPage]);

  const stats = useMemo(
    () => ({
      total: drills.length,
      completed: drills.filter((d) => d.status === t('ehs.ehs_drill_page.completed')).length,
      scheduled: drills.filter((d) => d.status === t('ehs.ehs_drill_page.plan')).length,
      inProgress: drills.filter((d) => d.status === t('ehs.ehs_drill_page.in_progress')).length,
    }),
    [drills]
  );

  const handleView = (drill: DrillRecord) => {
    setSelectedDrill(drill);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      drill_no: '',
      name: '',
      drill_type: '',
      date: '',
      participants: '',
      location: '',
      duration: '',
      evaluation: '',
      issues: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    createDrillMutation.mutate({
      drill_no: formData.drill_no,
      drill_name: formData.name,
      drill_date: formData.date || null,
      participants: formData.participants
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      location: formData.location || null,
      duration_hours: parseInt(formData.duration) || 0,
      summary: formData.evaluation || null,
      issues_found: formData.issues || null,
    });
  };

  const columns: ColumnDef<DrillRecord>[] = [
    {
      id: 'drill_no',
      label: t('ehs.ehs_drill_page.text_855fce'),
      width: 120,
      sortable: true,
    },
    {
      id: 'drill_name',
      label: t('ehs.ehs_drill_page.name'),
      width: 200,
      sortable: true,
      render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.drill_name}</Typography>,
    },
    {
      id: 'drill_date',
      label: t('ehs.ehs_drill_page.date'),
      width: 130,
      sortable: true,
      render: (row) => row.drill_date || '-',
    },
    {
      id: 'location',
      label: t('ehs.ehs_drill_page.text_fc1a7d'),
      width: 150,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'participants',
      label: t('ehs.ehs_drill_page.participant'),
      width: 100,
      align: 'center',
      render: (row) => {
        const count = row.participants;
        if (Array.isArray(count)) return count.length;
        return count || '-';
      },
    },
    {
      id: 'status',
      label: t('ehs.ehs_drill_page.status'),
      width: 100,
      align: 'center',
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const rowActions: RowAction<DrillRecord>[] = [
    {
      label: t('ehs.ehs_drill_page.detail'),
      icon: <Eye size={16} />,
      onClick: (row) => handleView(row),
      color: 'primary',
    },
  ];

  const filters = [
    {
      id: 'status',
      label: t('ehs.ehs_drill_page.status'),
      type: 'select' as const,
      value: statusFilter,
      options: [
        { label: t('ehs.ehs_drill_page.all'), value: 'all' },
        { label: t('ehs.ehs_drill_page.completed'), value: t('ehs.ehs_drill_page.completed') },
        { label: t('ehs.ehs_drill_page.plan'), value: t('ehs.ehs_drill_page.plan') },
        { label: t('ehs.ehs_drill_page.in_progress'), value: t('ehs.ehs_drill_page.in_progress') },
      ],
      onChange: (value: unknown) => {
        setStatusFilter(value as string);
        setCurrentPage(0);
      },
    },
  ];

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
          label={t('ehs.ehs_drill_page.text_f6b2fd')}
          value={stats.total}
          icon={<Clock sx={{ width: 20, height: 20, color: 'warning.main' }} />}
          bgColor='warning.light'
          iconBgColor='warning.lighter'
        />
        <StatCard
          label={t('ehs.ehs_drill_page.completed')}
          value={stats.completed}
          icon={<Clock sx={{ width: 20, height: 20, color: 'success.dark' }} />}
          bgColor='white'
          iconBgColor='success.lighter'
        />
        <StatCard
          label={t('ehs.ehs_drill_page.plan')}
          value={stats.scheduled}
          icon={<Clock sx={{ width: 20, height: 20, color: 'primary.main' }} />}
          bgColor='white'
          iconBgColor='primary.100'
        />
        <StatCard
          label={t('ehs.ehs_drill_page.in_progress')}
          value={stats.inProgress}
          icon={<Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />}
          bgColor='white'
          iconBgColor='warning.100'
        />
      </Box>
    ),
    [stats]
  );

  const headerActions = [
    {
      label: t('ehs.ehs_drill_page.add'),
      icon: <Plus size={16} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'warning' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <Clock sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <ListPageTemplate
        title=''
        columns={columns}
        data={paginatedDrills}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total: filteredDrills.length,
          onPageChange: setCurrentPage,
        }}
        searchable
        searchPlaceholder={t('ehs.ehs_drill_page.search')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(0);
        }}
        filters={filters}
        filtersValue={{ status: statusFilter }}
        onFilterChange={(f) => {
          if (f.status !== undefined) {
            setStatusFilter(f.status);
            setCurrentPage(0);
          }
        }}
        rowActions={rowActions}
        onRefresh={() => drillsQuery.refetch()}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='ehs-drill-columns'
        headerContent={headerContent}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增演练记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.text_ebb463')}
              value={formData.drill_no}
              onChange={(e) => setFormData({ ...formData, drill_no: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.please_input')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.name_1')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.please_input_1')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.type')}
              value={formData.drill_type}
              onChange={(e) => setFormData({ ...formData, drill_type: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.please_input_2')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.date')}
              type='date'
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.participant_1')}
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.personnel')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.text_836dce')}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.please_input_3')}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.text_3c7fbd')}
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.text_c5f072')}
              type='number'
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.text_022fe6')}
              value={formData.evaluation}
              onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.please_input_4')}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label={t('ehs.ehs_drill_page.text_fa77ab')}
              value={formData.issues}
              onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
              placeholder={t('ehs.ehs_drill_page.text_adbc7e')}
              multiline
              rows={2}
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
            color='warning'
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
        <DialogTitle>演练记录详情</DialogTitle>
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
            (drillDetailQuery.data || selectedDrill) && (
              <Box
                sx={{
                  pt: 2,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练编号
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {(drillDetailQuery.data || selectedDrill)?.drill_no}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练名称
                  </Typography>
                  <Typography>{(drillDetailQuery.data || selectedDrill)?.drill_name}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusBadge((drillDetailQuery.data || selectedDrill)?.status || '')}
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练日期
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar style={{ width: 16, height: 16 }} />
                    {(drillDetailQuery.data || selectedDrill)?.drill_date || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    参与人员
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Users style={{ width: 16, height: 16 }} />
                    {Array.isArray((drillDetailQuery.data || selectedDrill)?.participants)
                      ? (drillDetailQuery.data || selectedDrill)?.participants?.join(', ')
                      : (drillDetailQuery.data || selectedDrill)?.participants || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练地点
                  </Typography>
                  <Typography>
                    {(drillDetailQuery.data || selectedDrill)?.location || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练时长
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock style={{ width: 16, height: 16 }} />
                    {(drillDetailQuery.data || selectedDrill)?.duration_hours || '-'}小时
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    演练评估
                  </Typography>
                  <Typography>
                    {(drillDetailQuery.data || selectedDrill)?.summary || '-'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    发现问题
                  </Typography>
                  <Typography>
                    {(drillDetailQuery.data || selectedDrill)?.issues_found || '-'}
                  </Typography>
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

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  iconBgColor: string;
}> = ({ label, value, icon, bgColor, iconBgColor }) => (
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
          {icon}
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default EhsDrillPage;
