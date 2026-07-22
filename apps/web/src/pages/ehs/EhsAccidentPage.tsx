import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Trash2,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ehsApi } from '@/api/ehs';
import type { Accident, AccidentDetail, TreatmentAction } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { EHS_PATHS } from '@/modules/ehs/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EhsAccidentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    accident_type: '',
    severity: 'minor',
    location: '',
    occurred_at: '',
    reported_by: '',
    casualties: 0,
    economic_loss: 0,
  });

  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('ehs.ehs_accident_page.pending'),
      investigating: t('ehs.ehs_accident_page.text_913542'),
      processing: t('ehs.ehs_accident_page.text_5d459d'),
      resolved: t('ehs.ehs_accident_page.text_d7d257'),
      closed: t('ehs.ehs_accident_page.text_039892'),
    };
    return statusMap[status] || status;
  };

  const translateSeverity = (severity: string) => {
    const severityMap: Record<string, string> = {
      minor: t('ehs.ehs_accident_page.text_b3bd3d'),
      moderate: t('ehs.ehs_accident_page.text_2ab01e'),
      serious: t('ehs.ehs_accident_page.text_e2e27a'),
      fatal: t('ehs.ehs_accident_page.text_a7551e'),
    };
    return severityMap[severity] || severity;
  };

  const accidentsQuery = useQuery<Accident[]>({
    queryKey: ['ehs-accidents'],
    queryFn: async () => {
      const response = await ehsApi.listAccidents({ pagesize: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        const accidentsData = (
          Array.isArray(data)
            ? (data as unknown as Record<string, unknown>[])
            : (data.data as unknown as Record<string, unknown>[]) || []
        ) as unknown as Record<string, unknown>[];
        return accidentsData.map((item) => ({
          ...item,
          status: translateStatus(item.status as string),
          severity: translateSeverity(item.severity as string),
        })) as Accident[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const accidents = accidentsQuery.data || [];
  const loading = accidentsQuery.isLoading;

  useEffect(() => {
    if (accidentsQuery.isError) {
      addNotification({ title: t('ehs.ehs_accident_page.error'), message: t('ehs.ehs_accident_page.list'), type: 'error' });
    }
  }, [accidentsQuery.isError, addNotification]);

  const accidentDetailQuery = useQuery<AccidentDetail | null>({
    queryKey: ['ehs-accident-detail', selectedAccident?.id],
    queryFn: async () => {
      if (!selectedAccident?.id) return null;
      const response = await ehsApi.getAccident(selectedAccident.id);
      if (response.success && response.data) {
        const data = response.data as unknown as AccidentDetail;
        return {
          ...data,
          accident: {
            ...data.accident,
            status: translateStatus(data.accident.status),
            severity: translateSeverity(data.accident.severity),
          },
        };
      }
      return null;
    },
    enabled: !!selectedAccident?.id && showDetailModal,
    staleTime: 5 * 60 * 1000,
  });

  const detailLoading = accidentDetailQuery.isFetching;
  const accidentDetail = accidentDetailQuery.data;

  const createAccidentMutation = useMutation({
    mutationFn: async (data: any) => {
      return ehsApi.createAccident(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-accidents'] });
      addNotification({ title: t('ehs.ehs_accident_page.success'), message: t('ehs.ehs_accident_page.success_1'), type: 'success' });
      setShowCreateModal(false);
    },
    onError: (err) => {
      addNotification({ title: t('ehs.ehs_accident_page.error'), message: t('ehs.ehs_accident_page.fail'), type: 'error' });
      apiLogger.error(t('ehs.ehs_accident_page.create'), err);
    },
  });

  const deleteAccidentMutation = useMutation({
    mutationFn: async (id: string) => {
      return ehsApi.deleteIncident(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehs-accidents'] });
      addNotification({ title: t('ehs.ehs_accident_page.success'), message: t('ehs.ehs_accident_page.delete_success'), type: 'success' });
      setShowDetailModal(false);
    },
    onError: (err) => {
      addNotification({ title: t('ehs.ehs_accident_page.error'), message: t('ehs.ehs_accident_page.delete'), type: 'error' });
      apiLogger.error(t('ehs.ehs_accident_page.delete_1'), err);
    },
  });

  const getSeverityChip = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string }> = {
      轻微: { bg: 'success.lighter', color: 'success.dark' },
      一般: { bg: 'warning.100', color: ct.yellow[600] },
      严重: { bg: 'error.lighter', color: 'error.dark' },
      致命: { bg: 'error.light', color: 'error.darker' },
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
      待处理: { bg: 'warning.100', color: ct.yellow[600] },
      调查中: { bg: 'primary.100', color: 'primary.dark' },
      处理中: { bg: 'warning.light', color: 'warning.dark' },
      已解决: { bg: 'success.lighter', color: 'success.dark' },
      已结案: { bg: 'grey.100', color: 'text.secondary' },
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

  const filteredAccidents = useMemo(() => {
    return accidents.filter((accident) => {
      const matchesSearch =
        accident.accident_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        accident.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (accident.location && accident.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSeverity = !severityFilter || accident.severity === severityFilter;
      const matchesStatus = !statusFilter || accident.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [accidents, searchQuery, severityFilter, statusFilter]);

  const paginatedAccidents = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredAccidents.slice(start, start + pageSize);
  }, [filteredAccidents, currentPage]);

  const stats = useMemo(
    () => ({
      total: accidents.length,
      pending: accidents.filter((a) => a.status === t('ehs.ehs_accident_page.pending')).length,
      investigating: accidents.filter((a) => a.status === t('ehs.ehs_accident_page.text_913542')).length,
      processing: accidents.filter((a) => a.status === t('ehs.ehs_accident_page.text_5d459d')).length,
      closed: accidents.filter((a) => a.status === t('ehs.ehs_accident_page.text_039892')).length,
      serious: accidents.filter((a) => a.severity === t('ehs.ehs_accident_page.text_e2e27a') || a.severity === t('ehs.ehs_accident_page.text_a7551e')).length,
    }),
    [accidents]
  );

  const columns: ColumnDef<Accident>[] = [
    {
      id: 'accident_no',
      label: t('ehs.ehs_accident_page.text_854259'),
      width: 150,
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {row.accident_no}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: t('ehs.ehs_accident_page.title'),
      width: 200,
      sortable: true,
      render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.title}</Typography>,
    },
    {
      id: 'accident_type',
      label: t('ehs.ehs_accident_page.type'),
      width: 120,
      render: (row) => row.accident_type || '-',
    },
    {
      id: 'severity',
      label: t('ehs.ehs_accident_page.text_08fe50'),
      width: 100,
      align: 'center',
      render: (row) => getSeverityChip(row.severity),
    },
    {
      id: 'location',
      label: t('ehs.ehs_accident_page.text_fc1a7d'),
      width: 150,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'occurred_at',
      label: t('ehs.ehs_accident_page.time'),
      width: 160,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar style={{ width: 14, height: 14 }} />
          {row.occurred_at ? new Date(row.occurred_at).toLocaleString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'reported_by',
      label: t('ehs.ehs_accident_page.text_7a0acc'),
      width: 100,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User style={{ width: 14, height: 14 }} />
          {row.reported_by || '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('ehs.ehs_accident_page.status'),
      width: 100,
      align: 'center',
      render: (row) => getStatusChip(row.status),
    },
  ];

  const rowActions: RowAction<Accident>[] = [
    {
      label: t('ehs.ehs_accident_page.detail'),
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedAccident(row);
        setShowDetailModal(true);
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
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label={t('ehs.ehs_accident_page.text_03db7f')}
          value={stats.total}
          icon={<AlertCircle />}
          bgColor='error.light'
          iconBgColor='error.lighter'
          iconColor='error.main'
        />
        <StatCard
          label={t('ehs.ehs_accident_page.pending')}
          value={stats.pending}
          icon={<AlertCircle />}
          bgColor='background.paper'
          iconBgColor='warning.100'
          iconColor={ct.yellow[600]}
        />
        <StatCard
          label={t('ehs.ehs_accident_page.text_913542')}
          value={stats.investigating}
          icon={<AlertTriangle />}
          bgColor='background.paper'
          iconBgColor='primary.100'
          iconColor='primary.dark'
        />
        <StatCard
          label={t('ehs.ehs_accident_page.text_039892')}
          value={stats.closed}
          icon={<AlertCircle />}
          bgColor='background.paper'
          iconBgColor='success.lighter'
          iconColor='success.dark'
        />
        <StatCard
          label={t('ehs.ehs_accident_page.text_7af942')}
          value={stats.serious}
          icon={<AlertTriangle />}
          bgColor='background.paper'
          iconBgColor='error.lighter'
          iconColor='error.dark'
        />
      </Box>
    ),
    [stats]
  );

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      accident_type: '',
      severity: 'minor',
      location: '',
      occurred_at: '',
      reported_by: '',
      casualties: 0,
      economic_loss: 0,
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      addNotification({ title: t('ehs.ehs_accident_page.error'), message: t('ehs.ehs_accident_page.please_input'), type: 'error' });
      return;
    }
    createAccidentMutation.mutate({
      title: formData.title,
      description: formData.description || null,
      accident_type: formData.accident_type || null,
      severity: formData.severity,
      location: formData.location || null,
      occurred_at: formData.occurred_at || null,
      casualties: formData.casualties || null,
      economic_loss: formData.economic_loss || null,
      reported_by: formData.reported_by || null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('ehs.ehs_accident_page.confirm'))) return;
    deleteAccidentMutation.mutate(id);
  };

  return (
    <PageContainer>
      <>
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: t('ehs.ehs_accident_page.home'), href: '/dashboard' },
            { label: t('ehs.ehs_accident_page.text_fc3b32'), href: EHS_PATHS.root },
            { label: t('ehs.ehs_accident_page.text_53ac81') },
          ]}
          columns={columns}
          data={paginatedAccidents}
          loading={loading}
          pagination={{
            page: currentPage,
            pageSize,
            total: filteredAccidents.length,
            onPageChange: setCurrentPage,
          }}
          searchable
          searchPlaceholder={t('ehs.ehs_accident_page.search')}
          searchValue={searchQuery}
          onSearch={(value) => {
            setSearchQuery(value);
            setCurrentPage(0);
          }}
          filters={[
            {
              id: 'severity',
              label: t('ehs.ehs_accident_page.text_08fe50'),
              type: 'select',
              value: severityFilter,
              onChange: (value) => {
                setSeverityFilter(String(value));
                setCurrentPage(0);
              },
              options: [
                { label: t('ehs.ehs_accident_page.all'), value: '' },
                { label: t('ehs.ehs_accident_page.text_b3bd3d'), value: t('ehs.ehs_accident_page.text_b3bd3d') },
                { label: t('ehs.ehs_accident_page.text_2ab01e'), value: t('ehs.ehs_accident_page.text_2ab01e') },
                { label: t('ehs.ehs_accident_page.text_e2e27a'), value: t('ehs.ehs_accident_page.text_e2e27a') },
                { label: t('ehs.ehs_accident_page.text_a7551e'), value: t('ehs.ehs_accident_page.text_a7551e') },
              ],
            },
            {
              id: 'status',
              label: t('ehs.ehs_accident_page.status'),
              type: 'select',
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(String(value));
                setCurrentPage(0);
              },
              options: [
                { label: t('ehs.ehs_accident_page.all'), value: '' },
                { label: t('ehs.ehs_accident_page.pending'), value: t('ehs.ehs_accident_page.pending') },
                { label: t('ehs.ehs_accident_page.text_913542'), value: t('ehs.ehs_accident_page.text_913542') },
                { label: t('ehs.ehs_accident_page.text_5d459d'), value: t('ehs.ehs_accident_page.text_5d459d') },
                { label: t('ehs.ehs_accident_page.text_039892'), value: t('ehs.ehs_accident_page.text_039892') },
              ],
            },
          ]}
          actions={[
            {
              label: t('ehs.ehs_accident_page.text_e5f867'),
              icon: <Plus sx={{ width: 16, height: 16 }} />,
              onClick: handleCreate,
              variant: 'contained',
            },
          ]}
          rowActions={rowActions}
          onRefresh={() => accidentsQuery.refetch()}
          showRowNumber
          headerContent={headerContent}
        />

        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>事故上报</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label={t('ehs.ehs_accident_page.title_1')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('ehs.ehs_accident_page.please_input')}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label={t('ehs.ehs_accident_page.type')}
                  value={formData.accident_type}
                  onChange={(e) => setFormData({ ...formData, accident_type: e.target.value })}
                  placeholder={t('ehs.ehs_accident_page.text_a388a0')}
                />
                <FormControl fullWidth>
                  <InputLabel>严重程度 *</InputLabel>
                  <Select
                    value={formData.severity}
                    label={t('ehs.ehs_accident_page.text_08fe50')}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <MenuItem value='minor'>轻微</MenuItem>
                    <MenuItem value='moderate'>一般</MenuItem>
                    <MenuItem value='serious'>严重</MenuItem>
                    <MenuItem value='fatal'>致命</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField
                fullWidth
                label={t('ehs.ehs_accident_page.text_2630ba')}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('ehs.ehs_accident_page.please_input_1')}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label={t('ehs.ehs_accident_page.text_7a0acc')}
                  value={formData.reported_by}
                  onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                  placeholder={t('ehs.ehs_accident_page.please_input_2')}
                />
                <TextField
                  fullWidth
                  type='datetime-local'
                  label={t('ehs.ehs_accident_page.time')}
                  value={formData.occurred_at}
                  onChange={(e) => setFormData({ ...formData, occurred_at: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  type='number'
                  label={t('ehs.ehs_accident_page.text_355a25')}
                  value={formData.casualties}
                  onChange={(e) =>
                    setFormData({ ...formData, casualties: parseInt(e.target.value) || 0 })
                  }
                />
                <TextField
                  fullWidth
                  type='number'
                  label={t('ehs.ehs_accident_page.text_b68683')}
                  value={formData.economic_loss}
                  onChange={(e) =>
                    setFormData({ ...formData, economic_loss: parseFloat(e.target.value) || 0 })
                  }
                />
              </Box>
              <TextField
                fullWidth
                label={t('ehs.ehs_accident_page.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('ehs.ehs_accident_page.description_1')}
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
              sx={{ bgcolor: 'error.main' }}
            >
              上报
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          maxWidth='lg'
          fullWidth
        >
          <DialogTitle>事故详情</DialogTitle>
          <DialogContent>
            {detailLoading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    border: 3,
                    borderColor: 'error.main',
                    borderTopColor: 'error.dark',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
              </Box>
            ) : accidentDetail?.accident ? (
              <Box sx={{ pt: 2 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      事故编号
                    </Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      {accidentDetail.accident.accident_no}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      事故标题
                    </Typography>
                    <Typography>{accidentDetail.accident.title}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      事故类型
                    </Typography>
                    <Typography>{accidentDetail.accident.accident_type || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      严重程度
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {getSeverityChip(accidentDetail.accident.severity)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      发生地点
                    </Typography>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MapPin style={{ width: 16, height: 16 }} />
                      {accidentDetail.accident.location || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      发生时间
                    </Typography>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar style={{ width: 16, height: 16 }} />
                      {accidentDetail.accident.occurred_at
                        ? new Date(accidentDetail.accident.occurred_at).toLocaleString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      报告人
                    </Typography>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <User style={{ width: 16, height: 16 }} />
                      {accidentDetail.accident.reported_by || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      状态
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>
                      {getStatusChip(accidentDetail.accident.status)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      伤亡人数
                    </Typography>
                    <Typography>{accidentDetail.accident.casualties ?? 0} 人</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      经济损失
                    </Typography>
                    <Typography>{accidentDetail.accident.economic_loss ?? 0} 万元</Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    事故描述
                  </Typography>
                  <Typography>{accidentDetail.accident.description || t('ehs.ehs_accident_page.description_2')}</Typography>
                </Box>

                {accidentDetail.investigation && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        调查信息
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            调查状态
                          </Typography>
                          <Typography>{accidentDetail.investigation.status || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            调查团队
                          </Typography>
                          <Typography>
                            {Array.isArray(accidentDetail.investigation.team)
                              ? accidentDetail.investigation.team.join(', ')
                              : '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            调查发现
                          </Typography>
                          <Typography>{accidentDetail.investigation.findings || '-'}</Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            根本原因
                          </Typography>
                          <Typography>{accidentDetail.investigation.root_cause || '-'}</Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {accidentDetail.treatment && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        处理措施
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            处理状态
                          </Typography>
                          <Typography>{accidentDetail.treatment.status || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            负责人
                          </Typography>
                          <Typography>{accidentDetail.treatment.responsible || '-'}</Typography>
                        </Box>
                      </Box>
                      {accidentDetail.treatment.actions &&
                        accidentDetail.treatment.actions.length > 0 && (
                          <Box>
                            <Typography
                              sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}
                            >
                              处理行动
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {(accidentDetail.treatment.actions as TreatmentAction[]).map(
                                (action, index) => (
                                  <Box
                                    key={index}
                                    sx={{
                                      p: 2,
                                      border: 1,
                                      borderColor: 'divider',
                                      borderRadius: 1,
                                    }}
                                  >
                                    <Typography sx={{ fontWeight: 500 }}>
                                      {action.description}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        gap: 2,
                                        mt: 1,
                                        fontSize: '0.875rem',
                                        color: 'text.secondary',
                                      }}
                                    >
                                      <span>负责人：{action.responsible || '-'}</span>
                                      <span>期限：{action.deadline || '-'}</span>
                                      <span>状态：{action.status || '-'}</span>
                                    </Box>
                                  </Box>
                                )
                              )}
                            </Box>
                          </Box>
                        )}
                    </CardContent>
                  </Card>
                )}

                {accidentDetail.review && (
                  <Card>
                    <CardContent>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        结案评审
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            评审人
                          </Typography>
                          <Typography>{accidentDetail.review.reviewer || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            评审时间
                          </Typography>
                          <Typography>
                            {accidentDetail.review.reviewed_at
                              ? new Date(accidentDetail.review.reviewed_at).toLocaleString('zh-CN')
                              : '-'}
                          </Typography>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            总结
                          </Typography>
                          <Typography>{accidentDetail.review.summary || '-'}</Typography>
                        </Box>
                        {accidentDetail.review.lessons_learned &&
                          accidentDetail.review.lessons_learned.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                经验教训
                              </Typography>
                              <Box
                                component='ul'
                                sx={{ m: 0, pl: 2 }}
                              >
                                {accidentDetail.review.lessons_learned.map((lesson, index) => (
                                  <li key={index}>{lesson}</li>
                                ))}
                              </Box>
                            </Box>
                          )}
                        {accidentDetail.review.recommendations &&
                          accidentDetail.review.recommendations.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                改进建议
                              </Typography>
                              <Box
                                component='ul'
                                sx={{ m: 0, pl: 2 }}
                              >
                                {accidentDetail.review.recommendations.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </Box>
                            </Box>
                          )}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>暂无详情数据</Box>
            )}
          </DialogContent>
          <DialogActions>
            {accidentDetail?.accident && (
              <Button
                variant='text'
                color='error'
                onClick={() => handleDelete(accidentDetail.accident.id)}
                startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
              >
                删除
              </Button>
            )}
            <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          </DialogActions>
        </Dialog>
      </>
    </PageContainer>
  );
};

export default EhsAccidentPage;
