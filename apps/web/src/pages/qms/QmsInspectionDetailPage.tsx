/**
 * 检验单详情页
 *
 * 包含：基本信息、检验结果项、审核日志
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock（按 :id 查找，未命中则取第一条）。
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from '@mui/material';
import { designTokens } from '@topems/tokens';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import { QMS_PATHS } from '@/modules/qms/config';
import i18n from '@/i18n';

export default function QmsInspectionDetailPage() {
  const { id } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const inspection = useMemo(() => {
    const list = data.inspections ?? [];
    return list.find((i) => i.id === id) ?? list[0];
  }, [data.inspections, id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    // 实际项目应调用审批 API；此处仅占位
    void targetStatus;
    void requiresApproval;
  };

  if (!inspection) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate(QMS_PATHS.inspection)}
            >
              {i18n.t('pages.qms_inspection_detail_page.k0')}
            </Button>
          }
        >
          {i18n.t('qms.qms_inspection_detail_page.k3')}
        </Alert>
      </Box>
    );
  }

  const infoFields = [
    { label: i18n.t('qms.qms_inspection_detail_page.k5'), value: inspection.inspection_no },
    { label: i18n.t('qms.qms_inspection_detail_page.k6'), value: inspection.inspection_type },
    { label: i18n.t('qms.qms_inspection_detail_page.k7'), value: inspection.product_name ?? '-' },
    { label: i18n.t('qms.qms_inspection_detail_page.k8'), value: inspection.inspector ?? '-' },
    { label: i18n.t('qms.qms_inspection_detail_page.k9'), value: inspection.assignee ?? '-' },
    { label: i18n.t('qms.qms_inspection_detail_page.k10'), value: String(inspection.quantity) },
    {
      label: i18n.t('qms.qms_inspection_detail_page.k11'),
      value: String(inspection.qualified_quantity ?? 0),
    },
    {
      label: i18n.t('qms.qms_inspection_detail_page.k12'),
      value: String(inspection.unqualified_quantity ?? 0),
    },
    {
      label: i18n.t('qms.qms_inspection_detail_page.k13'),
      value: `${inspection.qualification_rate ?? 0}%`,
    },
    { label: i18n.t('qms.qms_inspection_detail_page.k14'), value: inspection.result ?? '-' },
    {
      label: i18n.t('qms.qms_inspection_detail_page.k15'),
      value: inspection.inspected_at
        ? new Date(inspection.inspected_at).toLocaleString('zh-CN')
        : '-',
    },
    { label: i18n.t('qms.qms_inspection_detail_page.k16'), value: inspection.memo ?? '-' },
  ];

  const qualificationRate = inspection.qualification_rate ?? 0;
  const passed = qualificationRate > 95;

  const tabs = [
    {
      id: 'info',
      label: i18n.t('qms.qms_inspection_detail_page.k0'),
      content: (
        <Grid
          container
          spacing={2}
        >
          {infoFields.map((field) => (
            <Grid
              size={{ xs: 12, md: 6 }}
              key={field.label}
            >
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block' }}
                >
                  {field.label}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, fontWeight: 500 }}
                >
                  {field.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ),
    },
    {
      id: 'results',
      label: i18n.t('qms.qms_inspection_detail_page.k1'),
      content: (
        <Paper
          variant='outlined'
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('qms.qms_inspection_detail_page.k17')}
          </Typography>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k18')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k19')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k20')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k21')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k22')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k23')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k24')}</TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k25')}</TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    label={i18n.t('pages.qms_inspection_detail_page.k2')}
                    sx={{
                      bgcolor: designTokens.colors.success[100],
                      color: designTokens.colors.success[700],
                    }}
                  />
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k26')}</TableCell>
                <TableCell>±0.05mm</TableCell>
                <TableCell>{passed ? '0.02mm' : '0.08mm'}</TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    label={
                      passed
                        ? i18n.t('qms.qms_inspection_detail_page.k28')
                        : i18n.t('qms.qms_inspection_detail_page.k27')
                    }
                    sx={{
                      bgcolor: passed
                        ? designTokens.colors.success[100]
                        : designTokens.colors.error[100],
                      color: passed
                        ? designTokens.colors.success[700]
                        : designTokens.colors.error[700],
                    }}
                  />
                </TableCell>
                <TableCell>{i18n.t('qms.qms_inspection_detail_page.k29')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      ),
    },
    {
      id: 'audit',
      label: i18n.t('qms.qms_inspection_detail_page.k2'),
      content: (
        <Paper
          variant='outlined'
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('qms.qms_inspection_detail_page.k30')}
          </Typography>
          <Box
            component='ul'
            sx={{ listStyle: 'none', p: 0, m: 0 }}
          >
            <Box
              component='li'
              sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                [
                {inspection.created_at
                  ? new Date(inspection.created_at).toLocaleString('zh-CN')
                  : '-'}
                ]
              </Typography>
              <Typography variant='body2'>
                {i18n.t('qms.qms_inspection_detail_page.pending_31')}
              </Typography>
            </Box>
            {inspection.inspected_at && (
              <Box
                component='li'
                sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  [{new Date(inspection.inspected_at).toLocaleString('zh-CN')}]
                </Typography>
                <Typography variant='body2'>
                  {i18n.t('qms.qms_inspection_detail_page.k32')}
                </Typography>
              </Box>
            )}
            {inspection.status === 'completed' && (
              <Box
                component='li'
                sx={{ display: 'flex', gap: 1.5 }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('qms.inspectionDetail.k0')}
                </Typography>
                <Typography variant='body2'>
                  {i18n.t('qms.qms_inspection_detail_page.completed_33')}
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      ),
    },
  ];

  return (
    <DetailPageTemplate
      title={inspection.inspection_no}
      subtitle={inspection.product_name}
      detailItemName={inspection.inspection_no}
      onBack={() => navigate(QMS_PATHS.inspection)}
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StatusBadge
            fsm='inspection'
            status={inspection.status}
          />
          <FSMActionButtons
            fsm='inspection'
            currentStatus={inspection.status}
            onAction={handleAction}
          />
        </Box>
      }
      tabs={tabs}
    />
  );
}
