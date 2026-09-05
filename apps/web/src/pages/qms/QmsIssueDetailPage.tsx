/**
 * 质量问题详情页
 *
 * 包含：基本信息 + 纠正措施列表（含 8D 关联提示）
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Grid,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQmsMock, type QmsMockShape } from '@/api/qms/mockData';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import {
  DetailPageTemplate,
  type TabConfig,
  type DetailField,
} from '@/components/templates/DetailPageTemplate';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

function getSeverityLabels(): Record<string, string> {
  return {
    critical: i18n.t('qms.qms_issue_detail_page.k0'),
    major: i18n.t('qms.qms_issue_detail_page.k1'),
    minor: i18n.t('qms.qms_issue_detail_page.k2'),
    low: i18n.t('qms.qms_issue_detail_page.k3'),
  };
}

function formatDate(date?: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
}

function formatDateTime(date?: string) {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
}

function DetailFieldItem({ label, value }: DetailField) {
  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, height: '100%' }}
    >
      <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</InputLabel>
      <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>{value}</Typography>
    </Paper>
  );
}

export default function QmsIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQmsMock<QmsMockShape>();
  const issue = useMemo(() => {
    const list = data.issues ?? [];
    return list.find((i) => i.id === id) ?? list[0];
  }, [data.issues, id]);
  const improvements = useMemo(() => data.improvements ?? [], [data.improvements]);
  const eightDReports = useMemo(() => data.eightDReports ?? [], [data.eightDReports]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const handleBack = () => {
    navigate(QMS_PATHS.nonconformance);
  };

  const tabs = useMemo<TabConfig[]>(() => {
    if (!issue) return [];
    const basicInfoFields: DetailField[] = [
      { label: i18n.t('qms.qms_issue_detail_page.k8'), value: issue.issue_no },
      {
        label: i18n.t('qms.qms_issue_detail_page.k9'),
        value: getSeverityLabels()[issue.severity] ?? issue.severity,
      },
      { label: i18n.t('qms.qms_issue_detail_page.k10'), value: issue.category },
      { label: i18n.t('qms.qms_issue_detail_page.k11'), value: issue.assignee },
      { label: i18n.t('qms.qms_issue_detail_page.k12'), value: formatDate(issue.due_date) },
      { label: i18n.t('qms.qms_issue_detail_page.k13'), value: formatDateTime(issue.closed_at) },
    ];

    return [
      {
        id: 'info',
        label: i18n.t('qms.qms_issue_detail_page.k4'),
        content: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid
              container
              spacing={2}
            >
              {basicInfoFields.map((field) => (
                <Grid
                  size={{ xs: 12, md: 6 }}
                  key={field.label}
                >
                  <DetailFieldItem
                    label={field.label}
                    value={field.value}
                  />
                </Grid>
              ))}
            </Grid>
            <Paper
              variant='outlined'
              sx={{ p: 3 }}
            >
              <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                {i18n.t('qms.qms_issue_detail_page.k14')}
              </InputLabel>
              <Typography sx={{ mt: 1, lineHeight: 1.6 }}>{issue.description}</Typography>
            </Paper>
            {issue.resolution && (
              <Paper
                variant='outlined'
                sx={{
                  p: 3,
                  bgcolor: ct.success[50],
                  borderColor: ct.success[200],
                }}
              >
                <InputLabel sx={{ fontSize: 12, color: ct.success[700] }}>
                  {i18n.t('qms.qms_issue_detail_page.k15')}
                </InputLabel>
                <Typography sx={{ mt: 1, color: ct.success[800], lineHeight: 1.6 }}>
                  {issue.resolution}
                </Typography>
              </Paper>
            )}
            {eightDReports.length > 0 && (
              <Paper
                variant='outlined'
                sx={{ p: 3 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('qms.qms_issue_detail_page.8d_16')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.qms_issue_detail_page.k0')} {eightDReports.length}{' '}
                  {i18n.t('pages.qms_issue_detail_page.k1')}
                </Typography>
              </Paper>
            )}
          </Box>
        ),
      },
      {
        id: 'actions',
        label: i18n.t('qms.qms_issue_detail_page.k5'),
        content: (
          <Box>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('qms.qms_issue_detail_page.k17')}
            </Typography>
            {improvements.length === 0 ? (
              <Typography color='text.secondary'>
                {i18n.t('qms.qms_issue_detail_page.k18')}
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('qms.qms_issue_detail_page.k19')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_issue_detail_page.k20')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_issue_detail_page.k21')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_issue_detail_page.k22')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {improvements.map((im) => (
                      <TableRow key={im.id}>
                        <TableCell sx={{ fontWeight: 'medium' }}>{im.improvement_no}</TableCell>
                        <TableCell>{im.title}</TableCell>
                        <TableCell>{im.assignee}</TableCell>
                        <TableCell>{im.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ),
      },
    ];
  }, [eightDReports.length, improvements, issue]);

  if (!issue) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='warning'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={handleBack}
            >
              {i18n.t('pages.qms_issue_detail_page.k0')}
            </Button>
          }
        >
          {i18n.t('qms.qms_issue_detail_page.k6')}
        </Alert>
      </Box>
    );
  }

  return (
    <DetailPageTemplate
      title={issue.issue_no}
      subtitle={issue.title}
      onBack={handleBack}
      tabs={tabs}
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <StatusBadge
            fsm='issue'
            status={issue.status}
          />
          <FSMActionButtons
            fsm='issue'
            currentStatus={issue.status}
            onAction={handleAction}
          />
        </Box>
      }
    />
  );
}
