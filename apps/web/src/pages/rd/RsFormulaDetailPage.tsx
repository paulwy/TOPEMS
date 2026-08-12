import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RD_PATHS } from '@/modules/rd/config';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Edit, History, CheckCircle } from 'lucide-react';
import { DetailPageTemplate, type SectionConfig, type PageAction } from '@/components/templates';
import { formulaApi } from '@/api/rd';
import { PageContainer } from '@/components/common';
import type { Formula, FormulaVersion } from '@/api/rd';
import { useNotificationStore } from '@/store';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const RsFormulaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const formulaQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA(id || ''),
    queryFn: async () => {
      const response = await formulaApi.getFormula(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || '无法获取配方详情');
      }
      return response.data;
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const versionsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA_VERSIONS(id || ''),
    queryFn: async () => {
      const response = await formulaApi.listVersions(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || '无法获取版本历史');
      }
      return response.data;
    },
    enabled: !!id,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const approveMutation = useMutation({
    mutationFn: async (formulaId: string) => {
      const response = await formulaApi.approveFormula(formulaId);
      if (!response.success || !response.data) {
        throw new Error(response.message || '无法审批配方');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.RD.FORMULA(id || ''), data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.FORMULA_VERSIONS(id || '') ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: '审批成功',
        message: '配方已通过审批',
      });
    },
    onError: (error: unknown) => {
      logger.error('审批配方失败:', error);
      addNotification({
        type: 'error',
        title: '审批失败',
        message: error instanceof Error ? error.message : '无法审批配方',
      });
    },
  });

  const formula = formulaQuery.data || null;
  const versions = versionsQuery.data || [];
  const loading = formulaQuery.isLoading || versionsQuery.isLoading;
  const error = formulaQuery.error ? '加载配方详情失败' : null;
  const approving = approveMutation.isPending;

  React.useEffect(() => {
    if (formulaQuery.error) {
      logger.error('加载配方详情失败:', formulaQuery.error);
    }
  }, [formulaQuery.error]);

  const handleApprove = () => {
    if (!formula || approving) return;
    approveMutation.mutate(formula.id);
  };

  const handleEdit = () => {
    if (formula) {
      navigate(`${RD_PATHS.formula}/${formula.id}/edit`);
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'primary' | 'default' => {
    switch (status) {
      case '已发布':
      case 'approved':
        return 'success';
      case '测试中':
      case 'testing':
        return 'warning';
      case '草稿':
      case 'draft':
        return 'default';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return '已发布';
      case 'testing':
        return '测试中';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !formula) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>{error || '配方不存在'}</Alert>
      </Box>
    );
  }

  const sections: SectionConfig[] = [
    {
      id: 'description',
      title: '配方描述',
      content: (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formula.description || '暂无描述'}
        </Typography>
      ),
    },
    {
      id: 'process_steps',
      title: '工艺流程',
      content: (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formula.process_steps || '暂无工艺流程'}
        </Typography>
      ),
    },
    {
      id: 'components',
      title: '配方组成',
      content: (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>组分名称</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>单位</TableCell>
                <TableCell>纯度</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>备注</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formula.ingredients && formula.ingredients.length > 0 ? (
                formula.ingredients.map((comp, index) => (
                  <TableRow key={comp.id || index}>
                    <TableCell>{comp.name}</TableCell>
                    <TableCell>{comp.quantity}</TableCell>
                    <TableCell>{comp.unit || '-'}</TableCell>
                    <TableCell>{comp.purity || '-'}</TableCell>
                    <TableCell>{comp.supplier || '-'}</TableCell>
                    <TableCell>{comp.notes || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align='center'
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      暂无配方组成
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
  ];

  const sidebar = (
    <Stack spacing={2}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 'bold' }}
      >
        版本历史
      </Typography>
      {versions.length > 0 ? (
        versions.map((v, index) => (
          <Paper
            key={v.id || index}
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between' }}
            >
              <Chip
                label={v.version}
                size='small'
              />
              <Typography variant='caption'>{v.created_at}</Typography>
            </Stack>
            <Typography
              variant='body2'
              sx={{ mt: 1 }}
            >
              {v.changes || '暂无变更说明'}
            </Typography>
            {v.approved_by && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 1 }}
              >
                审批人: {v.approved_by}
              </Typography>
            )}
          </Paper>
        ))
      ) : (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          暂无版本历史
        </Typography>
      )}
    </Stack>
  );

  const infoCard = {
    title: formula.name,
    subtitle: `编码: ${formula.code}`,
    tags: [formula.version, getStatusLabel(formula.status)],
    stats: [
      { label: '创建人', value: formula.created_by },
      { label: '创建时间', value: formula.created_at },
      { label: '更新时间', value: formula.updated_at },
      { label: '生效日期', value: formula.effective_date || '-' },
      { label: '过期日期', value: formula.expiration_date || '-' },
    ],
  };

  const actions: PageAction[] = [
    {
      label: '版本历史',
      icon: <History size={18} />,
      onClick: () => {},
      variant: 'outlined' as const,
    },
    {
      label: '编辑',
      icon: <Edit size={18} />,
      onClick: handleEdit,
      variant: 'contained' as const,
    },
    formula.status !== 'approved' && {
      label: '审批',
      icon: <CheckCircle size={18} />,
      onClick: handleApprove,
      variant: 'contained' as const,
      color: 'success' as const,
      loading: approving,
    },
  ].filter(Boolean) as PageAction[];

  return (
    <PageContainer
      title={formula.name}
      subtitle={`编码: ${formula.code}`}
    >
      <DetailPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.formula}
        detailItemName={formula?.name || formula?.code || '配方详情'}
        infoCard={infoCard}
        sections={sections}
        sidebar={sidebar}
        actions={actions}
      />
    </PageContainer>
  );
};

export default RsFormulaDetailPage;
