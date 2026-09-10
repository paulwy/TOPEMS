/**
 * 审核计划详情页
 *
 * 包含：基本信息 + 审核任务列表 + 发现项列表
 * 使用 StatusBadge + FSMActionButtons 组件。
 * 数据来自真实 API。
 */
import { useEffect, useMemo, useState } from 'react';
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
import { auditApi } from '@/api/qms/audit';
import type { AuditPlan } from '@/api/qms/types';
import { StatusBadge } from '@/components/qms/StatusBadge';
import { FSMActionButtons } from '@/components/qms/FSMActionButtons';
import { QMS_PATHS } from '@/modules/qms/config';
import {
  DetailPageTemplate,
  type TabConfig,
  type DetailField,
} from '@/components/templates/DetailPageTemplate';
import i18n from '@/i18n';

function formatDate(date?: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
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

export default function QmsAuditPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<AuditPlan | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
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

    // 先并行获取 plan 和 tasks
    Promise.all([
      auditApi.getAuditPlan(id),
      auditApi.listAuditTasks(id),
    ])
      .then(([planRes, tasksRes]) => {
        if (cancelled) return;
        const taskList = tasksRes.data ?? [];
        setPlan(planRes.data ?? null);
        setTasks(taskList);

        // 根据 tasks 的 id 获取所有 findings
        if (taskList.length > 0) {
          return Promise.all(
            taskList.map((task) => auditApi.listAuditFindings(task.id))
          );
        }
        return [];
      })
      .then((findingsResults) => {
        if (cancelled) return;
        const allFindings = (findingsResults ?? []).flatMap((res) => res.data ?? []);
        setFindings(allFindings);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Failed to load audit plan');
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

  const handleBack = () => {
    navigate(QMS_PATHS.auditManagement);
  };

  const tabs = useMemo<TabConfig[]>(() => {
    if (!plan) return [];
    const basicInfoFields: DetailField[] = [
      { label: i18n.t('qms.qms_audit_plan_detail_page.k5'), value: plan.plan_no },
      { label: i18n.t('qms.qms_audit_plan_detail_page.k6'), value: plan.audit_type },
      { label: i18n.t('qms.qms_audit_plan_detail_page.k7'), value: plan.auditor },
      { label: i18n.t('qms.qms_audit_plan_detail_page.k8'), value: plan.scope ?? '-' },
      {
        label: i18n.t('qms.qms_audit_plan_detail_page.k9'),
        value: plan.departments.join('、') || '-',
      },
      {
        label: i18n.t('qms.qms_audit_plan_detail_page.k10'),
        value: plan.auditors.join('、') || '-',
      },
      { label: i18n.t('qms.qms_audit_plan_detail_page.k11'), value: formatDate(plan.start_date) },
      { label: i18n.t('qms.qms_audit_plan_detail_page.k12'), value: formatDate(plan.end_date) },
    ];

    return [
      {
        id: 'info',
        label: i18n.t('qms.qms_audit_plan_detail_page.k0'),
        content: (
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
            <Grid size={{ xs: 12 }}>
              <Paper
                variant='outlined'
                sx={{ p: 3 }}
              >
                <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {i18n.t('qms.qms_audit_plan_detail_page.k13')}
                </InputLabel>
                <Typography sx={{ mt: 1, lineHeight: 1.6 }}>{plan.description ?? '-'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        ),
      },
      {
        id: 'tasks',
        label: i18n.t('qms.qms_audit_plan_detail_page.k1'),
        badge: tasks.length,
        content: (
          <Box>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('qms.qms_audit_plan_detail_page.k14')}
            </Typography>
            {tasks.length === 0 ? (
              <Typography color='text.secondary'>
                {i18n.t('qms.qms_audit_plan_detail_page.k15')}
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k16')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k17')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k18')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k19')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k20')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k21')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell sx={{ fontWeight: 'medium' }}>{t.task_no}</TableCell>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.assignee}</TableCell>
                        <TableCell>{t.priority}</TableCell>
                        <TableCell>{t.findings_count}</TableCell>
                        <TableCell>{t.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ),
      },
      {
        id: 'findings',
        label: i18n.t('qms.qms_audit_plan_detail_page.k2'),
        badge: findings.length,
        content: (
          <Box>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('qms.qms_audit_plan_detail_page.k22')}
            </Typography>
            {findings.length === 0 ? (
              <Typography color='text.secondary'>
                {i18n.t('qms.qms_audit_plan_detail_page.k23')}
              </Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k24')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k25')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k26')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k27')}</TableCell>
                      <TableCell>{i18n.t('qms.qms_audit_plan_detail_page.k28')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {findings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell sx={{ fontWeight: 'medium' }}>{f.finding_no}</TableCell>
                        <TableCell>{f.title}</TableCell>
                        <TableCell>{f.severity}</TableCell>
                        <TableCell>{f.category}</TableCell>
                        <TableCell>{f.status}</TableCell>
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
  }, [findings, plan, tasks]);

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

  if (!plan) {
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
              {i18n.t('pages.qms_audit_plan_detail_page.k0')}
            </Button>
          }
        >
          {i18n.t('qms.qms_audit_plan_detail_page.k3')}
        </Alert>
      </Box>
    );
  }

  return (
    <DetailPageTemplate
      title={plan.plan_no}
      subtitle={plan.title}
      onBack={handleBack}
      tabs={tabs}
      headerContent={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <StatusBadge
            fsm='audit_plan'
            status={plan.status}
          />
          <FSMActionButtons
            fsm='audit_plan'
            currentStatus={plan.status}
            onAction={handleAction}
          />
        </Box>
      }
    />
  );
}
