/**
 * 8D 报告详情页
 *
 * 包含：8 步骤时间线（D1-D8）+ 每步骤内容展示 + 审计日志
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自真实 API。
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Grid, Typography, Button, Chip, Alert } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { eightDApi } from '@/api/qms/eightD';
import type { EightDReport } from '@/api/qms/types';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { DetailPageTemplate } from '@/components/templates';
import { QMS_PATHS } from '@/modules/qms/config';
import i18n from '@/i18n';

function getSteps() {
  return [
    {
      id: 'd1',
      label: i18n.t('pages.qms_eight_d_detail_page.d1_0'),
      field: 'd1Content',
      done: 'd1TeamEstablished',
    },
    {
      id: 'd2',
      label: i18n.t('pages.qms_eight_d_detail_page.d2_1'),
      field: 'd2Content',
      done: 'd2ProblemDescribed',
    },
    {
      id: 'd3',
      label: i18n.t('pages.qms_eight_d_detail_page.d3_2'),
      field: 'd3Content',
      done: 'd3ContainmentImplemented',
    },
    {
      id: 'd4',
      label: i18n.t('pages.qms_eight_d_detail_page.d4_3'),
      field: 'd4Content',
      done: 'd4RootCauseIdentified',
    },
    {
      id: 'd5',
      label: i18n.t('pages.qms_eight_d_detail_page.d5_4'),
      field: 'd5Content',
      done: 'd5PermanentActionSelected',
    },
    {
      id: 'd6',
      label: i18n.t('pages.qms_eight_d_detail_page.d6_5'),
      field: 'd6Content',
      done: 'd6ActionVerified',
    },
    {
      id: 'd7',
      label: i18n.t('pages.qms_eight_d_detail_page.d7_6'),
      field: 'd7Content',
      done: 'd7PreventiveImplemented',
    },
    {
      id: 'd8',
      label: i18n.t('pages.qms_eight_d_detail_page.d8_7'),
      field: 'd8Content',
      done: 'd8TeamRecognized',
    },
  ] as const;
}

function getSeverityLabels(): Record<string, string> {
  return {
    critical: i18n.t('qms.qms_eight_d_detail_page.k0'),
    major: i18n.t('qms.qms_eight_d_detail_page.k1'),
    minor: i18n.t('qms.qms_eight_d_detail_page.k2'),
  };
}

export default function QmsEightDDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<EightDReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    eightDApi
      .getEightDReport(id)
      .then((res) => {
        if (!cancelled) {
          setReport(res.data ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load 8D report');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18n.t('common.loading')}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='error'>{error}</Alert>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate(QMS_PATHS.eightd)}
            >
              {i18n.t('pages.qms_eight_d_detail_page.8d_0')}
            </Button>
          }
        >
          {i18n.t('qms.qms_eight_d_detail_page.8d_3')}
        </Alert>
      </Box>
    );
  }

  const infoFields = [
    { label: i18n.t('qms.qms_eight_d_detail_page.k5'), value: `D${report.currentStage}` },
    {
      label: i18n.t('qms.qms_eight_d_detail_page.k6'),
      value: getSeverityLabels()[report.severity] ?? report.severity,
    },
    { label: i18n.t('qms.qms_eight_d_detail_page.k7'), value: report.teamLeader ?? '-' },
    { label: i18n.t('qms.qms_eight_d_detail_page.k8'), value: report.customer ?? '-' },
    { label: i18n.t('qms.qms_eight_d_detail_page.k9'), value: report.productName ?? '-' },
    { label: i18n.t('qms.qms_eight_d_detail_page.k10'), value: report.source ?? '-' },
    {
      label: i18n.t('qms.qms_eight_d_detail_page.k11'),
      value: report.dueDate ? new Date(report.dueDate).toLocaleDateString('zh-CN') : '-',
    },
    {
      label: i18n.t('qms.qms_eight_d_detail_page.k12'),
      value: report.closedAt ? new Date(report.closedAt).toLocaleString('zh-CN') : '-',
    },
  ];

  const sections = [
    {
      id: 'summary',
      content: (
        <Grid
          container
          spacing={2}
        >
          {infoFields.map((field) => (
            <Grid
              size={{ xs: 12, md: 6, lg: 3 }}
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
      id: 'description',
      title: i18n.t('qms.qms_eight_d_detail_page.k13'),
      content: (
        <Typography
          variant='body2'
          sx={{ lineHeight: 1.75 }}
        >
          {report.problemDescription}
        </Typography>
      ),
    },
    {
      id: 'steps',
      title: i18n.t('qms:qms_eight_d_detail_page.8d_2'),
      content: (
        <Box
          component='ol'
          sx={{
            position: 'relative',
            listStyle: 'none',
            p: 0,
            m: 0,
            pl: 4,
            borderLeft: 2,
            borderColor: designTokens.colors.primary[200],
          }}
        >
          {getSteps().map((step, idx) => {
            const isDone = report[step.done as keyof typeof report] as boolean;
            const content = report[step.field as keyof typeof report] as string | undefined;
            const isCurrent = report.currentStage === idx + 1;
            const stepColor = isDone
              ? designTokens.colors.success.main
              : isCurrent
                ? designTokens.colors.primary.main
                : designTokens.colors.grey[300];
            return (
              <Box
                component='li'
                key={step.id}
                sx={{ position: 'relative', mb: 3, '&:last-child': { mb: 0 } }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: -39,
                    top: 0,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: stepColor,
                    color: designTokens.colors.common.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </Box>
                <Paper
                  variant='outlined'
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    borderColor: isCurrent ? designTokens.colors.primary.main : undefined,
                    bgcolor: isCurrent ? designTokens.colors.primary[50] : undefined,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: content ? 1 : 0,
                    }}
                  >
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {step.label}
                    </Typography>
                    <Chip
                      size='small'
                      label={
                        isDone
                          ? i18n.t('qms.qms_eight_d_detail_page.k16')
                          : isCurrent
                            ? i18n.t('qms.qms_eight_d_detail_page.k15')
                            : i18n.t('qms.qms_eight_d_detail_page.k14')
                      }
                      sx={{
                        bgcolor: isDone
                          ? designTokens.colors.success[100]
                          : isCurrent
                            ? designTokens.colors.primary[100]
                            : designTokens.colors.grey[100],
                        color: isDone
                          ? designTokens.colors.success[700]
                          : isCurrent
                            ? designTokens.colors.primary[700]
                            : designTokens.colors.grey[500],
                      }}
                    />
                  </Box>
                  {content && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {content}
                    </Typography>
                  )}
                </Paper>
              </Box>
            );
          })}
        </Box>
      ),
    },
    {
      id: 'audit',
      title: i18n.t('qms.qms_eight_d_detail_page.k17'),
      content: (
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
              [{report.createdAt ? new Date(report.createdAt).toLocaleString('zh-CN') : '-'}]
            </Typography>
            <Typography variant='body2'>{i18n.t('qms.qms_eight_d_detail_page.8dd1_18')}</Typography>
          </Box>
          {report.currentStage >= 4 && (
            <Box
              component='li'
              sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('qms:qms_eight_d_detail_page.k1')}
              </Typography>
              <Typography variant='body2'>{i18n.t('qms.qms_eight_d_detail_page.d4_19')}</Typography>
            </Box>
          )}
          {report.closedAt && (
            <Box
              component='li'
              sx={{ display: 'flex', gap: 1.5 }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                [{new Date(report.closedAt).toLocaleString('zh-CN')}]
              </Typography>
              <Typography variant='body2'>{i18n.t('qms:qms_eight_d_detail_page.8d_0')}</Typography>
            </Box>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DetailPageTemplate
      title={report.reportNo}
      subtitle={report.title}
      detailItemName={report.reportNo}
      onBack={() => navigate(QMS_PATHS.eightd)}
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StatusBadge
            fsm='eight_d'
            status={report.status}
          />
          <FSMActionButtons
            fsm='eight_d'
            currentStatus={report.status}
            onAction={handleAction}
          />
        </Box>
      }
      sections={sections}
    />
  );
}
