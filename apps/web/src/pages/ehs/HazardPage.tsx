import React, { useState, useCallback, useMemo } from 'react';
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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Plus, Eye, AlertTriangle, MapPin, ShieldAlert, Clock } from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { Hazard, RiskAssessment, ControlMeasure, CreateSafetyHazardRequest } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { useCrudOperations, type CrudOperations } from '@/hooks/useCrudQueries';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const hazardCrudApi = {
  list: (params?: Record<string, unknown>) => ehsApi.listHazards(params as unknown as Record<string, unknown>),
  get: (id: string) => ehsApi.getHazard(id),
  create: (data: CreateSafetyHazardRequest) => ehsApi.createHazard(data),
  update: (id: string, data: Partial<CreateSafetyHazardRequest>) => ehsApi.updateHazard(id, data),
  delete: (id: string) => ehsApi.deleteHazard(id),
} as unknown as CrudOperations<Hazard, CreateSafetyHazardRequest>;

const HazardPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [controlMeasures, setControlMeasures] = useState<ControlMeasure[]>([]);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const {
    data: hazards,
    loading,
    refresh,
    create: createHazard,
  } = useCrudOperations<Hazard, CreateSafetyHazardRequest>({
    api: hazardCrudApi,
    queryKey: 'ehs-hazards',
    defaultPageSize: 100,
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'equipment',
    description: '',
    location: '',
    severity: 'medium' as 'high' | 'medium' | 'low',
    exposure: 'medium' as 'high' | 'medium' | 'low',
    likelihood: 'medium' as 'high' | 'medium' | 'low',
  });

  const loadHazardDetail = async (hazardId: string) => {
    try {
      const [hazardRes, assessmentsRes, controlsRes] = await Promise.all([
        ehsApi.getHazard(hazardId),
        ehsApi.listRiskAssessments(hazardId),
        ehsApi.listControlMeasures(hazardId),
      ]);

      if (hazardRes.success && hazardRes.data) {
        setSelectedHazard(hazardRes.data as Hazard);
      }
      if (assessmentsRes.success && assessmentsRes.data) {
        const data = assessmentsRes.data as unknown as RiskAssessment[] | { data: RiskAssessment[] };
        setRiskAssessments(Array.isArray(data) ? data : data.data || []);
      }
      if (controlsRes.success && controlsRes.data) {
        const data = controlsRes.data as unknown as ControlMeasure[] | { data: ControlMeasure[] };
        setControlMeasures(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err: unknown) {
      apiLogger.error(t('ehs.hazard_page.detail'), err);
    }
  };

  const handleView = async (hazard: Hazard) => {
    await loadHazardDetail(hazard.id);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.hazard_page.active') },
      controlled: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.hazard_page.text_2ef3d6') },
      eliminated: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.hazard_page.text_b05ad3') },
      archived: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.hazard_page.text_c3ba16') },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary', label: status };
    return (
      <Chip
        label={colors.label}
        size='small'
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string; label: string }> = {
      high: { bg: 'error.light', color: 'error.dark', label: t('ehs.hazard_page.text_4296d7') },
      medium: { bg: 'warning.light', color: 'warning.dark', label: t('ehs.hazard_page.text_aed1df') },
      low: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.hazard_page.text_19ac67') },
    };
    const colors = severityMap[severity] || {
      bg: 'grey.100',
      color: 'text.secondary',
      label: severity,
    };
    return (
      <Chip
        label={colors.label}
        size='small'
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const getRiskLevel = (hazard: Hazard) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    const likelihoodScore = { high: 3, medium: 2, low: 1 };
    const exposureScore = { high: 3, medium: 2, low: 1 };
    const total =
      (severityScore[hazard.severity] || 2) *
      (likelihoodScore[hazard.likelihood] || 2) *
      (exposureScore[hazard.exposure] || 2);
    if (total >= 18)
      return { level: 'extreme', label: t('ehs.hazard_page.text_9ac974'), bg: 'error.main', color: 'white' };
    if (total >= 9)
      return { level: 'high', label: t('ehs.hazard_page.text_4433e7'), bg: 'error.light', color: 'error.dark' };
    if (total >= 4)
      return { level: 'medium', label: t('ehs.hazard_page.text_8a8992'), bg: 'warning.light', color: 'warning.dark' };
    return { level: 'low', label: t('ehs.hazard_page.text_b56976'), bg: 'success.lighter', color: 'success.dark' };
  };

  const getControlStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.hazard_page.pending') },
      in_progress: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.hazard_page.in_progress') },
      completed: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.hazard_page.completed') },
      verified: { bg: 'primary.lighter', color: 'primary.dark', label: t('ehs.hazard_page.text_876caf') },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary', label: status };
    return (
      <Chip
        label={colors.label}
        size='small'
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Hazard>[] = useMemo(
    () => [
      { id: 'name', label: t('ehs.hazard_page.name') },
      { id: 'category', label: t('ehs.hazard_page.text_383a6d') },
      {
        id: 'severity',
        label: t('ehs.hazard_page.text_08fe50'),
        render: (row) => getSeverityBadge(row.severity),
      },
      {
        id: 'risklevel',
        label: t('ehs.hazard_page.text_25eb6b'),
        render: (row) => {
          const risk = getRiskLevel(row);
          return (
            <Chip
              label={risk.label}
              size='small'
              sx={{ backgroundColor: risk.bg, color: risk.color, fontWeight: 500 }}
            />
          );
        },
      },
      { id: 'location', label: t('ehs.hazard_page.text_d4d2a6'), render: (row) => row.location || '-' },
      {
        id: 'status',
        label: t('ehs.hazard_page.status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filteredHazards = useMemo(() => {
    return hazards.filter((hazard) => {
      const matchesSearch =
        hazard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hazard.location && hazard.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSeverity = severityFilter === 'all' || hazard.severity === severityFilter;
      const matchesStatus = statusFilter === 'all' || hazard.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [hazards, searchTerm, severityFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: hazards.length,
      active: hazards.filter((h) => h.status === 'active').length,
      controlled: hazards.filter((h) => h.status === 'controlled').length,
      highRisk: hazards.filter((h) => {
        const risk = getRiskLevel(h);
        return risk.level === 'high' || risk.level === 'extreme';
      }).length,
    }),
    [hazards]
  );

  const filters = useMemo(
    () => [
      {
        id: 'severity',
        label: t('ehs.hazard_page.text_08fe50'),
        type: 'select' as const,
        options: [
          { value: 'all', label: t('ehs.hazard_page.all') },
          { value: 'high', label: t('ehs.hazard_page.text_4296d7') },
          { value: 'medium', label: t('ehs.hazard_page.text_aed1df') },
          { value: 'low', label: t('ehs.hazard_page.text_19ac67') },
        ],
        value: severityFilter,
        onChange: (value: unknown) => setSeverityFilter(value as string),
      },
      {
        id: 'status',
        label: t('ehs.hazard_page.status'),
        type: 'select' as const,
        options: [
          { value: 'all', label: t('ehs.hazard_page.all') },
          { value: 'active', label: t('ehs.hazard_page.active') },
          { value: 'controlled', label: t('ehs.hazard_page.text_2ef3d6') },
          { value: 'eliminated', label: t('ehs.hazard_page.text_b05ad3') },
          { value: 'archived', label: t('ehs.hazard_page.text_c3ba16') },
        ],
        value: statusFilter,
        onChange: (value: unknown) => setStatusFilter(value as string),
      },
    ],
    [severityFilter, statusFilter]
  );

  const rowActions = [
    {
      label: t('ehs.hazard_page.detail_1'),
      icon: <Eye size={16} />,
      onClick: (row: Hazard) => handleView(row),
    },
  ];

  const handleCreate = () => {
    setFormData({
      name: '',
      category: 'equipment',
      description: '',
      location: '',
      severity: 'medium',
      exposure: 'medium',
      likelihood: 'medium',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      const levelScore =
        (['low', 'medium', 'high'].indexOf(formData.severity) + 1) *
        (['low', 'medium', 'high'].indexOf(formData.likelihood) + 1) *
        (['low', 'medium', 'high'].indexOf(formData.exposure) + 1);
      const level = levelScore >= 9 ? 'high' : levelScore >= 4 ? 'medium' : 'low';
      const hazardNo = `HZ-${Date.now()}`;

      await createHazard({
        hazard_no: hazardNo,
        name: formData.name,
        category: formData.category,
        description: formData.description || null,
        location: formData.location || null,
        level,
        control_measures: [] as string[],
        status: 'active',
      });
      setShowCreateModal(false);
    } catch (err: unknown) {
      apiLogger.error(t('ehs.hazard_page.create'), err);
    }
  };

  const headerActions = [
    {
      label: t('ehs.hazard_page.text_af307b'),
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'error' as const,
    },
  ];

  const getStepIndex = (status: string) => {
    const stepMap: Record<string, number> = {
      active: 0,
      controlled: 1,
      eliminated: 2,
      archived: 3,
    };
    return stepMap[status] || 0;
  };

  const steps = [t('ehs.hazard_page.text_72eff8'), t('ehs.hazard_page.text_26b9c1'), t('ehs.hazard_page.text_34e47d'), t('ehs.hazard_page.text_ace916')];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <ShieldAlert sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'error.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'error.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: 'error.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  危险源总数
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
                  bgcolor: 'error.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  活跃隐患
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
                <ShieldAlert sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已控制
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.controlled}
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
                  bgcolor: 'error.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock sx={{ width: 20, height: 20, color: 'error.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  高风险隐患
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.highRisk}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ListPageTemplate
        title=''
        columns={columns}
        data={filteredHazards}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('ehs.hazard_page.search')}
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        onRefresh={refresh}
        rowActions={rowActions}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>登记危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('ehs.hazard_page.name_1')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('ehs.hazard_page.please_input')}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>类别 *</InputLabel>
                <Select
                  value={formData.category}
                  label={t('ehs.hazard_page.text_383a6d')}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value='equipment'>设备设施</MenuItem>
                  <MenuItem value='chemical'>化学品</MenuItem>
                  <MenuItem value='physical'>物理因素</MenuItem>
                  <MenuItem value='biological'>生物因素</MenuItem>
                  <MenuItem value='ergonomic'>人机工效</MenuItem>
                  <MenuItem value='environmental'>环境因素</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('ehs.hazard_page.text_d4d2a6')}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('ehs.hazard_page.please_input_1')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>严重程度 *</InputLabel>
                <Select
                  value={formData.severity}
                  label={t('ehs.hazard_page.text_08fe50')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      severity: e.target.value as 'high' | 'medium' | 'low',
                    })
                  }
                >
                  <MenuItem value='high'>高</MenuItem>
                  <MenuItem value='medium'>中</MenuItem>
                  <MenuItem value='low'>低</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>可能性 *</InputLabel>
                <Select
                  value={formData.likelihood}
                  label={t('ehs.hazard_page.text_708913')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      likelihood: e.target.value as 'high' | 'medium' | 'low',
                    })
                  }
                >
                  <MenuItem value='high'>高</MenuItem>
                  <MenuItem value='medium'>中</MenuItem>
                  <MenuItem value='low'>低</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>暴露程度 *</InputLabel>
                <Select
                  value={formData.exposure}
                  label={t('ehs.hazard_page.text_b5e61b')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      exposure: e.target.value as 'high' | 'medium' | 'low',
                    })
                  }
                >
                  <MenuItem value='high'>高</MenuItem>
                  <MenuItem value='medium'>中</MenuItem>
                  <MenuItem value='low'>低</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label={t('ehs.hazard_page.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('ehs.hazard_page.please_input_2')}
              multiline
              rows={3}
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
            登记
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{selectedHazard?.name}</DialogTitle>
        <DialogContent>
          {selectedHazard && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ mb: 4 }}>
                <Stepper
                  activeStep={getStepIndex(selectedHazard.status)}
                  alternativeLabel
                >
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 4 }}>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    类别
                  </Typography>
                  <Typography>{selectedHazard.category}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    位置
                  </Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MapPin style={{ width: 16, height: 16 }} />
                    {selectedHazard.location || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    严重程度
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedHazard.severity)}</Box>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedHazard.status)}</Box>
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    风险等级
                  </Typography>
                  {(() => {
                    const risk = getRiskLevel(selectedHazard);
                    return (
                      <Chip
                        label={risk.label}
                        size='small'
                        sx={{
                          mt: 0.5,
                          backgroundColor: risk.bg,
                          color: risk.color,
                          fontWeight: 500,
                        }}
                      />
                    );
                  })()}
                </Box>
              </Box>

              {selectedHazard.description && (
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    描述
                  </Typography>
                  <Typography>{selectedHazard.description}</Typography>
                </Box>
              )}

              {controlMeasures.length > 0 && (
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      控制措施
                    </Typography>
                    {controlMeasures.map((measure) => (
                      <Box
                        key={measure.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography variant='body2'>{measure.description}</Typography>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            {t('ehs.hazard_page.text_81a600')}: {measure.responsible || '-'}
                          </Typography>
                        </Box>
                        {getControlStatusBadge(measure.status)}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}

              {riskAssessments.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      风险评估
                    </Typography>
                    {riskAssessments.map((assessment) => (
                      <Box
                        key={assessment.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 2,
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            评估人
                          </Typography>
                          <Typography variant='body2'>{assessment.assessor || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            评估日期
                          </Typography>
                          <Typography variant='body2'>
                            {assessment.assessment_date || '-'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            风险等级
                          </Typography>
                          <Typography variant='body2'>{assessment.risklevel || '-'}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default HazardPage;
