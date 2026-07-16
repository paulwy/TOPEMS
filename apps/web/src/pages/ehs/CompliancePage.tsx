import React, { useState, useMemo } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { Plus, FileCheck, ClipboardCheck, AlertTriangle, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ehsApi } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainerV2';
import type { EnvironmentalRegulation, ComplianceAssessment, DischargePermit } from '@/api/ehs';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const CompliancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [regulationFormData, setRegulationFormData] = useState({
    title: '',
    category: 'environmental',
    regulation_type: 'law',
    issuing_authority: '',
    issue_date: '',
    effective_date: '',
    content: '',
  });

  const { data: regulationsData, isLoading: regulationsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.COMPLIANCE_REGULATIONS, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listEnvironmentalRegulations({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const regulations = (regulationsData as EnvironmentalRegulation[]) || [];

  const { data: assessmentsData, isLoading: assessmentsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.COMPLIANCE_ASSESSMENTS, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listComplianceAssessments({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const assessments = (assessmentsData as ComplianceAssessment[]) || [];

  const { data: permitsData, isLoading: permitsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.EHS.COMPLIANCE_PERMITS, searchTerm],
    queryFn: async () => {
      const response = await ehsApi.listDischargePermits({
        pagesize: 100,
        search: searchTerm || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },
  });
  const permits = (permitsData as DischargePermit[]) || [];

  const loading = regulationsLoading || assessmentsLoading || permitsLoading;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      draft: { bg: 'grey.100', color: 'text.secondary', label: '草稿' },
      published: { bg: 'info.lighter', color: 'info.dark', label: '已发布' },
      effective: { bg: 'success.lighter', color: 'success.dark', label: '有效' },
      expired: { bg: 'error.lighter', color: 'error.dark', label: '已过期' },
      archived: { bg: 'grey.200', color: 'text.secondary', label: '已归档' },
      in_progress: { bg: 'warning.lighter', color: 'warning.dark', label: '进行中' },
      completed: { bg: 'success.lighter', color: 'success.dark', label: '已完成' },
      approved: { bg: 'primary.lighter', color: 'primary.dark', label: '已批准' },
      valid: { bg: 'success.lighter', color: 'success.dark', label: '有效' },
      revoked: { bg: 'error.light', color: 'error.dark', label: '已撤销' },
      pending_renewal: { bg: 'warning.lighter', color: 'warning.dark', label: '待续期' },
      compliant: { bg: 'success.lighter', color: 'success.dark', label: '合规' },
      partially_compliant: { bg: 'warning.lighter', color: 'warning.dark', label: '部分合规' },
      non_compliant: { bg: 'error.lighter', color: 'error.dark', label: '不合规' },
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

  const getRegulationTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      law: '法律',
      regulation: '法规',
      standard: '标准',
      policy: '政策',
      notice: '通知',
    };
    return typeMap[type] || type;
  };

  const regulationColumns: ColumnDef<EnvironmentalRegulation>[] = useMemo(
    () => [
      { id: 'regulation_no', label: '法规编号' },
      { id: 'title', label: '法规名称' },
      {
        id: 'regulation_type',
        label: '类型',
        render: (row) => getRegulationTypeLabel(row.regulation_type),
      },
      { id: 'issuing_authority', label: '发布机构', render: (row) => row.issuing_authority || '-' },
      { id: 'issue_date', label: '发布日期', render: (row) => row.issue_date || '-' },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const assessmentColumns: ColumnDef<ComplianceAssessment>[] = useMemo(
    () => [
      { id: 'assessment_no', label: '评估编号' },
      { id: 'title', label: '评估名称' },
      { id: 'assessment_type', label: '评估类型' },
      { id: 'assessor', label: '评估人', render: (row) => row.assessor || '-' },
      { id: 'assessment_date', label: '评估日期', render: (row) => row.assessment_date || '-' },
      { id: 'result', label: '评估结果', render: (row) => getStatusBadge(row.result) },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const permitColumns: ColumnDef<DischargePermit>[] = useMemo(
    () => [
      { id: 'permit_no', label: '许可证编号' },
      { id: 'title', label: '许可证名称' },
      { id: 'permit_type', label: '许可类型' },
      { id: 'permit_category', label: '许可类别' },
      { id: 'holder', label: '持证人', render: (row) => row.holder || '-' },
      { id: 'expiry_date', label: '到期日期', render: (row) => row.expiry_date || '-' },
      { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const currentColumns =
    activeTab === 0 ? regulationColumns : activeTab === 1 ? assessmentColumns : permitColumns;
  const currentData = activeTab === 0 ? regulations : activeTab === 1 ? assessments : permits;

  const stats = useMemo(
    () => ({
      totalRegulations: regulations.length,
      effectiveRegulations: regulations.filter((r) => r.status === 'effective').length,
      completedAssessments: assessments.filter((a) => a.status === 'completed').length,
      validPermits: permits.filter((p) => p.status === 'valid').length,
    }),
    [regulations, assessments, permits]
  );

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'all', label: '全部' },
          { value: 'draft', label: '草稿' },
          { value: 'published', label: '已发布' },
          { value: 'effective', label: '有效' },
          { value: 'expired', label: '已过期' },
          { value: 'archived', label: '已归档' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const handleCreate = () => {
    setRegulationFormData({
      title: '',
      category: 'environmental',
      regulation_type: 'law',
      issuing_authority: '',
      issue_date: '',
      effective_date: '',
      content: '',
    });
    setShowCreateModal(true);
  };

  const createRegulationMutation = useMutation({
    mutationFn: (data: Parameters<typeof ehsApi.createEnvironmentalRegulation>[0]) =>
      ehsApi.createEnvironmentalRegulation(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '法规创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.COMPLIANCE_REGULATIONS });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建法规失败:', error);
    },
  });

  const handleSaveRegulation = () => {
    createRegulationMutation.mutate({
      title: regulationFormData.title,
      category: regulationFormData.category,
      regulation_type: regulationFormData.regulation_type as
        'law' | 'regulation' | 'standard' | 'policy' | 'notice',
      issuing_authority: regulationFormData.issuing_authority || null,
      issue_date: regulationFormData.issue_date || null,
      effective_date: regulationFormData.effective_date || null,
      content: regulationFormData.content || null,
    });
  };

  const headerActions = [
    {
      label: '新建法规',
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: 'contained' as const,
      color: 'primary' as const,
    },
  ];

  return (
    <PageContainer
      headerProps={{
        actions: headerActions,
        pageIcon: <Shield sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
      maxWidth='xl'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'success.light' }}>
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
                <FileCheck sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  法规总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.totalRegulations}
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
                  bgcolor: 'primary.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield sx={{ width: 20, height: 20, color: 'primary.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  有效法规
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.effectiveRegulations}
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
                <ClipboardCheck sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  已完成评估
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.completedAssessments}
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
                <AlertTriangle sx={{ width: 20, height: 20, color: 'info.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  有效许可证
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {stats.validPermits}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label='法规清单' />
          <Tab label='合规检查' />
          <Tab label='许可证' />
        </Tabs>
      </Card>

      <ListPageTemplate
        title=''
        columns={currentColumns as unknown as ColumnDef<unknown>[]}
        data={currentData as unknown[]}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.COMPLIANCE_REGULATIONS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.COMPLIANCE_ASSESSMENTS });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.COMPLIANCE_PERMITS });
        }}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新建法规</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='法规名称 *'
              value={regulationFormData.title}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, title: e.target.value })
              }
              placeholder='请输入法规名称'
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>类别 *</InputLabel>
                <Select
                  value={regulationFormData.category}
                  label='类别'
                  onChange={(e) =>
                    setRegulationFormData({ ...regulationFormData, category: e.target.value })
                  }
                >
                  <MenuItem value='environmental'>环境法规</MenuItem>
                  <MenuItem value='safety'>安全法规</MenuItem>
                  <MenuItem value='health'>职业健康</MenuItem>
                  <MenuItem value='chemical'>化学品</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>法规类型 *</InputLabel>
                <Select
                  value={regulationFormData.regulation_type}
                  label='法规类型'
                  onChange={(e) =>
                    setRegulationFormData({
                      ...regulationFormData,
                      regulation_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value='law'>法律</MenuItem>
                  <MenuItem value='regulation'>法规</MenuItem>
                  <MenuItem value='standard'>标准</MenuItem>
                  <MenuItem value='policy'>政策</MenuItem>
                  <MenuItem value='notice'>通知</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label='发布机构'
                value={regulationFormData.issuing_authority}
                onChange={(e) =>
                  setRegulationFormData({
                    ...regulationFormData,
                    issuing_authority: e.target.value,
                  })
                }
                placeholder='请输入发布机构'
              />
              <TextField
                fullWidth
                type='date'
                label='发布日期'
                value={regulationFormData.issue_date}
                onChange={(e) =>
                  setRegulationFormData({ ...regulationFormData, issue_date: e.target.value })
                }
              />
            </Box>
            <TextField
              fullWidth
              type='date'
              label='生效日期'
              value={regulationFormData.effective_date}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, effective_date: e.target.value })
              }
            />
            <TextField
              fullWidth
              label='法规内容'
              value={regulationFormData.content}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, content: e.target.value })
              }
              placeholder='请输入法规内容'
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
            onClick={handleSaveRegulation}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default CompliancePage;
