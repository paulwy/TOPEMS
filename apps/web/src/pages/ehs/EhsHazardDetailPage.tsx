import React, { useState, useEffect, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  AlertTriangle,
  MapPin,
  Users,
  Shield,
  Clock,
  Edit3,
  Plus,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Button,
} from '@mui/material';
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import { ehsApi } from '@/api/ehs';
import type { Hazard, RiskAssessment, ControlMeasure, SafetyHazard } from '@/api/ehs';
import { EHSStatusBadge, EHSMeasureTypeBadge, calculateRiskLevel } from '@/components/ehs';
import { useNotification } from '@/hooks/useNotification';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common/PageContainer';
import { designTokens } from '@/theme/tokens';
import { EHS_PATHS } from '@/modules/ehs/config';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

interface ControlFormData {
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description: string;
  responsible: string;
  deadline: string;
}

const EhsHazardDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    severity: 'medium' as 'high' | 'medium' | 'low',
    exposure: 'medium' as 'high' | 'medium' | 'low',
    likelihood: 'medium' as 'high' | 'medium' | 'low',
    status: 'active' as 'active' | 'controlled' | 'eliminated' | 'archived',
  });
  const [controlFormData, setControlFormData] = useState<ControlFormData>({
    measure_type: 'engineering',
    description: '',
    responsible: '',
    deadline: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMeasureId, setDeletingMeasureId] = useState<string | null>(null);

  const {
    data: hazard,
    isLoading: hazardLoading,
    error: hazardQueryError,
  } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.getHazard(id!);
      if (response.success && response.data) {
        const safetyHazard = response.data as unknown as SafetyHazard;
        const hazardData: Hazard = {
          id: safetyHazard.id,
          name: safetyHazard.name,
          description: safetyHazard.description,
          category: safetyHazard.category,
          location: safetyHazard.location,
          severity: safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_4296d7'))
            ? 'high'
            : safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_5a558d'))
              ? 'high'
              : safetyHazard.level?.includes(t('ehs.ehs_hazard_detail_page.text_aed1df'))
                ? 'medium'
                : 'low',
          exposure: 'medium',
          likelihood: 'medium',
          status:
            safetyHazard.status === 'identified'
              ? 'active'
              : safetyHazard.status === 'controlled'
                ? 'controlled'
                : safetyHazard.status === 'eliminated'
                  ? 'eliminated'
                  : 'archived',
          created_at: safetyHazard.created_at,
          updated_at: safetyHazard.updated_at,
        };
        return hazardData;
      }
      throw new Error(response.message || t('ehs.ehs_hazard_detail_page.detail'));
    },
  });

  const { data: assessmentsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD_RISK_ASSESSMENTS(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.listRiskAssessments(id!);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || data.assessments || [];
      }
      return [];
    },
  });
  const assessments = (assessmentsData as RiskAssessment[]) || [];

  const { data: controlsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || ''),
    enabled: !!id,
    queryFn: async () => {
      const response = await ehsApi.listControlMeasures(id!);
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || data.measures || [];
      }
      return [];
    },
  });
  const controls = (controlsData as ControlMeasure[]) || [];

  const loading = hazardLoading;
  const errorMessage = hazardQueryError ? t('ehs.ehs_hazard_detail_page.detail') : undefined;

  useEffect(() => {
    if (hazard) {
      setFormData({
        name: hazard.name || '',
        description: hazard.description || '',
        category: hazard.category || '',
        location: hazard.location || '',
        severity: hazard.severity || 'medium',
        exposure: hazard.exposure || 'medium',
        likelihood: hazard.likelihood || 'medium',
        status: hazard.status || 'active',
      });
    }
  }, [hazard]);

  const getStatusBadge = (status: string) => {
    return (
      <EHSStatusBadge
        status={status}
        type='hazard'
      />
    );
  };

  const updateHazardMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof ehsApi.updateHazard>[1] }) =>
      ehsApi.updateHazard(variables.id, variables.data),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.update'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.HAZARD(id || '') });
      setShowEditModal(false);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.update_1'), err);
      error(t('ehs.ehs_hazard_detail_page.update_2'));
    },
  });

  const handleUpdateHazard = () => {
    if (!hazard) return;
    if (!formData.name.trim()) {
      error(t('ehs.ehs_hazard_detail_page.please_input'));
      return;
    }
    updateHazardMutation.mutate({
      id: hazard.id,
      data: {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        level:
          formData.severity === 'high'
            ? t('ehs.ehs_hazard_detail_page.text_4296d7')
            : formData.severity === 'medium'
              ? t('ehs.ehs_hazard_detail_page.text_aed1df')
              : t('ehs.ehs_hazard_detail_page.text_19ac67'),
        status: formData.status,
      },
    });
  };

  const createControlMutation = useMutation({
    mutationFn: (variables: {
      hazardId: string;
      data: Parameters<typeof ehsApi.createControlMeasure>[1];
    }) => ehsApi.createControlMeasure(variables.hazardId, variables.data),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.success'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || '') });
      setShowControlModal(false);
      setControlFormData({
        measure_type: 'engineering',
        description: '',
        responsible: '',
        deadline: '',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.fail'), err);
      error(t('ehs.ehs_hazard_detail_page.fail_1'));
    },
  });

  const handleAddControl = () => {
    if (!hazard) return;
    if (!controlFormData.description.trim()) {
      error(t('ehs.ehs_hazard_detail_page.please_input_1'));
      return;
    }
    createControlMutation.mutate({
      hazardId: hazard.id,
      data: {
        measure_type: controlFormData.measure_type,
        description: controlFormData.description,
        responsible: controlFormData.responsible || null,
        deadline: controlFormData.deadline || null,
        status: 'pending',
      },
    });
  };

  const handleDeleteControl = (measureId: string) => {
    setDeletingMeasureId(measureId);
    setDeleteDialogOpen(true);
  };

  const deleteControlMutation = useMutation({
    mutationFn: (variables: { hazardId: string; measureId: string }) =>
      ehsApi.deleteControlMeasure(variables.hazardId, variables.measureId),
    onSuccess: () => {
      success(t('ehs.ehs_hazard_detail_page.delete_success'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.HAZARD_CONTROL_MEASURES(id || '') });
      setDeleteDialogOpen(false);
      setDeletingMeasureId(null);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('ehs.ehs_hazard_detail_page.delete'), err);
      error(t('ehs.ehs_hazard_detail_page.delete_1'));
      setDeleteDialogOpen(false);
      setDeletingMeasureId(null);
    },
  });

  const confirmDeleteControl = () => {
    if (!hazard || !deletingMeasureId) return;
    deleteControlMutation.mutate({ hazardId: hazard.id, measureId: deletingMeasureId });
  };

  const assessmentColumns: ColumnDef<RiskAssessment>[] = [
    {
      accessorKey: 'assessment_date',
      header: t('ehs.ehs_hazard_detail_page.date'),
      cell: ({ row }) => (
        <span>
          {row.original.assessment_date
            ? new Date(row.original.assessment_date).toLocaleDateString('zh-CN')
            : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'assessor',
      header: t('ehs.ehs_hazard_detail_page.text_ab3d92'),
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component={Users}
            sx={{ fontSize: 16 }}
          />
          <span>{row.original.assessor || '-'}</span>
        </Box>
      ),
    },
    {
      accessorKey: 'risklevel',
      header: t('ehs.ehs_hazard_detail_page.text_25eb6b'),
      cell: ({ row }) => {
        const riskResult = calculateRiskLevel(
          row.original.severity || 'medium',
          row.original.likelihood || 'medium'
        );
        const colorMap: Record<string, { bg: string; color: string }> = {
          高风险: { bg: 'error.lighter', color: 'error.dark' },
          中风险: { bg: 'warning.100', color: ct.yellow[600] },
          低风险: { bg: 'success.lighter', color: 'success.dark' },
        };
        const colors = colorMap[`${riskResult.level}风险`] || {
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return (
          <Chip
            label={`${riskResult.level}风险`}
            size='small'
            sx={{ backgroundColor: colors.bg, color: colors.color }}
          />
        );
      },
    },
    { accessorKey: 'recommendations', header: t('ehs.ehs_hazard_detail_page.text_6dca6f') },
  ];

  const controlColumns: ColumnDef<ControlMeasure>[] = [
    {
      accessorKey: 'measure_type',
      header: t('ehs.ehs_hazard_detail_page.type'),
      cell: ({ row }) => <EHSMeasureTypeBadge type={row.original.measure_type} />,
    },
    { accessorKey: 'description', header: t('ehs.ehs_hazard_detail_page.description') },
    {
      accessorKey: 'responsible',
      header: t('ehs.ehs_hazard_detail_page.manager'),
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component={Users}
            sx={{ fontSize: 16 }}
          />
          <span>{row.original.responsible || '-'}</span>
        </Box>
      ),
    },
    {
      accessorKey: 'deadline',
      header: t('ehs.ehs_hazard_detail_page.completed'),
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            component={Clock}
            sx={{ fontSize: 16 }}
          />
          {row.original.deadline
            ? new Date(row.original.deadline).toLocaleDateString('zh-CN')
            : '-'}
        </Box>
      ),
    },
    {
      accessorKey: 'status',
      header: t('ehs.ehs_hazard_detail_page.status'),
      cell: ({ row }) => (
        <EHSStatusBadge
          status={row.original.status}
          type='control'
        />
      ),
    },
    {
      id: 'actions',
      header: t('ehs.ehs_hazard_detail_page.action'),
      cell: ({ row }) => (
        <Button
          variant='text'
          size='small'
          onClick={() => handleDeleteControl(row.original.id)}
          sx={{ color: 'error.dark', '&:hover': { backgroundColor: 'error.light' } }}
          startIcon={
            <Box
              component={Trash2}
              sx={{ fontSize: 16 }}
            />
          }
        />
      ),
    },
  ];

  const basicInfoContent = useMemo(() => {
    if (!hazard) return null;
    const riskInfo = calculateRiskLevel(hazard.severity || 'medium', hazard.likelihood || 'medium');
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            风险等级
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component={Shield}
              sx={{ fontSize: 48, color: 'warning.600' }}
            />
            <Box>
              <Typography sx={{ color: 'warning.600', fontSize: 14 }}>风险等级</Typography>
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 700,
                  mt: 0.5,
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: riskInfo.bgColor,
                  color: riskInfo.color,
                  display: 'inline-block',
                }}
              >
                {riskInfo.level}风险
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>分类</Typography>
            <Typography sx={{ color: 'text.primary', mt: 0.5 }}>
              {hazard.category || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>位置</Typography>
            <Typography sx={{ color: 'text.primary', mt: 0.5 }}>
              <Box
                component={MapPin}
                sx={{ fontSize: 16, mr: 0.5, display: 'inline' }}
              />
              {hazard.location || '-'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography sx={{ color: 'error.dark', fontSize: 12 }}>严重程度</Typography>
            <Typography sx={{ fontWeight: 500, color: 'error.darker', mt: 0.5 }}>
              {hazard.severity === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.severity === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography sx={{ color: ct.yellow[600], fontSize: 12 }}>暴露频率</Typography>
            <Typography sx={{ fontWeight: 500, color: ct.yellow[700], mt: 0.5 }}>
              {hazard.exposure === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.exposure === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography sx={{ color: 'primary.dark', fontSize: 12 }}>发生概率</Typography>
            <Typography sx={{ fontWeight: 500, color: 'primary.dark', mt: 0.5 }}>
              {hazard.likelihood === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.likelihood === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>描述</Typography>
          <Typography sx={{ color: 'text.primary', mt: 0.5, fontSize: 14, lineHeight: 1.6 }}>
            {hazard.description || t('ehs.ehs_hazard_detail_page.description_1')}
          </Typography>
        </Box>
      </Box>
    );
  }, [hazard]);

  const assessmentsContent = useMemo(() => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            风险评估记录
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            共 {assessments.length} 条记录
          </Typography>
        </Box>
        {assessments.length > 0 ? (
          <DataTable
            columns={assessmentColumns}
            data={assessments}
            enablePagination={false}
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Box
              component={AlertTriangle}
              sx={{ fontSize: 64, color: 'grey.400', mx: 'auto', mb: 2 }}
            />
            <Typography>暂无风险评估记录</Typography>
          </Box>
        )}
      </Box>
    );
  }, [assessments]);

  const controlsContent = useMemo(() => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            控制措施
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            共 {controls.length} 条措施
          </Typography>
        </Box>
        {controls.length > 0 ? (
          <DataTable
            columns={controlColumns}
            data={controls}
            enablePagination={false}
          />
        ) : (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Box
              component={Shield}
              sx={{ fontSize: 64, color: 'grey.400', mx: 'auto', mb: 2 }}
            />
            <Typography>暂无控制措施</Typography>
            <Button
              variant='outlined'
              size='small'
              sx={{ mt: 2 }}
              onClick={() => setShowControlModal(true)}
              startIcon={
                <Box
                  component={Plus}
                  sx={{ fontSize: 12 }}
                />
              }
            >
              添加控制措施
            </Button>
          </Box>
        )}
      </Box>
    );
  }, [controls]);

  const tabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'basic',
        label: t('ehs.ehs_hazard_detail_page.info'),
        content: basicInfoContent || <></>,
      },
      {
        id: 'assessments',
        label: t('ehs.ehs_hazard_detail_page.text_d0a11d'),
        content: assessmentsContent,
      },
      {
        id: 'controls',
        label: t('ehs.ehs_hazard_detail_page.text_e61c61'),
        content: controlsContent,
      },
    ],
    [basicInfoContent, assessmentsContent, controlsContent]
  );

  const infoCard = useMemo(() => {
    if (!hazard) return;
    const riskInfo = calculateRiskLevel(hazard.severity || 'medium', hazard.likelihood || 'medium');
    return {
      avatar: (
        <AlertTriangle
          size={32}
          color='warning.600'
        />
      ),
      title: hazard.name,
      subtitle: getStatusBadge(hazard.status),
      tags: [hazard.category || ''],
      stats: [
        {
          label: t('ehs.ehs_hazard_detail_page.text_08fe50'),
          value:
            hazard.severity === 'high'
              ? t('ehs.ehs_hazard_detail_page.text_4296d7')
              : hazard.severity === 'medium'
                ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                : t('ehs.ehs_hazard_detail_page.text_19ac67'),
        },
        { label: t('ehs.ehs_hazard_detail_page.text_25eb6b'), value: `${riskInfo.level}风险` },
      ],
    };
  }, [hazard]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <AlertTriangle sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.orange[500]} 0%, ${ct.orange[600]} 100%)`,
      }}
      backButton={{ href: EHS_PATHS.hazard }}
      maxWidth='xl'
    >
      <DetailPageTemplate
        title=''
        loading={loading}
        error={errorMessage}
        onEdit={() => setShowEditModal(true)}
        infoCard={infoCard}
        tabs={tabs}
        actions={[
          {
            label: t('ehs.ehs_hazard_detail_page.text_59b356'),
            icon: <Plus style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
            onClick: () => setShowControlModal(true),
          },
        ]}
      />

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>编辑危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                危险源名称 *
              </Typography>
              <TextField
                size='small'
                fullWidth
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.please_input')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  分类
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder={t('ehs.ehs_hazard_detail_page.please_input_2')}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  位置
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder={t('ehs.ehs_hazard_detail_page.please_input_3')}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
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
                    label={t('ehs.ehs_hazard_detail_page.text_08fe50')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        severity: e.target.value as 'high' | 'medium' | 'low',
                      }))
                    }
                  >
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='medium'>中</MenuItem>
                    <MenuItem value='low'>低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  暴露频率
                </Typography>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>暴露频率</InputLabel>
                  <Select
                    value={formData.exposure}
                    label={t('ehs.ehs_hazard_detail_page.text_f83966')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        exposure: e.target.value as 'high' | 'medium' | 'low',
                      }))
                    }
                  >
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='medium'>中</MenuItem>
                    <MenuItem value='low'>低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  发生概率
                </Typography>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <InputLabel>发生概率</InputLabel>
                  <Select
                    value={formData.likelihood}
                    label={t('ehs.ehs_hazard_detail_page.text_d7fbe9')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        likelihood: e.target.value as 'high' | 'medium' | 'low',
                      }))
                    }
                  >
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='medium'>中</MenuItem>
                    <MenuItem value='low'>低</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                状态
              </Typography>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>状态</InputLabel>
                <Select
                  value={formData.status}
                  label={t('ehs.ehs_hazard_detail_page.status')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as 'active' | 'controlled' | 'eliminated' | 'archived',
                    }))
                  }
                >
                  <MenuItem value='active'>活动中</MenuItem>
                  <MenuItem value='controlled'>已控制</MenuItem>
                  <MenuItem value='eliminated'>已消除</MenuItem>
                  <MenuItem value='archived'>已归档</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                描述
              </Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.description_2')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdateHazard}
            sx={{ backgroundColor: 'warning.600', '&:hover': { backgroundColor: ct.orange[700] } }}
          >
            保存更改
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showControlModal}
        onClose={() => setShowControlModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加控制措施</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                措施类型 *
              </Typography>
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>措施类型</InputLabel>
                <Select
                  value={controlFormData.measure_type}
                  label={t('ehs.ehs_hazard_detail_page.type')}
                  onChange={(e) =>
                    setControlFormData((prev) => ({
                      ...prev,
                      measure_type: e.target.value as 'engineering' | 'administrative' | 'ppe',
                    }))
                  }
                >
                  <MenuItem value='engineering'>工程控制</MenuItem>
                  <MenuItem value='administrative'>管理控制</MenuItem>
                  <MenuItem value='ppe'>个人防护</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, display: 'block' }}
              >
                措施描述 *
              </Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={controlFormData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setControlFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={t('ehs.ehs_hazard_detail_page.description_3')}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  负责人
                </Typography>
                <TextField
                  size='small'
                  fullWidth
                  value={controlFormData.responsible}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setControlFormData((prev) => ({ ...prev, responsible: e.target.value }))
                  }
                  placeholder={t('ehs.ehs_hazard_detail_page.manager_1')}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  完成期限
                </Typography>
                <TextField
                  type='date'
                  size='small'
                  fullWidth
                  value={controlFormData.deadline}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setControlFormData((prev) => ({ ...prev, deadline: e.target.value }))
                  }
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowControlModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAddControl}
            sx={{ backgroundColor: 'warning.600', '&:hover': { backgroundColor: ct.orange[700] } }}
          >
            添加措施
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingMeasureId(null);
        }}
        onConfirm={confirmDeleteControl}
        title={t('ehs.ehs_hazard_detail_page.confirm_delete')}
        message={t('ehs.ehs_hazard_detail_page.confirm')}
        danger
      />
    </PageContainer>
  );
};

export default EhsHazardDetailPage;
