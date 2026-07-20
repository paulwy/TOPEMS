import React, { useState } from 'react';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  AlertCircle,
  Calendar,
  Users,
  MapPin,
  FileText,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';

import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { Incident, IncidentAction } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const EhsIncidentReportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [actions, setActions] = useState<IncidentAction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'near_miss' as
      'near_miss' | 'accident' | 'injury' | 'environmental' | 'equipment',
    severity: 'minor' as 'near_miss' | 'minor' | 'serious' | 'fatal',
    location: '',
    reported_by: '',
    reported_at: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'investigating' | 'resolved' | 'closed',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: incidentsData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.EHS.INCIDENTS,
    queryFn: async () => {
      const response = await ehsApi.listIncidents();
      if (response.success && response.data) {
        const data = response.data as unknown as Incident[] | { data: Incident[]; incidents: Incident[] };
        return Array.isArray(data) ? data : (data as { data?: Incident[]; incidents?: Incident[] }).data || (data as { data?: Incident[]; incidents?: Incident[] }).incidents || [];
      }
      return [] as Incident[];
    },
  });
  const incidents = (incidentsData as Incident[]) || [];

  const loadIncidentDetail = async (incidentId: string) => {
    try {
      const response = await ehsApi.getIncident(incidentId);
      if (response.success && response.data) {
        setSelectedIncident(response.data as Incident);
      }

      const actionsRes = await ehsApi.listIncidentActions(incidentId);
      if (actionsRes.success && actionsRes.data) {
        const actionsData = actionsRes.data as unknown as IncidentAction[] | { data: IncidentAction[] };
        const actionsArray = Array.isArray(actionsData) ? actionsData : (actionsData as { data: IncidentAction[] }).data || [];
        setActions(actionsArray);
      }
    } catch (error: unknown) {
      apiLogger.error(t('ehs.ehs_incident_report_page.detail'), error);
      addNotification({ title: t('ehs.ehs_incident_report_page.error'), message: t('ehs.ehs_incident_report_page.detail_1'), type: 'error' });
    }
  };

  const handleSelectIncident = async (incident: Incident) => {
    setSelectedIncident(incident);
    await loadIncidentDetail(incident.id);
    setShowDetailModal(true);
  };

  const createIncidentMutation = useMutation({
    mutationFn: (data: typeof formData) => ehsApi.createIncident(data),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_incident_report_page.success'), message: t('ehs.ehs_incident_report_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INCIDENTS });
      setShowAddModal(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_incident_report_page.create_1'), error);
      addNotification({ title: t('ehs.ehs_incident_report_page.error'), message: t('ehs.ehs_incident_report_page.create_2'), type: 'error' });
    },
  });

  const handleCreateIncident = () => {
    if (!formData.title.trim()) {
      addNotification({ title: t('ehs.ehs_incident_report_page.error'), message: t('ehs.ehs_incident_report_page.please_input'), type: 'error' });
      return;
    }
    if (!formData.description.trim()) {
      addNotification({ title: t('ehs.ehs_incident_report_page.error'), message: t('ehs.ehs_incident_report_page.please_input_1'), type: 'error' });
      return;
    }
    createIncidentMutation.mutate(formData);
  };

  const deleteIncidentMutation = useMutation({
    mutationFn: (incidentId: string) => ehsApi.deleteIncident(incidentId),
    onSuccess: () => {
      addNotification({ title: t('ehs.ehs_incident_report_page.success'), message: t('ehs.ehs_incident_report_page.delete_success'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INCIDENTS });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('ehs.ehs_incident_report_page.delete'), error);
      addNotification({ title: t('ehs.ehs_incident_report_page.error'), message: t('ehs.ehs_incident_report_page.delete_1'), type: 'error' });
    },
  });

  const handleDeleteIncident = (incidentId: string) => {
    if (!confirm(t('ehs.ehs_incident_report_page.confirm'))) return;
    deleteIncidentMutation.mutate(incidentId);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      incident_type: 'near_miss',
      severity: 'minor',
      location: '',
      reported_by: '',
      reported_at: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string; label: string }> = {
      fatal: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.ehs_incident_report_page.text_a7551e') },
      serious: { bg: ct.orange[200], color: 'warning.600', label: t('ehs.ehs_incident_report_page.text_e2e27a') },
      minor: { bg: 'warning.100', color: ct.yellow[600], label: t('ehs.ehs_incident_report_page.text_b3bd3d') },
      near_miss: { bg: 'primary.100', color: 'primary.dark', label: t('ehs.ehs_incident_report_page.text_88957b') },
    };
    const item = severityMap[severity] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: severity,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'warning.100', color: ct.yellow[600], label: t('ehs.ehs_incident_report_page.pending') },
      待处理: { bg: 'warning.100', color: ct.yellow[600], label: t('ehs.ehs_incident_report_page.pending') },
      investigating: { bg: 'primary.100', color: 'primary.dark', label: t('ehs.ehs_incident_report_page.text_913542') },
      调查中: { bg: 'primary.100', color: 'primary.dark', label: t('ehs.ehs_incident_report_page.text_913542') },
      resolved: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.ehs_incident_report_page.text_d7d257') },
      已解决: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.ehs_incident_report_page.text_d7d257') },
      closed: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.ehs_incident_report_page.close') },
      已关闭: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.ehs_incident_report_page.close') },
    };
    const item = statusMap[status] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size='small'
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      near_miss: t('ehs.ehs_incident_report_page.text_f1d392'),
      accident: t('ehs.ehs_incident_report_page.text_131045'),
      injury: t('ehs.ehs_incident_report_page.personnel'),
      environmental: t('ehs.ehs_incident_report_page.text_2f4ad4'),
      equipment: t('ehs.ehs_incident_report_page.equipment'),
    };
    return typeMap[type] || type;
  };

  const columns: ColumnDef<Incident>[] = [
    {
      id: 'title',
      label: t('ehs.ehs_incident_report_page.title'),
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: 'slate.900' }}>{row.title}</Typography>
      ),
    },
    {
      id: 'incident_type',
      label: t('ehs.ehs_incident_report_page.type'),
      render: (row) => (
        <Chip
          label={getTypeLabel(row.incident_type)}
          size='small'
          sx={{ backgroundColor: 'secondary.100', color: 'secondary.dark' }}
        />
      ),
    },
    {
      id: 'severity',
      label: t('ehs.ehs_incident_report_page.text_08fe50'),
      render: (row) => getSeverityBadge(row.severity),
    },
    {
      id: 'status',
      label: t('ehs.ehs_incident_report_page.status'),
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'reported_at',
      label: t('ehs.ehs_incident_report_page.time'),
      render: (row) => (
        <span>{row.reported_at ? new Date(row.reported_at).toLocaleString('zh-CN') : '-'}</span>
      ),
    },
    {
      id: 'actions',
      label: t('ehs.ehs_incident_report_page.action'),
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='text'
            size='small'
            onClick={() => handleSelectIncident(row)}
            startIcon={
              <Box
                component={Eye}
                sx={{ fontSize: 16 }}
              />
            }
          >
            查看
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={() => handleDeleteIncident(row.id)}
            sx={{ color: 'error.dark', '&:hover': { backgroundColor: 'error.light' } }}
            startIcon={
              <Box
                component={Trash2}
                sx={{ fontSize: 16 }}
              />
            }
          />
        </Box>
      ),
    },
  ];

  const actionColumns: ColumnDef<IncidentAction>[] = [
    {
      id: 'action_type',
      label: t('ehs.ehs_incident_report_page.type_1'),
      render: (row) => (
        <Chip
          size='small'
          sx={{ backgroundColor: 'primary.100', color: 'primary.dark' }}
          label={
            row.action_type === 'investigation'
              ? t('ehs.ehs_incident_report_page.text_75168b')
              : row.action_type === 'correction'
                ? t('ehs.ehs_incident_report_page.text_67fb69')
                : row.action_type === 'prevention'
                  ? t('ehs.ehs_incident_report_page.text_fd1b9f')
                  : row.action_type
          }
        />
      ),
    },
    {
      id: 'description',
      label: t('ehs.ehs_incident_report_page.description'),
      render: (row) => row.description,
    },
    {
      id: 'responsible',
      label: t('ehs.ehs_incident_report_page.manager'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Users sx={{ fontSize: 16 }} />
          <span>{row.responsible || '-'}</span>
        </Box>
      ),
    },
    {
      id: 'due_date',
      label: t('ehs.ehs_incident_report_page.date'),
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar sx={{ fontSize: 16 }} />
          {row.due_date ? new Date(row.due_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('ehs.ehs_incident_report_page.status'),
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const stats = {
    total: incidents.length,
    pending: incidents.filter((i) => i.status === 'pending').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
    serious: incidents.filter((i) => i.severity === 'fatal' || i.severity === 'serious').length,
  };

  const headerActions = [
    {
      label: t('ehs.ehs_incident_report_page.text_bee0e8'),
      icon: <Plus sx={{ fontSize: 16, mr: 1 }} />,
      onClick: () => setShowAddModal(true),
      variant: 'contained' as const,
      color: 'warning' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <AlertCircle sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.orange[500]} 0%, ${ct.orange[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <ListPageTemplate
        title=''
        columns={columns}
        data={incidents}
        loading={loading}
        headerContent={
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 3,
              mb: 4,
            }}
          >
            <Card
              sx={{
                background: `linear-gradient(to bottom right, ${ct.orange[500]}, error.main)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ color: ct.orange[200], fontSize: 14 }}>事件总数</Typography>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.total}
                    </Typography>
                  </Box>
                  <AlertCircle sx={{ fontSize: 48, color: ct.orange[200] }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(to bottom right, ${ct.yellow[500]}, ${ct.orange[500]})`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ color: 'warning.100', fontSize: 14 }}>待处理</Typography>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.pending}
                    </Typography>
                  </Box>
                  <Clock sx={{ fontSize: 48, color: 'warning.100' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(to bottom right, ${ct.success.main}, success.main)`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ color: 'success.lighter', fontSize: 14 }}>已解决</Typography>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.resolved}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.lighter' }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: `linear-gradient(to bottom right, error.main, ${ct.pink[500]})`,
                color: 'white',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ color: 'error.lighter', fontSize: 14 }}>严重事件</Typography>
                    <Typography
                      variant='h3'
                      sx={{ fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.serious}
                    </Typography>
                  </Box>
                  <AlertTriangle sx={{ fontSize: 48, color: 'error.lighter' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        }
        emptyMessage={t('ehs.ehs_incident_report_page.no_data')}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.INCIDENTS })}
      />

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>上报事件</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                事件标题 *
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t('ehs.ehs_incident_report_page.please_input')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  事件类型
                </Typography>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>事件类型</InputLabel>
                  <Select
                    value={formData.incident_type}
                    label={t('ehs.ehs_incident_report_page.type_2')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        incident_type: e.target.value as
                          'near_miss' | 'accident' | 'injury' | 'environmental' | 'equipment',
                      }))
                    }
                  >
                    <MenuItem value='near_miss'>未遂事件</MenuItem>
                    <MenuItem value='accident'>事故</MenuItem>
                    <MenuItem value='injury'>人员伤害</MenuItem>
                    <MenuItem value='environmental'>环境事件</MenuItem>
                    <MenuItem value='equipment'>设备故障</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  严重程度
                </Typography>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>严重程度</InputLabel>
                  <Select
                    value={formData.severity}
                    label={t('ehs.ehs_incident_report_page.text_08fe50')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as 'near_miss' | 'minor' | 'serious' | 'fatal',
                      }))
                    }
                  >
                    <MenuItem value='near_miss'>未遂</MenuItem>
                    <MenuItem value='minor'>轻微</MenuItem>
                    <MenuItem value='serious'>严重</MenuItem>
                    <MenuItem value='fatal'>致命</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  发生位置
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder={t('ehs.ehs_incident_report_page.please_input_2')}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  报告人
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.reported_by}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      reported_by: e.target.value,
                    }))
                  }
                  placeholder={t('ehs.ehs_incident_report_page.please_input_3')}
                />
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                报告日期
              </Typography>
              <TextField
                type='date'
                size='small'
                fullWidth
                value={formData.reported_at}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    reported_at: e.target.value,
                  }))
                }
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                事件描述 *
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t('ehs.ehs_incident_report_page.description_1')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAddModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateIncident}
            sx={{
              backgroundColor: 'warning.600',
              '&:hover': { backgroundColor: ct.orange[700] },
            }}
          >
            提交报告
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component={AlertCircle}
            sx={{ fontSize: 20, color: 'warning.600' }}
          />
          {selectedIncident?.title}
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'white7ed', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: ct.orange[700] }}
                  >
                    事件类型
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500, color: ct.orange[900], mt: 0.5 }}
                  >
                    {getTypeLabel(selectedIncident.incident_type)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'error.dark' }}
                  >
                    严重程度
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedIncident.severity)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: ct.yellow[600] }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedIncident.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'primary.dark' }}
                  >
                    报告人
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Users sx={{ fontSize: 16 }} />
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 500, color: 'primary.800' }}
                    >
                      {selectedIncident.reported_by || '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    发生位置
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <MapPin sx={{ fontSize: 16 }} />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedIncident.location || '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    报告时间
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Calendar sx={{ fontSize: 16 }} />
                    <Typography
                      variant='body1'
                      sx={{ color: 'text.primary' }}
                    >
                      {selectedIncident.reported_at
                        ? new Date(selectedIncident.reported_at).toLocaleString('zh-CN')
                        : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  事件描述
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ mt: 1, whiteSpace: 'pre-wrap', color: 'text.primary' }}
                >
                  {selectedIncident.description || t('ehs.ehs_incident_report_page.description_2')}
                </Typography>
              </Box>

              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FileCheck sx={{ fontSize: 20, color: 'warning.600' }} />
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    处理措施 ({actions.length})
                  </Typography>
                </Box>
                <ListPageTemplate
                  columns={actionColumns}
                  data={actions}
                  loading={loading}
                  pagination={{
                    page: 0,
                    pageSize: 10,
                    total: actions.length,
                    onPageChange: () => {},
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailModal(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsIncidentReportPage;
