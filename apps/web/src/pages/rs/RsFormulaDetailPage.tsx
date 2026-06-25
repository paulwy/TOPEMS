import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
  LinearProgress,
  Alert,
} from '@mui/material';
import { Button } from '@mui/material';
import { Edit, History, CheckCircle } from 'lucide-react';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { formulaApi } from '@/api/rs';
import type { Formula, FormulaVersion } from '@/api/rs';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';

const RsFormulaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [formula, setFormula] = useState<Formula | null>(null);
  const [versions, setVersions] = useState<FormulaVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (id) {
      loadFormula(id);
    }
  }, [id]);

  const loadFormula = async (formulaId: string) => {
    try {
      setLoading(true);
      setError(null);

      const [formulaResponse, versionsResponse] = await Promise.all([
        formulaApi.getFormula(formulaId),
        formulaApi.listVersions(formulaId),
      ]);

      if (formulaResponse.success && formulaResponse.data) {
        setFormula(formulaResponse.data);
      } else {
        setError('无法获取配方详情');
      }

      if (versionsResponse.success && versionsResponse.data) {
        setVersions(versionsResponse.data);
      }
    } catch (error: unknown) {
      logger.error('加载配方详情失败:', error);
      setError('加载配方详情失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载配方详情',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!formula || approving) return;
    try {
      setApproving(true);
      const response = await formulaApi.approveFormula(formula.id);
      if (response.success && response.data) {
        setFormula(response.data);
        addNotification({
          type: 'success',
          title: '审批成功',
          message: '配方已通过审批',
        });
        loadFormula(formula.id);
      } else {
        addNotification({
          type: 'error',
          title: '审批失败',
          message: '无法审批配方',
        });
      }
    } catch (error: unknown) {
      logger.error('审批配方失败:', error);
      addNotification({
        type: 'error',
        title: '审批失败',
        message: '无法审批配方',
      });
    } finally {
      setApproving(false);
    }
  };

  const handleEdit = () => {
    if (formula) {
      navigate(`/rs/formulas/${formula.id}/edit`);
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
                  <TableCell colSpan={6} align='center'>
                    <Typography variant='body2' color='text.secondary'>
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
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
                审批人: {v.approved_by}
              </Typography>
            )}
          </Paper>
        ))
      ) : (
        <Typography variant='body2' color='text.secondary'>
          暂无版本历史
        </Typography>
      )}
    </Stack>
  );

  const infoCard = {
    title: formula.name,
    subtitle: `编码: ${formula.code}`,
    tags: [
      { label: formula.version },
      { label: getStatusLabel(formula.status), color: getStatusColor(formula.status) },
    ],
    stats: [
      { label: '创建人', value: formula.created_by },
      { label: '创建时间', value: formula.created_at },
      { label: '更新时间', value: formula.updated_at },
      { label: '生效日期', value: formula.effective_date || '-' },
      { label: '过期日期', value: formula.expiration_date || '-' },
    ],
  };

  const actions = [
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
  ].filter(Boolean) as any[];

  return (
    <DetailPageTemplate
      title={formula.name}
      subtitle={`编码: ${formula.code}`}
      infoCard={infoCard}
      sections={sections}
      sidebar={sidebar}
      actions={actions}
    />
  );
};

export default RsFormulaDetailPage;