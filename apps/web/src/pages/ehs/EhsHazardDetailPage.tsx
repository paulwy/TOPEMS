import React, { useState, useEffect, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
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
import type { Hazard, RiskAssessment, ControlMeasure } from '@/api/ehs';
import { EHSStatusBadge, EHSMeasureTypeBadge, calculateRiskLevel } from '@/components/ehs';
import { useNotification } from '@/hooks/useNotification';
import { DetailPageTemplate, type TabConfig, type SectionConfig } from '@/components/templates';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PageContainer } from '@/components/common/PageContainerV2';

interface ControlFormData {
  measure_type: 'engineering' | 'administrative' | 'ppe';
  description: string;
  responsible: string;
  deadline: string;
}

const EhsHazardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [hazard, setHazard] = useState<Hazard | null>(null);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [controls, setControls] = useState<ControlMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    if (id) {
      loadHazardDetail(id);
    }
  }, [id]);

  const loadHazardDetail = async (hazardId: string) => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const [hazardRes, assessmentsRes, controlsRes] = await Promise.all([
        ehsApi.getHazard(hazardId),
        ehsApi.listRiskAssessments(hazardId),
        ehsApi.listControlMeasures(hazardId),
      ]);

      if (hazardRes.success && hazardRes.data) {
        const safetyHazard = hazardRes.data as any;
        const hazardData: Hazard = {
          id: safetyHazard.id,
          name: safetyHazard.name,
          description: safetyHazard.description,
          category: safetyHazard.category,
          location: safetyHazard.location,
          severity: safetyHazard.level?.includes('高')
            ? 'high'
            : safetyHazard.level?.includes('重大')
              ? 'high'
              : safetyHazard.level?.includes('中')
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
        setHazard(hazardData);
        setFormData({
          name: hazardData.name || '',
          description: hazardData.description || '',
          category: hazardData.category || '',
          location: hazardData.location || '',
          severity: hazardData.severity || 'medium',
          exposure: hazardData.exposure || 'medium',
          likelihood: hazardData.likelihood || 'medium',
          status: hazardData.status || 'active',
        });
      } else {
        throw new Error(hazardRes.message || '加载危险源详情失败');
      }

      if (assessmentsRes.success && assessmentsRes.data) {
        const assessmentsData = assessmentsRes.data as any;
        const assessmentsArray = Array.isArray(assessmentsData)
          ? assessmentsData
          : assessmentsData.data || assessmentsData.assessments || [];
        setAssessments(assessmentsArray);
      }

      if (controlsRes.success && controlsRes.data) {
        const controlsData = controlsRes.data as any;
        const controlsArray = Array.isArray(controlsData)
          ? controlsData
          : controlsData.data || controlsData.measures || [];
        setControls(controlsArray);
      }
    } catch (err: unknown) {
      apiLogger.error('加载危险源详情失败:', err);
      setErrorMessage('加载危险源详情失败');
      error('加载危险源详情失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <EHSStatusBadge
        status={status}
        type='hazard'
      />
    );
  };

  const handleUpdateHazard = async () => {
    if (!hazard) return;
    if (!formData.name.trim()) {
      error('请输入危险源名称');
      return;
    }
    try {
      const response = await ehsApi.updateHazard(hazard.id, {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        location: formData.location,
        level: formData.severity === 'high' ? '高' : formData.severity === 'medium' ? '中' : '低',
        status: formData.status,
      });
      if (response.success) {
        success('危险源更新成功');
        setShowEditModal(false);
        loadHazardDetail(hazard.id);
      } else {
        error('更新失败，请稍后重试');
      }
    } catch (err: unknown) {
      apiLogger.error('更新危险源失败:', err);
      error('更新失败，请稍后重试');
    }
  };

  const handleAddControl = async () => {
    if (!hazard) return;
    if (!controlFormData.description.trim()) {
      error('请输入措施描述');
      return;
    }
    try {
      const response = await ehsApi.createControlMeasure(hazard.id, {
        measure_type: controlFormData.measure_type,
        description: controlFormData.description,
        responsible: controlFormData.responsible || null,
        deadline: controlFormData.deadline || null,
        status: 'pending',
      });
      if (response.success) {
        success('控制措施添加成功');
        setShowControlModal(false);
        setControlFormData({
          measure_type: 'engineering',
          description: '',
          responsible: '',
          deadline: '',
        });
        loadHazardDetail(hazard.id);
      } else {
        error('添加失败，请稍后重试');
      }
    } catch (err: unknown) {
      apiLogger.error('添加控制措施失败:', err);
      error('添加失败，请稍后重试');
    }
  };

  const handleDeleteControl = (measureId: string) => {
    setDeletingMeasureId(measureId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteControl = async () => {
    if (!hazard || !deletingMeasureId) return;
    try {
      const response = await ehsApi.deleteControlMeasure(hazard.id, deletingMeasureId);
      if (response.success) {
        success('控制措施删除成功');
        loadHazardDetail(hazard.id);
      } else {
        error('删除失败，请稍后重试');
      }
    } catch (err: unknown) {
      apiLogger.error('删除控制措施失败:', err);
      error('删除失败，请稍后重试');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingMeasureId(null);
    }
  };

  const assessmentColumns: ColumnDef<RiskAssessment>[] = [
    {
      accessorKey: 'assessment_date',
      header: '评估日期',
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
      header: '评估人',
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
      header: '风险等级',
      cell: ({ row }) => {
        const riskResult = calculateRiskLevel(
          row.original.severity || 'medium',
          row.original.likelihood || 'medium'
        );
        const colorMap: Record<string, { bg: string; color: string }> = {
          高风险: { bg: 'error.lighter', color: 'error.dark' },
          中风险: { bg: 'warning.100', color: '#ca8a04' },
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
    { accessorKey: 'recommendations', header: '建议措施' },
  ];

  const controlColumns: ColumnDef<ControlMeasure>[] = [
    {
      accessorKey: 'measure_type',
      header: '措施类型',
      cell: ({ row }) => <EHSMeasureTypeBadge type={row.original.measure_type} />,
    },
    { accessorKey: 'description', header: '措施描述' },
    {
      accessorKey: 'responsible',
      header: '负责人',
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
      header: '完成期限',
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
      header: '状态',
      cell: ({ row }) => (
        <EHSStatusBadge
          status={row.original.status}
          type='control'
        />
      ),
    },
    {
      id: 'actions',
      header: '操作',
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
              {hazard.severity === 'high' ? '高' : hazard.severity === 'medium' ? '中' : '低'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography sx={{ color: '#ca8a04', fontSize: 12 }}>暴露频率</Typography>
            <Typography sx={{ fontWeight: 500, color: '#a16207', mt: 0.5 }}>
              {hazard.exposure === 'high' ? '高' : hazard.exposure === 'medium' ? '中' : '低'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography sx={{ color: 'primary.dark', fontSize: 12 }}>发生概率</Typography>
            <Typography sx={{ fontWeight: 500, color: 'primary.dark', mt: 0.5 }}>
              {hazard.likelihood === 'high' ? '高' : hazard.likelihood === 'medium' ? '中' : '低'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>描述</Typography>
          <Typography sx={{ color: 'text.primary', mt: 0.5, fontSize: 14, lineHeight: 1.6 }}>
            {hazard.description || '暂无描述'}
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
      { id: 'basic', label: '基本信息', content: basicInfoContent || <></> },
      { id: 'assessments', label: '风险评估', content: assessmentsContent },
      { id: 'controls', label: '控制措施', content: controlsContent },
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
          label: '严重程度',
          value: hazard.severity === 'high' ? '高' : hazard.severity === 'medium' ? '中' : '低',
        },
        { label: '风险等级', value: `${riskInfo.level}风险` },
      ],
    };
  }, [hazard]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <AlertTriangle sx={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      }}
      backButton={{ href: '/ehs/hazards' }}
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
            label: '添加控制措施',
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
                placeholder='请输入危险源名称'
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
                  placeholder='请输入分类'
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
                  placeholder='请输入位置'
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
                    label='严重程度'
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
                    label='暴露频率'
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
                    label='发生概率'
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
                  label='状态'
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
                placeholder='请描述危险源...'
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
            sx={{ backgroundColor: 'warning.600', '&:hover': { backgroundColor: '#c2410c' } }}
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
                  label='措施类型'
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
                placeholder='请描述具体的控制措施...'
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
                  placeholder='请输入负责人'
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
            sx={{ backgroundColor: 'warning.600', '&:hover': { backgroundColor: '#c2410c' } }}
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
        title='确认删除'
        message='确定要删除此控制措施吗？'
        danger
      />
    </PageContainer>
  );
};

export default EhsHazardDetailPage;
