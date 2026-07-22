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

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const CompliancePage: React.FC = () => {
  const { t } = useTranslation();
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
      draft: { bg: 'grey.100', color: 'text.secondary', label: t('ehs.compliance_page.text_22b433') },
      published: { bg: 'info.lighter', color: 'info.dark', label: t('ehs.compliance_page.text_dca0c1') },
      effective: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.compliance_page.text_c6cc39') },
      expired: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.compliance_page.text_4d5ccd') },
      archived: { bg: 'grey.200', color: 'text.secondary', label: t('ehs.compliance_page.text_c3ba16') },
      in_progress: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.compliance_page.in_progress') },
      completed: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.compliance_page.completed') },
      approved: { bg: 'primary.lighter', color: 'primary.dark', label: t('ehs.compliance_page.text_337737') },
      valid: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.compliance_page.text_c6cc39') },
      revoked: { bg: 'error.light', color: 'error.dark', label: t('ehs.compliance_page.text_50239f') },
      pending_renewal: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.compliance_page.text_45714f') },
      compliant: { bg: 'success.lighter', color: 'success.dark', label: t('ehs.compliance_page.text_6d266c') },
      partially_compliant: { bg: 'warning.lighter', color: 'warning.dark', label: t('ehs.compliance_page.text_b4ab6f') },
      non_compliant: { bg: 'error.lighter', color: 'error.dark', label: t('ehs.compliance_page.text_0b181a') },
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
      law: t('ehs.compliance_page.text_c47d7a'),
      regulation: t('ehs.compliance_page.text_bfe798'),
      standard: t('ehs.compliance_page.text_544fac'),
      policy: t('ehs.compliance_page.text_2c973b'),
      notice: t('ehs.compliance_page.text_5660bc'),
    };
    return typeMap[type] || type;
  };

  const regulationColumns: ColumnDef<EnvironmentalRegulation>[] = useMemo(
    () => [
      { id: 'regulation_no', label: t('ehs.compliance_page.text_081b91') },
      { id: 'title', label: t('ehs.compliance_page.name') },
      {
        id: 'regulation_type',
        label: t('ehs.compliance_page.type'),
        render: (row) => getRegulationTypeLabel(row.regulation_type),
      },
      { id: 'issuing_authority', label: t('ehs.compliance_page.text_6c7c79'), render: (row) => row.issuing_authority || '-' },
      { id: 'issue_date', label: t('ehs.compliance_page.date'), render: (row) => row.issue_date || '-' },
      { id: 'status', label: t('ehs.compliance_page.status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const assessmentColumns: ColumnDef<ComplianceAssessment>[] = useMemo(
    () => [
      { id: 'assessment_no', label: t('ehs.compliance_page.text_3e9922') },
      { id: 'title', label: t('ehs.compliance_page.name_1') },
      { id: 'assessment_type', label: t('ehs.compliance_page.type_1') },
      { id: 'assessor', label: t('ehs.compliance_page.text_ab3d92'), render: (row) => row.assessor || '-' },
      { id: 'assessment_date', label: t('ehs.compliance_page.date_1'), render: (row) => row.assessment_date || '-' },
      { id: 'result', label: t('ehs.compliance_page.text_37fa4b'), render: (row) => getStatusBadge(row.result) },
      { id: 'status', label: t('ehs.compliance_page.status'), render: (row) => getStatusBadge(row.status) },
    ],
    []
  );

  const permitColumns: ColumnDef<DischargePermit>[] = useMemo(
    () => [
      { id: 'permit_no', label: t('ehs.compliance_page.text_c94e36') },
      { id: 'title', label: t('ehs.compliance_page.name_2') },
      { id: 'permit_type', label: t('ehs.compliance_page.type_2') },
      { id: 'permit_category', label: t('ehs.compliance_page.text_eb20f1') },
      { id: 'holder', label: t('ehs.compliance_page.text_2539a2'), render: (row) => row.holder || '-' },
      { id: 'expiry_date', label: t('ehs.compliance_page.date_2'), render: (row) => row.expiry_date || '-' },
      { id: 'status', label: t('ehs.compliance_page.status'), render: (row) => getStatusBadge(row.status) },
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
        label: t('ehs.compliance_page.status'),
        type: 'select' as const,
        options: [
          { value: 'all', label: t('ehs.compliance_page.all') },
          { value: 'draft', label: t('ehs.compliance_page.text_22b433') },
          { value: 'published', label: t('ehs.compliance_page.text_dca0c1') },
          { value: 'effective', label: t('ehs.compliance_page.text_c6cc39') },
          { value: 'expired', label: t('ehs.compliance_page.text_4d5ccd') },
          { value: 'archived', label: t('ehs.compliance_page.text_c3ba16') },
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
      addNotification({ title: t('ehs.compliance_page.success'), message: t('ehs.compliance_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EHS.COMPLIANCE_REGULATIONS });
      setShowCreateModal(false);
    },
    onError: (error: unknown) => {
      addNotification({ title: t('ehs.compliance_page.error'), message: t('ehs.compliance_page.create_1'), type: 'error' });
      apiLogger.error(t('ehs.compliance_page.create_2'), error);
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
      label: t('ehs.compliance_page.text_ad9946'),
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
          <Tab label={t('ehs.compliance_page.text_b95fd3')} />
          <Tab label={t('ehs.compliance_page.text_fd93f0')} />
          <Tab label={t('ehs.compliance_page.text_20a284')} />
        </Tabs>
      </Card>

      <ListPageTemplate
        title=''
        columns={currentColumns as unknown as ColumnDef<unknown>[]}
        data={currentData as unknown[]}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('ehs.compliance_page.search')}
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
              label={t('ehs.compliance_page.name_3')}
              value={regulationFormData.title}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, title: e.target.value })
              }
              placeholder={t('ehs.compliance_page.please_input')}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>类别 *</InputLabel>
                <Select
                  value={regulationFormData.category}
                  label={t('ehs.compliance_page.text_383a6d')}
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
                  label={t('ehs.compliance_page.type_3')}
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
                label={t('ehs.compliance_page.text_6c7c79')}
                value={regulationFormData.issuing_authority}
                onChange={(e) =>
                  setRegulationFormData({
                    ...regulationFormData,
                    issuing_authority: e.target.value,
                  })
                }
                placeholder={t('ehs.compliance_page.please_input_1')}
              />
              <TextField
                fullWidth
                type='date'
                label={t('ehs.compliance_page.date')}
                value={regulationFormData.issue_date}
                onChange={(e) =>
                  setRegulationFormData({ ...regulationFormData, issue_date: e.target.value })
                }
              />
            </Box>
            <TextField
              fullWidth
              type='date'
              label={t('ehs.compliance_page.date_3')}
              value={regulationFormData.effective_date}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, effective_date: e.target.value })
              }
            />
            <TextField
              fullWidth
              label={t('ehs.compliance_page.content')}
              value={regulationFormData.content}
              onChange={(e) =>
                setRegulationFormData({ ...regulationFormData, content: e.target.value })
              }
              placeholder={t('ehs.compliance_page.please_input_2')}
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
