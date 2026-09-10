/**
 * APQP 项目详情页
 *
 * 包含：5 阶段进度 + 任务列表 + 风险登记 + 审批记录
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自 useQmsMock。
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  LinearProgress,
} from '@mui/material';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { apqpApi } from '@/api/qms/apqp';
import type { ApqpProject } from '@/api/qms/types';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import { designTokens } from '@topems/tokens';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';
import i18n from '@/i18n';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Paper
      variant='outlined'
      sx={{ p: 2, borderRadius: 2 }}
    >
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant='body2'
        sx={{ mt: 0.5, fontWeight: 500 }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

export default function QmsApqpProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ApqpProject | null>(null);
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

    apqpApi
      .getApqpProject(id)
      .then((res) => {
        if (!cancelled) {
          setProject(res.data ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load APQP project');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 关联数据待后续对接 API，暂时使用空数组
  const phases: any[] = [];
  const tasks: any[] = [];
  const risks: any[] = [];
  const approvals: any[] = [];

  const radarData = useMemo(
    () =>
      phases.map((p) => ({
        phase: p.phase_name,
        progress: p.progress ?? 0,
      })),
    [phases]
  );

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

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity='info'
          action={
            <Button
              color='inherit'
              size='small'
              onClick={() => navigate(QMS_PATHS.apqp)}
            >
              {i18n.t('pages.qms_apqp_project_detail_page.apqp_0')}
            </Button>
          }
        >
          {i18n.t('qms.qms_apqp_project_detail_page.apqp_4')}
        </Alert>
      </Box>
    );
  }

  const handleAction = (targetStatus: string, requiresApproval: boolean) => {
    void targetStatus;
    void requiresApproval;
  };

  const infoFields = [
    { label: i18n.t('qms.qms_apqp_project_detail_page.k6'), value: project.project_no },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k7'), value: project.product_name ?? '-' },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k8'), value: project.customer ?? '-' },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k9'), value: project.leader ?? '-' },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k10'), value: project.current_phase ?? '-' },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k11'), value: `${project.progress ?? 0}%` },
    { label: i18n.t('qms.qms_apqp_project_detail_page.k12'), value: project.risklevel ?? '-' },
    {
      label: i18n.t('qms.qms_apqp_project_detail_page.k13'),
      value: project.target_date ? new Date(project.target_date).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const tabs = [
    {
      id: 'phases',
      label: i18n.t('qms.qms_apqp_project_detail_page.k0'),
      content: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid
            container
            spacing={2}
          >
            {infoFields.map((field) => (
              <Grid
                size={{ xs: 12, md: 6, lg: 3 }}
                key={field.label}
              >
                <Field
                  label={field.label}
                  value={field.value}
                />
              </Grid>
            ))}
          </Grid>

          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  {i18n.t('qms.qms_apqp_project_detail_page.k14')}
                </Typography>
                <ResponsiveContainer
                  width='100%'
                  height={280}
                >
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey='phase'
                      fontSize={10}
                    />
                    <Radar
                      dataKey='progress'
                      stroke={designTokens.colors.secondary.dark}
                      fill={designTokens.colors.secondary.dark}
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2 }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  {i18n.t('qms.qms_apqp_project_detail_page.k15')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {phases.map((p) => (
                    <Paper
                      key={p.id}
                      variant='outlined'
                      sx={{ p: 2, borderRadius: 2 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography variant='body2'>
                          {p.phase_code} {p.phase_name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {p.status}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={p.progress ?? 0}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {i18n.t('pages.qms_apqp_project_detail_page.k0')}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      id: 'tasks',
      label: i18n.t('qms.qms_apqp_project_detail_page.k1'),
      content: (
        <Paper
          variant='outlined'
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('qms.qms_apqp_project_detail_page.k16')}
          </Typography>
          {tasks.length === 0 ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('qms.qms_apqp_project_detail_page.k17')}
            </Typography>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k18')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k19')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k20')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k21')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k22')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{t.task_name}</TableCell>
                    <TableCell>{t.deliverable ?? '-'}</TableCell>
                    <TableCell>{t.assignee ?? '-'}</TableCell>
                    <TableCell>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>{t.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      ),
    },
    {
      id: 'risks',
      label: i18n.t('qms.qms_apqp_project_detail_page.k2'),
      content: (
        <Paper
          variant='outlined'
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('qms.qms_apqp_project_detail_page.k23')}
          </Typography>
          {risks.length === 0 ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('qms.qms_apqp_project_detail_page.k24')}
            </Typography>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k25')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k26')}</TableCell>
                  <TableCell>S</TableCell>
                  <TableCell>O</TableCell>
                  <TableCell>D</TableCell>
                  <TableCell>RPN</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k27')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {risks.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{r.risk_name}</TableCell>
                    <TableCell>{r.risk_category ?? '-'}</TableCell>
                    <TableCell>{r.severity ?? '-'}</TableCell>
                    <TableCell>{r.occurrence ?? '-'}</TableCell>
                    <TableCell>{r.detection ?? '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{r.rpn ?? '-'}</TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      ),
    },
    {
      id: 'approvals',
      label: i18n.t('qms.qms_apqp_project_detail_page.k3'),
      content: (
        <Paper
          variant='outlined'
          sx={{ p: 2, borderRadius: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('qms.qms_apqp_project_detail_page.k28')}
          </Typography>
          {approvals.length === 0 ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('qms.qms_apqp_project_detail_page.k29')}
            </Typography>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k30')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k31')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k32')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k33')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k34')}</TableCell>
                  <TableCell>{i18n.t('qms.qms_apqp_project_detail_page.k35')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{a.approval_type}</TableCell>
                    <TableCell>{a.applicant ?? '-'}</TableCell>
                    <TableCell>{a.approver ?? '-'}</TableCell>
                    <TableCell>
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      {a.approved_at ? new Date(a.approved_at).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>{a.status ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      ),
    },
  ];

  return (
    <DetailPageTemplate
      title={project.project_no}
      subtitle={project.project_name}
      detailItemName={project.project_no}
      onBack={() => navigate(QMS_PATHS.apqp)}
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StatusBadge
            fsm='apqp'
            status={project.status ?? 'planning'}
          />
          <FSMActionButtons
            fsm='apqp'
            currentStatus={project.status ?? 'planning'}
            onAction={handleAction}
          />
        </Box>
      }
      tabs={tabs}
      defaultTab='phases'
    />
  );
}
